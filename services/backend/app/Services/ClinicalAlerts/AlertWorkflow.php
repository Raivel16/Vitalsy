<?php

namespace App\Services\ClinicalAlerts;

use App\Exceptions\ClinicalRuleException;
use App\Models\AdmissionEncounter;
use App\Models\AlertAcknowledgement;
use App\Models\AlertEscalation;
use App\Models\AlertEvent;
use App\Models\ClinicalAlert;
use App\Models\MonitoringSchedule;
use App\Models\User;
use App\Services\InpatientCare\VitalSignsMonitoring;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Proceso 3: gestión de alertas y respuesta ante alteraciones del estado
 * clínico (RF-34 a RF-47).
 */
class AlertWorkflow
{
    /** Perfiles médicos que reciben la notificación de alta prioridad. */
    private const MEDICAL_ROLES = ['medico_residente', 'medico_tratante'];

    public function __construct(
        private readonly VitalSignsMonitoring $vitals,
        private readonly AlertRecorder $recorder,
    ) {}

    /**
     * RF-35: deterioro observado de forma imprevista por el auxiliar de
     * enfermería; queda asociado al paciente y dirigido a la enfermera.
     *
     * @param  array<string, mixed>  $input
     */
    public function observe(string $encounterId, array $input, ?User $user = null): ClinicalAlert
    {
        $this->requireEncounter($encounterId);
        $severity = $input['severity'] ?? 'media';

        $alert = ClinicalAlert::query()->create([
            'encounter_id' => $encounterId,
            'source' => 'observacion',
            'severity' => $severity,
            'news2_total' => null,
            'message' => $input['note'],
            'status' => ClinicalAlert::STATUS_OPEN,
            'assigned_role' => 'enfermera_piso',
            'created_by' => $user?->id,
            'generated_at' => now(),
            'acknowledge_due_at' => now()->addMinutes($this->minutes('nurse_ack_minutes')),
        ]);

        $this->record($alert, 'observacion', $input['note'], $user);

        return $alert;
    }

    /**
     * RF-39 y RF-42: confirmación de recepción. Detiene el control de tiempo
     * del nivel vigente.
     */
    public function acknowledge(ClinicalAlert $alert, User $user): ClinicalAlert
    {
        $this->requireAssignedTo($alert, $user);

        AlertAcknowledgement::query()->create([
            'alert_id' => $alert->id,
            'user_id' => $user->id,
            'role' => $user->role,
            'acknowledged_at' => now(),
        ]);

        $alert->update([
            'status' => in_array($user->role, self::MEDICAL_ROLES, true)
                ? ClinicalAlert::STATUS_DOCTOR_IN_PROGRESS
                : ClinicalAlert::STATUS_IN_PROGRESS,
            'assigned_user_id' => $user->id,
            'acknowledge_due_at' => null,
            'medical_due_at' => in_array($user->role, self::MEDICAL_ROLES, true) ? null : $alert->medical_due_at,
        ]);

        $this->record($alert, 'recepcion', 'Confirmó la recepción de la alerta.', $user);

        return $alert->refresh();
    }

