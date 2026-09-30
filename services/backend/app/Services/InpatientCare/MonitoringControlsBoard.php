<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\MonitoringSchedule;
use App\Models\User;
use App\Services\ClinicalAlerts\AlertRecorder;
use App\Services\Staff\StaffRoster;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * RF-42: bandeja de controles de constantes programados y registro de cumplimiento.
 */
class MonitoringControlsBoard
{
    public function __construct(
        private readonly VitalSignsMonitoring $vitals,
        private readonly AlertRecorder $recorder,
        private readonly StaffRoster $roster,
    ) {}

    /**
     * @return array{controls: list<array<string, mixed>>}
     */
    public function board(?User $viewer = null): array
    {
        $from = now()->subDay();
        $to = now()->addDay();

        $rows = MonitoringSchedule::query()
            ->where(function ($query) use ($from, $to) {
                $query->whereBetween('next_due_at', [$from, $to])
                    ->orWhere('next_due_at', '<=', now());
            })
            ->orderBy('next_due_at')
            ->limit(100)
            ->get();

        $controls = [];
        foreach ($rows as $schedule) {
            $encounter = AdmissionEncounter::query()
                ->where('encounter_id', $schedule->encounter_id)
                ->first();
            if (! $encounter) {
                continue;
            }

            $assignedNurseId = $this->roster->assignedNurseId($schedule->encounter_id);
            if ($viewer
                && $viewer->role === 'enfermera_piso'
                && $assignedNurseId
                && $assignedNurseId !== $viewer->id) {
                // Otras enfermeras ven solo sus asignados; si no hay asignación, lo ven todas.
                continue;
            }

            $dueAt = $schedule->next_due_at;
            $controls[] = [
                'encounterId' => $schedule->encounter_id,
                'patientName' => $encounter->patient_name,
                'location' => $this->location($encounter),
                'nextDueAt' => optional($dueAt)?->toIso8601String(),
                'frequencyMinutes' => $schedule->frequency_minutes,
                'overdue' => $dueAt !== null && $dueAt->lte(now()),
                'assignedNurseId' => $assignedNurseId,
            ];
        }

        usort($controls, function (array $a, array $b) {
            return strcmp((string) $a['nextDueAt'], (string) $b['nextDueAt']);
        });

        return ['controls' => $controls];
    }

    /**
     * Registra la toma de constantes del control y reprograma el siguiente.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function complete(string $encounterId, array $input, User $user): array
    {
        $this->requireEncounter($encounterId);

        $prior = MonitoringSchedule::query()->where('encounter_id', $encounterId)->first();
        $frequency = $prior?->frequency_minutes
            ?? ((int) config('vitalsy.alerts.routine_control_hours') * 60);

        $reading = $this->vitals->storeManual($encounterId, $input, $user, activateAlerts: true);

        $news2Total = (int) ($reading['reading']['news2']['total'] ?? 0);
        $nextControlAt = $reading['nextControlAt'] ?? null;

        // Mantener la frecuencia del plan de control aunque el store rutinario
        // haya aplicado el intervalo por defecto de 12 h.
        if ($news2Total === 0) {
            $next = now()->addMinutes($frequency);
            MonitoringSchedule::query()->updateOrCreate(
                ['encounter_id' => $encounterId],
                [
                    'next_due_at' => $next,
                    'frequency_minutes' => $frequency,
                    'created_by' => $user->id,
                ],
            );
            $nextControlAt = $next->toIso8601String();
        }

        $this->closeComplianceAlert('control:'.$encounterId, 'Control de constantes registrado.', $user);

        return [
            'reading' => $reading['reading'],
            'alertActivated' => $reading['alertActivated'] ?? false,
            'nextControlAt' => $nextControlAt,
        ];
    }

    public function closeComplianceAlert(string $complianceKey, string $note, ?User $user): void
    {
        $alerts = ClinicalAlert::query()
            ->where('compliance_key', $complianceKey)
            ->where('status', '!=', ClinicalAlert::STATUS_CLOSED)
            ->get();

        foreach ($alerts as $alert) {
            $alert->update([
                'status' => ClinicalAlert::STATUS_CLOSED,
                'assigned_role' => null,
                'acknowledge_due_at' => null,
                'follow_up_due_at' => null,
                'medical_due_at' => null,
                'closed_at' => now(),
                'closure_note' => $note,
            ]);
            $this->recorder->record($alert, 'cierre', $note, $user);
        }
    }

    private function location(AdmissionEncounter $encounter): ?string
    {
        $parts = array_filter([
            $encounter->room ? "Habitación {$encounter->room}" : null,
            $encounter->bed ? "lecho {$encounter->bed}" : null,
        ]);

        return $parts === [] ? null : implode(', ', $parts);
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }
}
