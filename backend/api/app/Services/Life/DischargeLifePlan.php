<?php

namespace App\Services\Life;

use App\Exceptions\ClinicalRuleException;
use App\Models\AmbulatoryPrescription;
use App\Models\DischargeOrder;
use App\Models\LifeDischargePlan;
use App\Models\NursingDischargeReport;
use App\Models\PharmaDischargeReconciliation;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/** Emite el plan de seguimiento estructurado que la app Vitalsy Life reclama con un código (RF-96). */
class DischargeLifePlan
{
    public const MODES = ['usuario', 'invitacion', 'rechaza'];

    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    /** «rechaza» se registra como decisión (sin códigos ni payload) para que sobreviva a la recarga. */
    public function issue(string $encounterId, string $mode, User $by): LifeDischargePlan
    {
        if (! in_array($mode, self::MODES, true)) {
            throw new ClinicalRuleException('Modalidad de plan Vitalsy Life no válida.');
        }

        $source = $this->source($encounterId);
        if ($mode !== 'rechaza' && $source['medications'] === []) {
            throw new ClinicalRuleException('La receta no tiene medicamentos con nombre y dosis; complete la receta antes de emitir el plan.');
        }

        try {
            return $this->persist($encounterId, $mode, $by, $source);
        } catch (UniqueConstraintViolationException) {
            // Emisión simultánea del primer plan: reintenta leyendo la fila ya creada.
            return $this->persist($encounterId, $mode, $by, $source);
        }
    }

    /** @param array<string, mixed> $source */
    private function persist(string $encounterId, string $mode, User $by, array $source): LifeDischargePlan
    {
        return DB::transaction(function () use ($encounterId, $mode, $by, $source) {
            $plan = LifeDischargePlan::query()->where('encounter_id', $encounterId)->lockForUpdate()->first();
            if ($plan?->custody_transferred_at) {
                throw new ClinicalRuleException('El paciente ya egresó; el plan no puede reemitirse.');
            }
            if ($plan && $plan->status === 'reclamado') {
                throw new ClinicalRuleException('El plan ya fue reclamado por el ciudadano y no puede reemitirse.');
            }

            $validUntil = now()->addDays(30)->toDateString();
            if ($mode === 'rechaza') {
                // Decisión registrada sin códigos: cualquier código previo deja de ser reclamable.
                $attributes = [
                    'mode' => $mode, 'code' => null, 'invitation_code' => null, 'payload' => [],
                    'valid_until' => $validUntil, 'status' => 'rechazado', 'created_by' => $by->id,
                ];
            } else {
                $code = $plan?->code ?? $this->newCode('VLA', 'code');
                // Al pasar de invitación a usuario la invitación emitida se invalida.
                $invitation = null;
                if ($mode === 'invitacion') {
                    $invitation = $plan?->invitation_code ?? $this->newCode('VLI', 'invitation_code');
                }
                $attributes = [
                    'mode' => $mode,
                    'code' => $code,
                    'invitation_code' => $invitation,
                    'payload' => ['id' => $code] + $source + ['validUntil' => $validUntil],
                    'valid_until' => $validUntil,
                    'status' => 'pendiente',
                    'created_by' => $by->id,
                ];
            }

            if ($plan) {
                $plan->update($attributes);
            } else {
                $plan = LifeDischargePlan::query()->create($attributes + ['encounter_id' => $encounterId]);
            }

            return $plan->refresh();
        });
    }

    /** @return array<string, mixed>|null */
    public function present(?LifeDischargePlan $plan, bool $withSecrets = true): ?array
    {
        if (! $plan) {
            return null;
        }

        return match (true) {
            $plan->mode === 'rechaza' => ['mode' => 'rechaza', 'status' => $plan->status],
            ! $withSecrets => [
                'mode' => $plan->mode,
                'status' => $plan->status,
                'validUntil' => $plan->valid_until?->toDateString(),
            ],
            default => [
                'mode' => $plan->mode,
                'code' => $plan->code,
                'invitationCode' => $plan->invitation_code,
                'payload' => $plan->payload,
                'status' => $plan->status,
            ],
        };
    }

    /** @return array{medications: array<int, array<string, string>>, comfortSigns: array<int, string>, homeCare: array<int, string>} */
    private function source(string $encounterId): array
    {
        if (! DischargeOrder::query()->where('encounter_id', $encounterId)->exists()) {
            throw new ClinicalRuleException('Registre primero la orden digital de alta.');
        }
        $prescription = AmbulatoryPrescription::query()->where('encounter_id', $encounterId)->first();
        if (! $prescription || empty($prescription->content['items'] ?? [])) {
            throw new ClinicalRuleException('Registre primero la receta ambulatoria de alta.');
        }
        if (! PharmaDischargeReconciliation::query()->where('encounter_id', $encounterId)->exists()) {
            throw new ClinicalRuleException('Registre primero la conciliación farmacéutica al alta.');
        }
        $nursing = NursingDischargeReport::query()->where('encounter_id', $encounterId)->first();
        if (! $nursing) {
            throw new ClinicalRuleException('Genere primero el informe digital de alta de enfermería.');
        }

        $medications = collect($prescription->content['items'])
            ->map(fn (array $item) => [
                'name' => trim((string) ($item['drug'] ?? $item['name'] ?? '')),
                'dose' => trim((string) ($item['dose'] ?? '')),
                'schedule' => $this->schedule((string) ($item['frequency'] ?? '')),
            ])
            ->filter(fn (array $m) => $m['name'] !== '' && $m['dose'] !== '')
            ->values()
            ->all();

        return [
            'medications' => $medications,
            'comfortSigns' => $this->lines((string) $nursing->alarm_signs),
            'homeCare' => array_values(array_filter(
                $this->lines((string) $nursing->home_care),
                fn (string $line) => ! str_starts_with($line, 'Vitalsy Life:'),
            )),
        ];
    }

    /** Hora explícita HH:mm si la frecuencia la trae; si no, 08:00. */
    private function schedule(string $frequency): string
    {
        if (preg_match('/\b([01]?\d|2[0-3]):([0-5]\d)\b/', $frequency, $m)) {
            return sprintf('%02d:%s', (int) $m[1], $m[2]);
        }

        return '08:00';
    }

    /** @return array<int, string> */
    private function lines(string $text): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/\R/', $text) ?: []), fn (string $l) => $l !== ''));
    }

    private function newCode(string $prefix, string $column): string
    {
        do {
            $suffix = '';
            for ($i = 0; $i < 8; $i++) {
                $suffix .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
            $code = "{$prefix}-{$suffix}";
        } while (LifeDischargePlan::query()->where($column, $code)->exists());

        return $code;
    }
}