    /**
     * RF-36: nueva toma de constantes durante la verificación. Recalcula NEWS2
     * sobre la misma alerta, sin generar una alerta duplicada.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function reassess(ClinicalAlert $alert, array $input, User $user): array
    {
        $this->requireOpen($alert);
        $reading = $this->vitals->storeManual($alert->encounter_id, $input, $user, activateAlerts: false);
        $total = (int) $reading['reading']['news2']['total'];

        $alert->update([
            'news2_total' => $total,
            'severity' => $total >= 7 ? 'alta' : ($total >= 1 ? 'media' : 'baja'),
        ]);

        $this->record($alert, 'revaloracion', "Nueva toma de constantes. NEWS2 {$total}.", $user);

        return [
            'alert' => $this->present($alert->refresh()),
            'reading' => $reading['reading'],
        ];
    }

    /**
     * RF-37: nueva frecuencia de monitoreo cuando la alteración es aislada y de
     * baja severidad. Programa el control y cierra la alerta.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function scheduleMonitoring(ClinicalAlert $alert, array $input, User $user): array
    {
        $this->requireOpen($alert);
        $frequency = (int) $input['frequencyMinutes'];
        $nextDueAt = now()->addMinutes($frequency);

        $schedule = MonitoringSchedule::query()->updateOrCreate(
            ['encounter_id' => $alert->encounter_id],
            [
                'next_due_at' => $nextDueAt,
                'frequency_minutes' => $frequency,
                'created_by' => $user->id,
            ],
        );

        $note = $input['note'] ?? null;
        $this->record(
            $alert,
            'programacion',
            trim("Próximo control cada {$frequency} minutos. ".(string) $note),
            $user,
        );
        $this->close($alert, $note ?? 'Alteración aislada con nuevo control programado.', $user);

        return [
            'alert' => $this->present($alert->refresh()),
            'schedule' => [
                'nextDueAt' => $schedule->next_due_at->toIso8601String(),
                'frequencyMinutes' => $schedule->frequency_minutes,
            ],
        ];
    }

    /**
     * RF-38 y RF-41: la enfermera confirma que el caso requiere atención médica
     * y la plataforma notifica al médico de guardia con plazo de respuesta.
     *
     * @param  array<string, mixed>  $input
     */
    public function requestMedicalAttention(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->requireOpen($alert);

        $alert->update([
            'status' => ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
            'assigned_role' => 'medico_residente',
            'assigned_user_id' => null,
            'acknowledge_due_at' => null,
            'medical_notified_at' => now(),
            'medical_due_at' => now()->addMinutes($this->minutes('medical_response_minutes')),
        ]);

        $this->record($alert, 'solicitud_medica', $input['reason'], $user);

        return $alert->refresh();
    }

    /**
     * RF-44: evaluación e indicaciones médicas de urgencia.
     *
     * @param  array<string, mixed>  $input
     */
    public function recordMedicalAssessment(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->requireOpen($alert);

        $this->record(
            $alert,
            'atencion_medica',
            "Evaluación: {$input['assessment']} · Indicaciones: {$input['orders']}",
            $user,
        );

        $alert->update([
            'status' => ClinicalAlert::STATUS_DOCTOR_IN_PROGRESS,
            'assigned_user_id' => $user->id,
            'medical_due_at' => null,
        ]);

        return $alert->refresh();
    }

    /**
     * RF-45: solicitud de intervención del Equipo de Respuesta Rápida.
     *
     * @param  array<string, mixed>  $input
     */
    public function requestRapidResponse(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->requireOpen($alert);

        $alert->update([
            'status' => ClinicalAlert::STATUS_RRT_REQUESTED,
            'assigned_role' => 'equipo_respuesta_rapida',
            'assigned_user_id' => null,
            'medical_due_at' => null,
        ]);

        $this->record($alert, 'solicitud_err', $input['reason'], $user);

        return $alert->refresh();
    }

    /**
     * RF-46: evaluación del ERR y, cuando corresponde, orden digital de
     * traslado a la Unidad de Cuidados Intensivos. Cierra el evento.
     *
     * @param  array<string, mixed>  $input
     */
    public function recordRapidResponseAssessment(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->requireOpen($alert);
        $this->record($alert, 'evaluacion_err', $input['assessment'], $user);

        if ($input['transferToIcu'] ?? false) {
            $this->record($alert, 'traslado_uci', 'Orden digital de traslado a cuidados intensivos.', $user);
            $this->close($alert, 'Traslado a cuidados intensivos.', $user);
        } else {
            $this->close($alert, 'Paciente estabilizado; continúa en sala general.', $user);
        }

        return $alert->refresh();
    }

