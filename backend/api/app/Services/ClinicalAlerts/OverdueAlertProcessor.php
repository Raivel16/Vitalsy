<?php

namespace App\Services\ClinicalAlerts;

use App\Models\AlertEscalation;
use App\Models\ClinicalAlert;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

/**
 * RF-45, RF-48, RF-53 y cumplimiento RF-42/RF-32: escalamientos y apertura
 * de alertas por controles/dosis vencidos.
 */
class OverdueAlertProcessor
{
    private const SUPERVISOR_ROLE = 'enfermera_supervisora';

    private const RRT_ROLE = 'equipo_respuesta_rapida';

    private const DOCTOR_ROLE = 'medico_residente';

    public function __construct(private readonly AlertRecorder $recorder) {}

    /** @return array{nurse: int, followUp: int, medical: int, controls: int, doses: int} */
    public function process(): array
    {
        $compliance = app(ComplianceAlertService::class)->openDueTasks();

        $nurse = $this->escalateUnacknowledgedByNurse() + $this->escalateUnacknowledgedBySupervisor();

        return [
            'nurse' => $nurse,
            'followUp' => $this->flagOverdueFollowUps(),
            'medical' => $this->escalateUnattendedMedical(),
            'controls' => $compliance['controls'],
            'doses' => $compliance['doses'],
        ];
    }

    private function escalateUnacknowledgedByNurse(): int
    {
        $count = 0;
        foreach ($this->dueAlerts(ClinicalAlert::STATUS_OPEN, 'acknowledge_due_at') as $alert) {
            $this->escalate(
                $alert,
                self::SUPERVISOR_ROLE,
                'La enfermera de piso no confirmó la alerta en el tiempo establecido.',
                ClinicalAlert::STATUS_SUPERVISOR,
                now()->addMinutes($this->minutes('supervisor_ack_minutes')),
            );
            $count++;
        }

        return $count;
    }

    private function escalateUnacknowledgedBySupervisor(): int
    {
        $count = 0;
        foreach ($this->dueAlerts(ClinicalAlert::STATUS_SUPERVISOR, 'acknowledge_due_at') as $alert) {
            $alert->update([
                'status' => ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
                'assigned_role' => self::DOCTOR_ROLE,
                'acknowledge_due_at' => null,
                'follow_up_due_at' => null,
                'medical_notified_at' => now(),
                'medical_due_at' => now()->addMinutes($this->minutes('medical_response_minutes')),
            ]);
            $this->registerEscalation($alert, self::DOCTOR_ROLE, 'La supervisora no atendió el escalamiento en el tiempo establecido.');
            $count++;
        }

        return $count;
    }

    private function flagOverdueFollowUps(): int
    {
        $count = 0;
        foreach ($this->dueAlerts(ClinicalAlert::STATUS_IN_PROGRESS, 'follow_up_due_at') as $alert) {
            if ($this->alreadyRecordedFollowUpOverdue($alert)) {
                continue;
            }

            $reason = 'Tras confirmar la lectura no se completó la reevaluación y disposición en 15 minutos.';
            $this->recorder->record($alert, 'seguimiento_vencido', $reason, null);
            $this->registerEscalation($alert, self::SUPERVISOR_ROLE, $reason);
            $count++;
        }

        return $count;
    }

    private function escalateUnattendedMedical(): int
    {
        $count = 0;
        foreach ($this->dueAlerts(ClinicalAlert::STATUS_DOCTOR_NOTIFIED, 'medical_due_at') as $alert) {
            $reason = 'El médico de guardia no registró atención en los 15 minutos establecidos.';
            $this->registerEscalation($alert, self::SUPERVISOR_ROLE, $reason);
            $alert->update([
                'status' => ClinicalAlert::STATUS_RRT_ESCALATED,
                'assigned_role' => self::RRT_ROLE,
                'medical_due_at' => null,
            ]);
            $this->registerEscalation($alert, self::RRT_ROLE, $reason);
            $this->recorder->record($alert, 'escalamiento', $reason, null);
            $count++;
        }

        return $count;
    }

    /** @return Collection<int, ClinicalAlert> */
    private function dueAlerts(string $status, string $dueColumn): Collection
    {
        return ClinicalAlert::query()
            ->where('status', $status)
            ->whereNotNull($dueColumn)
            ->where($dueColumn, '<=', now())
            ->get();
    }

    private function alreadyRecordedFollowUpOverdue(ClinicalAlert $alert): bool
    {
        $lastAckAt = $alert->acknowledgements()
            ->orderByDesc('acknowledged_at')
            ->value('acknowledged_at');

        $query = $alert->events()->where('type', 'seguimiento_vencido');
        if ($lastAckAt) {
            $query->where('occurred_at', '>=', $lastAckAt);
        }

        return $query->exists();
    }

    private function escalate(ClinicalAlert $alert, string $toRole, string $reason, string $status, ?Carbon $ackDueAt): void
    {
        $alert->update([
            'status' => $status,
            'assigned_role' => $toRole,
            'assigned_user_id' => null,
            'acknowledge_due_at' => $ackDueAt,
            'follow_up_due_at' => null,
        ]);

        $this->registerEscalation($alert, $toRole, $reason);
        $this->recorder->record($alert, 'escalamiento', $reason, null);
    }

    private function registerEscalation(ClinicalAlert $alert, string $toRole, string $reason): void
    {
        AlertEscalation::query()->create([
            'alert_id' => $alert->id,
            'to_role' => $toRole,
            'reason' => $reason,
            'escalated_at' => now(),
        ]);
    }

    private function minutes(string $key): int
    {
        return (int) config("vitalsy.alerts.{$key}");
    }
}
