<?php

namespace App\Services\Life;

use App\Models\LifeAccount;
use App\Models\LifeBiometricSample;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Ingesta idempotente de lotes de sincronización de Vitalsy Life (RF-89, RF-92).
 * Cada ítem se valida de forma independiente: un ítem inválido nunca invalida el lote.
 */
class LifeSync
{
    private const MAX_BODY_CHARS = 200000;

    private const MAX_SAMPLES_PER_ITEM = 500;

    private const MAX_SAMPLES_PER_REQUEST = 2000;

    private const FUTURE_TOLERANCE_MINUTES = 5;

    private const MAX_ID_LENGTH = 64;

    private const KIND_BIOMETRICS = 'biometrics';

    /** `vitalsy_band`: banda propia por Bluetooth LE (RF-113). */
    private const ORIGINS = ['health_connect', 'health_kit', 'manual', 'vitalsy_band'];

    /** Zona horaria final opcional de un ISO-8601 (Z, +hh:mm o +hhmm). */
    private const ISO_TIMEZONE_SUFFIX = '/(Z|[+-]\d{2}:?\d{2})$/';

    /** Solo ISO-8601 con fecha y hora (sin zona): se rechazan textos relativos como "now". */
    private const ISO_DATETIME = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/';

    /**
     * Rangos de plausibilidad por tipo. heart_rate y spo2 reflejan `validateManual` de
     * movil/src/modules/today/domain/today.ts (pulso 30-220, SpO2 50-100); el resto son
     * cotas físicas amplias para descartar basura, no criterios clínicos.
     *
     * @var array<string, array{0: int, 1: int}>
     */
    private const RANGES = [
        'heart_rate' => [30, 220],
        'resting_heart_rate' => [30, 220],
        'spo2' => [50, 100],
        'hrv' => [0, 500],
        'sleep' => [0, 1440],
        'steps' => [0, 200000],
        'skin_temperature' => [25, 45],
        'body_temperature' => [30, 45],
    ];

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array{accepted: list<string>, rejected: list<array{id: string, reason: string}>}
     */
    public function ingest(LifeAccount $account, array $items): array
    {
        $accepted = [];
        $rejected = [];

        // Pasada previa: decodifica cada cuerpo una sola vez y aplica el tope agregado
        // antes de almacenar nada (atómico a nivel de petición).
        $decodedBodies = $this->decodeBodies($items);

        foreach ($items as $index => $item) {
            $id = $item['id'] ?? null;

            if (! $this->isValidId($id)) {
                $rejected[] = ['id' => (string) $index, 'reason' => 'Identificador de ítem inválido (1 a 64 caracteres).'];

                continue;
            }

            $reason = $this->processItem($account, $item['kind'] ?? null, $decodedBodies[$index] ?? null);
            if ($reason === null) {
                $accepted[] = $id;
            } else {
                $rejected[] = ['id' => $id, 'reason' => $reason];
            }
        }

        return ['accepted' => $accepted, 'rejected' => $rejected];
    }

    /**
     * Decodifica los cuerpos de los ítems biométricos y aplica el tope agregado por petición.
     *
     * @param  list<array<string, mixed>>  $items
     * @return array<int|string, list<mixed>|string>
     */
    private function decodeBodies(array $items): array
    {
        $decodedBodies = [];
        $total = 0;
        foreach ($items as $index => $item) {
            if (($item['kind'] ?? null) !== self::KIND_BIOMETRICS) {
                continue;
            }
            $decoded = $this->decodeBody($item['body'] ?? null);
            if (is_array($decoded)) {
                $total += count($decoded);
                if ($total > self::MAX_SAMPLES_PER_REQUEST) {
                    throw new LifeSyncLimitExceeded('El lote excede el máximo de muestras permitido por petición.');
                }
            }
            $decodedBodies[$index] = $decoded;
        }

        return $decodedBodies;
    }

    private function isValidId(mixed $id): bool
    {
        return is_string($id) && $id !== '' && strlen($id) <= self::MAX_ID_LENGTH;
    }

    /**
     * Procesa un ítem con id válido; devuelve el motivo de rechazo o null si fue aceptado.
     *
     * @param  list<mixed>|string|null  $decoded
     */
    private function processItem(LifeAccount $account, mixed $kind, array|string|null $decoded): ?string
    {
        if ($kind === 'consent' || $kind === 'plan') {
            // Sin efecto clínico: el consentimiento real se gestiona con PUT /life/consent.
            return null;
        }

        if ($kind !== self::KIND_BIOMETRICS) {
            return 'Tipo de ítem no soportado.';
        }

        return $this->ingestBiometrics($account, $decoded);
    }

