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

    private const ORIGINS = ['health_connect', 'health_kit', 'manual'];

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
        // antes de almacenar nada (todo-o-nada a nivel de petición).
        $decodedBodies = [];
        $total = 0;
        foreach ($items as $index => $item) {
            if (($item['kind'] ?? null) !== 'biometrics') {
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

        foreach ($items as $index => $item) {
            $id = $item['id'] ?? null;
            $kind = $item['kind'] ?? null;

            if (! is_string($id) || $id === '' || strlen($id) > 64) {
                $rejected[] = ['id' => (string) $index, 'reason' => 'Identificador de ítem inválido (1 a 64 caracteres).'];

                continue;
            }

            if ($kind === 'consent' || $kind === 'plan') {
                // Sin efecto clínico: el consentimiento real se gestiona con PUT /life/consent.
                $accepted[] = $id;

                continue;
            }

            if ($kind !== 'biometrics') {
                $rejected[] = ['id' => $id, 'reason' => 'Tipo de ítem no soportado.'];

                continue;
            }

            $samples = $this->parseSamples($decodedBodies[$index]);
            if (is_string($samples)) {
                $rejected[] = ['id' => $id, 'reason' => $samples];

                continue;
            }

            $this->store($account, $samples);
            $accepted[] = $id;
        }

        return ['accepted' => $accepted, 'rejected' => $rejected];
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
        if (count($decoded) > self::MAX_SAMPLES_PER_ITEM) {
            return 'El ítem contiene demasiadas muestras.';
        }

        return $decoded;
    }

    /**
     * Devuelve las muestras normalizadas o un motivo de rechazo (todo-o-nada por ítem).
     *
     * @param  list<mixed>|string  $decoded
     * @return list<array<string, mixed>>|string
     */
    private function parseSamples(array|string $decoded): array|string
    {
        if (is_string($decoded)) {
            return $decoded;
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
        $clientId = $raw['id'] ?? null;
        $kind = $raw['kind'] ?? null;
        $value = $raw['value'] ?? null;
        $unit = $raw['unit'] ?? null;
        $origin = $raw['origin'] ?? null;

        if (! is_string($clientId) || $clientId === '' || strlen($clientId) > 64) {
            return 'Identificador de muestra inválido.';
        }
        if (! is_string($kind) || ! isset(self::RANGES[$kind])) {
            return 'Tipo de muestra no soportado.';
        }
        if (! is_int($value) && ! is_float($value)) {
            return 'El valor de la muestra debe ser numérico.';
        }
        [$min, $max] = self::RANGES[$kind];
        if ($value < $min || $value > $max) {
            return "Valor fuera de rango para {$kind}.";
        }
        if (! is_string($unit) || $unit === '' || strlen($unit) > 16) {
            return 'Unidad inválida.';
        }
        if (! is_string($origin) || ! in_array($origin, self::ORIGINS, true)) {
            return 'Origen de la muestra inválido.';
        }

        $start = $this->parseDate($raw['startedAt'] ?? null);
        $end = $this->parseDate($raw['endedAt'] ?? null);
        if ($start === null || $end === null || $end->lt($start)) {
            return 'Fechas de la muestra inválidas.';
        }
        if ($start->gt(now()->addMinutes(self::FUTURE_TOLERANCE_MINUTES))) {
            return 'La muestra tiene una fecha futura.';
        }

        return [
            'client_id' => $clientId, 'kind' => $kind, 'value' => $value, 'unit' => $unit,
            'started_at' => $start, 'ended_at' => $end, 'origin' => $origin,
        ];
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || $value === '') {
            return null;
        }
        // Solo ISO-8601 con fecha y hora; se rechazan textos relativos como "now".
        $iso = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/';
        if (preg_match($iso, $value) !== 1) {
            return null;
        }
        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
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
