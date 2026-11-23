<?php

namespace App\Services\ClinicalAlerts;

use App\Models\ClinicalAlert;
use App\Models\MedicationAdministration;
use App\Models\MonitoringSchedule;
use App\Models\PatientExit;
use App\Services\Staff\StaffRoster;

/**
 * RF-42 / RF-32: alertas de cumplimiento de controles y dosis e-MAR vencidas.
 */
class ComplianceAlertService
{
    public function __construct(
        private readonly AlertRecorder $recorder,
        private readonly StaffRoster $roster,
    ) {}

    /**
     * @return array{controls: int, doses: int}
     */
    public function openDueTasks(): array
    {
        return [
            'controls' => $this->openDueControls(),
            'doses' => $this->openDueDoses(),
        ];
    }

    private function openDueControls(): int
    {
        $opened = 0;
        $due = MonitoringSchedule::query()
            ->where('next_due_at', '<=', now())
            ->get();

        foreach ($due as $schedule) {
            // Una sola alerta abierta por ingreso. El scheduler corre seguido
            // y, mientras esta siga abierta, no debe duplicarla.
            $key = 'control:'.$schedule->encounter_id;
            if ($this->hasOpenCompliance($key)) {
                continue;
            }

            $this->open(
                encounterId: $schedule->encounter_id,
                source: 'control',
                complianceKey: $key,
                message: 'Control de constantes vencido. Registre la toma en Controles.',
                severity: 'media',
            );
            $opened++;
        }

        return $opened;
    }

    private function openDueDoses(): int
    {
        $opened = 0;
        // La dosis no alerta en el minuto exacto: espera el margen configurado
        // para que enfermería alcance a administrarla antes de abrir la sirena.
        $grace = (int) config('vitalsy.alerts.emar_grace_minutes', 30);
        $cutoff = now()->subMinutes($grace);

        $doses = MedicationAdministration::query()
            ->with('prescriptionItem')
            ->where('status', 'pendiente')
            ->where('scheduled_at', '<=', $cutoff)
            ->whereNotIn('encounter_id', PatientExit::query()->select('encounter_id'))
            ->limit(100)
            ->get();

        foreach ($doses as $dose) {
            $key = 'emar:'.$dose->id;
            if ($this->hasOpenCompliance($key)) {
                continue;
            }

            $drug = $dose->prescriptionItem?->drug_name ?? 'medicamento';
            $this->open(
                encounterId: $dose->encounter_id,
                source: 'emar',
                complianceKey: $key,
                message: "Dosis pendiente de {$drug}. Administre en e-MAR.",
                severity: 'alta',
            );
            $opened++;
        }

        return $opened;
    }

    private function hasOpenCompliance(string $key): bool
    {
        return ClinicalAlert::query()
            ->where('compliance_key', $key)
            ->where('status', '!=', ClinicalAlert::STATUS_CLOSED)
            ->exists();
    }

    private function open(
        string $encounterId,
        string $source,
        string $complianceKey,
        string $message,
        string $severity,
    ): ClinicalAlert {
        $ackMinutes = (int) config('vitalsy.alerts.compliance_ack_minutes', 15);

        $alert = ClinicalAlert::query()->create([
            'encounter_id' => $encounterId,
            'source' => $source,
            'compliance_key' => $complianceKey,
            'severity' => $severity,
            'news2_total' => null,
            'message' => $message,
            'status' => ClinicalAlert::STATUS_OPEN,
            'assigned_role' => 'enfermera_piso',
            'assigned_user_id' => $this->roster->assignedNurseId($encounterId),
            'generated_at' => now(),
            'acknowledge_due_at' => now()->addMinutes($ackMinutes),
        ]);

        $this->recorder->record($alert, 'generada', $message, null);

        return $alert;
    }
}
