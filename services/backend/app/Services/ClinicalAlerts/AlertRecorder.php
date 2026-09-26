<?php

namespace App\Services\ClinicalAlerts;

use App\Models\AlertEvent;
use App\Models\ClinicalAlert;
use App\Models\User;

/**
 * Apertura y bitácora de alertas. Se mantiene separado de AlertWorkflow para
 * que el monitoreo de constantes (RF-26) pueda abrir una alerta sin depender
 * del flujo completo del proceso 3.
 */
class AlertRecorder
{
    /**
     * RF-34: alerta generada por el monitoreo rutinario y dirigida a la
     * enfermera de piso responsable.
     */
    public function openFromMonitoring(string $encounterId, int $news2Total, ?User $user = null): ClinicalAlert
    {
        $alert = ClinicalAlert::query()->create([
            'encounter_id' => $encounterId,
            'source' => 'news2',
            'severity' => $news2Total >= 7 ? 'alta' : 'media',
            'news2_total' => $news2Total,
            'message' => "NEWS2 {$news2Total}: se activa el proceso de gestión de alertas.",
            'status' => ClinicalAlert::STATUS_OPEN,
            'assigned_role' => 'enfermera_piso',
            'created_by' => $user?->id,
            'generated_at' => now(),
            'acknowledge_due_at' => now()->addMinutes((int) config('vitalsy.alerts.nurse_ack_minutes')),
        ]);

        $this->record($alert, 'generada', $alert->message, $user);

        return $alert;
    }

    public function record(ClinicalAlert $alert, string $type, ?string $detail, ?User $user): void
    {
        AlertEvent::query()->create([
            'alert_id' => $alert->id,
            'type' => $type,
            'role' => $user?->role,
            'user_id' => $user?->id,
            'detail' => $detail,
            'occurred_at' => now(),
        ]);
    }
}