    /**
     * RF-40 y RF-43: escalamiento automático de las alertas sin respuesta
     * dentro del tiempo establecido.
     *
     * @return array{nurse: int, medical: int}
     */
    public function processOverdueAlerts(): array
    {
        $nurse = 0;
        $medical = 0;

        $pendingNursing = ClinicalAlert::query()
            ->where('status', ClinicalAlert::STATUS_OPEN)
            ->whereNotNull('acknowledge_due_at')
            ->where('acknowledge_due_at', '<=', now())
            ->get();

        foreach ($pendingNursing as $alert) {
            $this->escalate(
                $alert,
                'enfermera_supervisora',
                'La enfermera de piso no confirmó la alerta en el tiempo establecido.',
                ClinicalAlert::STATUS_SUPERVISOR,
                now()->addMinutes($this->minutes('supervisor_ack_minutes')),
            );
            $nurse++;
        }

        $pendingSupervisor = ClinicalAlert::query()
            ->where('status', ClinicalAlert::STATUS_SUPERVISOR)
            ->whereNotNull('acknowledge_due_at')
            ->where('acknowledge_due_at', '<=', now())
            ->get();

        foreach ($pendingSupervisor as $alert) {
            $alert->update([
                'status' => ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
                'assigned_role' => 'medico_residente',
                'acknowledge_due_at' => null,
                'medical_notified_at' => now(),
                'medical_due_at' => now()->addMinutes($this->minutes('medical_response_minutes')),
            ]);
            $this->registerEscalation($alert, 'medico_residente', 'La supervisora no atendió el escalamiento en el tiempo establecido.');
            $nurse++;
        }

        $pendingMedical = ClinicalAlert::query()
            ->where('status', ClinicalAlert::STATUS_DOCTOR_NOTIFIED)
            ->whereNotNull('medical_due_at')
            ->where('medical_due_at', '<=', now())
            ->get();

        foreach ($pendingMedical as $alert) {
            $reason = 'El médico de guardia no registró atención en los 15 minutos establecidos.';
            $this->registerEscalation($alert, 'enfermera_supervisora', $reason);
            $alert->update([
                'status' => ClinicalAlert::STATUS_RRT_ESCALATED,
                'assigned_role' => 'equipo_respuesta_rapida',
                'medical_due_at' => null,
            ]);
            $this->registerEscalation($alert, 'equipo_respuesta_rapida', $reason);
            $this->record($alert, 'escalamiento', $reason, null);
            $medical++;
        }

        return ['nurse' => $nurse, 'medical' => $medical];
    }

    /**
     * Bandeja de alertas pendientes del perfil, base de la campana y de la
     * pantalla de alertas.
     *
     * @return array<string, mixed>
     */
    public function inboxFor(User $user): array
    {
        // Solo alertas que aún exigen confirmación de lectura (RF-39, RF-42, RF-94).
        // Tras el acuse pasan a "en atención" y dejan de sonar / ocupar la campana.
        $awaitingAck = [
            ClinicalAlert::STATUS_OPEN,
            ClinicalAlert::STATUS_SUPERVISOR,
            ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
            ClinicalAlert::STATUS_RRT_REQUESTED,
            ClinicalAlert::STATUS_RRT_ESCALATED,
        ];

        $alerts = ClinicalAlert::query()
            ->whereIn('status', $awaitingAck)
            ->where(function ($query) use ($user) {
                $query->where('assigned_role', $user->role)
                    ->orWhere('assigned_user_id', $user->id);
            })
            ->orderByRaw("CASE WHEN severity = 'alta' THEN 0 ELSE 1 END")
            ->orderByDesc('generated_at')
            ->limit(50)
            ->get()
            ->map(fn (ClinicalAlert $alert) => $this->present($alert))
            ->all();

        return [
            'alerts' => $alerts,
            'pending' => count($alerts),
        ];
    }