    /** @param  list<mixed>|string|null  $decoded */
    private function ingestBiometrics(LifeAccount $account, array|string|null $decoded): ?string
    {
        $samples = $this->parseSamples($decoded);
        if (is_string($samples)) {
            return $samples;
        }

        $this->store($account, $samples);

        return null;
    }

    /**
     * Decodifica el cuerpo de un ítem; devuelve la lista cruda o un motivo de rechazo.
     *
     * @return list<mixed>|string
     */
    private function decodeBody(mixed $body): array|string
    {
        if (is_string($body) && strlen($body) > self::MAX_BODY_CHARS) {
            return 'El cuerpo del ítem excede el tamaño permitido.';
        }
        $decoded = is_string($body) ? json_decode($body, true) : null;
        if (! is_array($decoded) || ! array_is_list($decoded)) {
            return 'El cuerpo del ítem no es una lista JSON válida.';
        }

        return count($decoded) > self::MAX_SAMPLES_PER_ITEM ? 'El ítem contiene demasiadas muestras.' : $decoded;
    }

    /**
     * Devuelve las muestras normalizadas o un motivo de rechazo (atómico por ítem).
     *
     * @param  list<mixed>|string|null  $decoded
     * @return list<array<string, mixed>>|string
     */
    private function parseSamples(array|string|null $decoded): array|string
    {
        if (! is_array($decoded)) {
            return (string) $decoded;
        }

        $samples = [];
        foreach ($decoded as $raw) {
            $sample = is_array($raw) ? $this->normalize($raw) : 'Muestra inválida.';
            if (is_string($sample)) {
                return $sample;
            }
            $samples[] = $sample;
        }

        return $samples;
    }

    /** @return array<string, mixed>|string */
    private function normalize(array $raw): array|string
    {
        $error = $this->identityError($raw) ?? $this->valueError($raw) ?? $this->metadataError($raw);
        if ($error !== null) {
            return $error;
        }

        $start = $this->parseDate($raw['startedAt'] ?? null);
        $end = $this->parseDate($raw['endedAt'] ?? null);
        $error = $this->dateError($start, $end);
        if ($error !== null) {
            return $error;
        }

        return [
            'client_id' => $raw['id'], 'kind' => $raw['kind'], 'value' => $raw['value'], 'unit' => $raw['unit'],
            'started_at' => $start, 'ended_at' => $end, 'origin' => $raw['origin'],
        ];
    }

    private function identityError(array $raw): ?string
    {
        if (! $this->isValidId($raw['id'] ?? null)) {
            return 'Identificador de muestra inválido.';
        }
        $kind = $raw['kind'] ?? null;
        if (! is_string($kind) || ! isset(self::RANGES[$kind])) {
            return 'Tipo de muestra no soportado.';
        }

        return null;
    }

    /** Se invoca con el tipo ya validado por identityError. */
    private function valueError(array $raw): ?string
    {
        $value = $raw['value'] ?? null;
        if (! is_int($value) && ! is_float($value)) {
            return 'El valor de la muestra debe ser numérico.';
        }
        [$min, $max] = self::RANGES[$raw['kind']];
        if ($value < $min || $value > $max) {
            return "Valor fuera de rango para {$raw['kind']}.";
        }

        return null;
    }

    private function metadataError(array $raw): ?string
    {
        $unit = $raw['unit'] ?? null;
        $origin = $raw['origin'] ?? null;
        if (! is_string($unit) || $unit === '' || strlen($unit) > 16) {
            return 'Unidad inválida.';
        }
        if (! is_string($origin) || ! in_array($origin, self::ORIGINS, true)) {
            return 'Origen de la muestra inválido.';
        }

        return null;
    }

    private function dateError(?Carbon $start, ?Carbon $end): ?string
    {
        if ($start === null || $end === null || $end->lt($start)) {
            return 'Fechas de la muestra inválidas.';
        }
        if ($start->gt(now()->addMinutes(self::FUTURE_TOLERANCE_MINUTES))) {
            return 'La muestra tiene una fecha futura.';
        }

        return null;
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || ! $this->isIsoDateTime($value)) {
            return null;
        }
        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
    }

    private function isIsoDateTime(string $value): bool
    {
        $withoutZone = preg_replace(self::ISO_TIMEZONE_SUFFIX, '', $value);

        return $value !== '' && preg_match(self::ISO_DATETIME, (string) $withoutZone) === 1;
    }

    /** @param  list<array<string, mixed>>  $samples */
    private function store(LifeAccount $account, array $samples): void
    {
        DB::transaction(function () use ($account, $samples): void {
            foreach ($samples as $sample) {
                LifeBiometricSample::query()->firstOrCreate(
                    ['life_account_id' => $account->id, 'client_id' => $sample['client_id']],
                    collect($sample)->except('client_id')->all(),
                );
            }
        });
    }
}