    /**
     * RF-47: historial consolidado y trazable del evento.
     *
     * @return array<string, mixed>
     */
    public function timeline(ClinicalAlert $alert): array
    {
        $events = $alert->events()
            ->with('user')
            ->orderBy('occurred_at')
            ->orderBy('id')
            ->get()
            ->map(fn (AlertEvent $event) => [
                'id' => $event->id,
                'type' => $event->type,
                'detail' => $event->detail,
                'role' => $event->role,
                'userName' => $event->user?->name,
                'occurredAt' => $event->occurred_at->toIso8601String(),
            ])
            ->all();

        $escalations = $alert->escalations()
            ->orderBy('escalated_at')
            ->get()
            ->map(fn (AlertEscalation $escalation) => [
                'toRole' => $escalation->to_role,
                'reason' => $escalation->reason,
                'escalatedAt' => $escalation->escalated_at->toIso8601String(),
            ])
            ->all();

        return [
            'alert' => $this->present($alert),
            'events' => $events,
            'escalations' => $escalations,
        ];
    }

    /** @return array<string, mixed> */
    public function present(ClinicalAlert $alert): array
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $alert->encounter_id)->first();

        return [
            'id' => $alert->id,
            'encounterId' => $alert->encounter_id,
            'patientName' => $encounter?->patient_name,
            'location' => $this->location($encounter),
            'source' => $alert->source,
            'severity' => $alert->severity,
            'news2Total' => $alert->news2_total,
            'message' => $alert->message,
            'status' => $alert->status,
            'assignedRole' => $alert->assigned_role,
            'generatedAt' => optional($alert->generated_at)?->toIso8601String(),
            'acknowledgeDueAt' => optional($alert->acknowledge_due_at)?->toIso8601String(),
            'medicalDueAt' => optional($alert->medical_due_at)?->toIso8601String(),
            'closedAt' => optional($alert->closed_at)?->toIso8601String(),
        ];
    }

    private function location(?AdmissionEncounter $encounter): ?string
    {
        if (! $encounter) {
            return null;
        }

        $parts = array_filter([
            $encounter->room ? "Habitación {$encounter->room}" : null,
            $encounter->bed ? "lecho {$encounter->bed}" : null,
        ]);

        return $parts === [] ? null : implode(', ', $parts);
    }

    private function escalate(ClinicalAlert $alert, string $toRole, string $reason, string $status, ?Carbon $ackDueAt): void
    {
        $alert->update([
            'status' => $status,
            'assigned_role' => $toRole,
            'assigned_user_id' => null,
            'acknowledge_due_at' => $ackDueAt,
        ]);

        $this->registerEscalation($alert, $toRole, $reason);
        $this->record($alert, 'escalamiento', $reason, null);
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

    private function close(ClinicalAlert $alert, string $note, ?User $user): void
    {
        $alert->update([
            'status' => ClinicalAlert::STATUS_CLOSED,
            'assigned_role' => null,
            'acknowledge_due_at' => null,
            'medical_due_at' => null,
            'closed_at' => now(),
            'closure_note' => $note,
        ]);

        $this->record($alert, 'cierre', $note, $user);
    }

    private function record(ClinicalAlert $alert, string $type, ?string $detail, ?User $user): void
    {
        $this->recorder->record($alert, $type, $detail, $user);
    }

    private function requireAssignedTo(ClinicalAlert $alert, User $user): void
    {
        $this->requireOpen($alert);

        if ($alert->assigned_role !== null && $alert->assigned_role !== $user->role) {
            throw new ClinicalRuleException('La alerta está asignada a otro perfil.');
        }
    }

    private function requireOpen(ClinicalAlert $alert): void
    {
        if ($alert->isClosed()) {
            throw new ClinicalRuleException('La alerta ya está cerrada.');
        }
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }

    private function minutes(string $key): int
    {
        return (int) config("vitalsy.alerts.{$key}");
    }
}
