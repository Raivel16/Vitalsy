<?php

namespace App\Services\ClinicalAlerts;

use App\Exceptions\ClinicalRuleException;
use App\Models\AlertAcknowledgement;
use App\Models\AlertEscalation;
use App\Models\AlertEvent;
use App\Models\ClinicalAlert;
use App\Models\MonitoringSchedule;
use App\Models\User;
use App\Services\InpatientCare\VitalSignsMonitoring;

/**
 * Proceso 3: gestión de alertas y respuesta ante alteraciones del estado
 * clínico (RF-39 a RF-52).
 */
class AlertWorkflow
{
    /** Perfiles médicos que reciben la notificación de alta prioridad. */
    private const MEDICAL_ROLES = ['medico_residente', 'medico_tratante'];

    public function __construct(
        private readonly VitalSignsMonitoring $vitals,
        private readonly AlertRecorder $recorder,
        private readonly AlertPreconditions $checks,
        private readonly AlertSirenPolicy $siren,
        private readonly AlertPresenter $presenter,
        private readonly OverdueAlertProcessor $overdue,
    ) {}

    /**
     * RF-40: deterioro observado de forma imprevista por el auxiliar de
     * enfermería; queda asociado al paciente y dirigido a la enfermera.
     *
     * @param  array<string, mixed>  $input
     */
    public function observe(string $encounterId, array $input, ?User $user = null): ClinicalAlert
    {
        $this->checks->requireEncounter($encounterId);
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

        $this->recorder->record($alert, 'observacion', $input['note'], $user);

        return $alert;
    }

    /**
     * RF-44, RF-47 y RF-53: confirmación de lectura. Calla la sirena y arranca
     * el plazo de seguimiento clínico (15 min) hasta reevaluar y disponer.
     * Si ese plazo ya venció, un nuevo acuse reinicia el reloj sin cerrar el caso.
     */
    public function acknowledge(ClinicalAlert $alert, User $user): ClinicalAlert
    {
        $this->checks->requireAssignedTo($alert, $user);

        $isFollowUpReminder = $alert->status === ClinicalAlert::STATUS_IN_PROGRESS
            && $alert->follow_up_due_at !== null
            && $alert->follow_up_due_at->lte(now());

        if (! $isFollowUpReminder && ! $this->siren->awaitsAcknowledgement($alert)) {
            throw new ClinicalRuleException('La alerta ya está en atención; complete la reevaluación del paciente.');
        }

        AlertAcknowledgement::query()->create([
            'alert_id' => $alert->id,
            'user_id' => $user->id,
            'role' => $user->role,
            'acknowledged_at' => now(),
        ]);

        if ($isFollowUpReminder) {
            $alert->update([
                'follow_up_due_at' => now()->addMinutes($this->minutes('nurse_follow_up_minutes')),
            ]);
            $this->recorder->record(
                $alert,
                'recepcion',
                'Confirmó de nuevo la lectura; queda pendiente reevaluar y disponer la alerta.',
                $user,
            );

            return $alert->refresh();
        }

        $isMedical = in_array($user->role, self::MEDICAL_ROLES, true);

        $alert->update([
            'status' => $isMedical
                ? ClinicalAlert::STATUS_DOCTOR_IN_PROGRESS
                : ClinicalAlert::STATUS_IN_PROGRESS,
            'assigned_user_id' => $user->id,
            'acknowledge_due_at' => null,
            'follow_up_due_at' => $isMedical
                ? null
                : now()->addMinutes($this->minutes('nurse_follow_up_minutes')),
            'reassessed_at' => null,
            'medical_due_at' => $isMedical ? null : $alert->medical_due_at,
        ]);

        $this->recorder->record($alert, 'recepcion', 'Confirmó la recepción de la alerta.', $user);

        return $alert->refresh();
    }

    /**
     * RF-41: nueva toma de constantes durante la verificación. Recalcula NEWS2
     * sobre la misma alerta, sin generar una alerta duplicada.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function reassess(ClinicalAlert $alert, array $input, User $user): array
    {
        $this->checks->requireOpen($alert);
        $reading = $this->vitals->storeManual($alert->encounter_id, $input, $user, activateAlerts: false);
        $total = (int) $reading['reading']['news2']['total'];

        $severity = 'baja';
        if ($total >= 7) {
            $severity = 'alta';
        } elseif ($total >= 1) {
            $severity = 'media';
        }

        $alert->update([
            'news2_total' => $total,
            'severity' => $severity,
            'reassessed_at' => now(),
        ]);

        $this->recorder->record($alert, 'revaloracion', "Nueva toma de constantes. NEWS2 {$total}.", $user);

        $medicalNotified = false;
        if ($total >= 1 && $alert->status === ClinicalAlert::STATUS_IN_PROGRESS) {
            $this->notifyDoctor(
                $alert->refresh(),
                "NEWS2 {$total} persiste tras la reevaluación; se notifica al médico automáticamente.",
                $user,
            );
            $medicalNotified = true;
        }

        return [
            'alert' => $this->present($alert->refresh(), $user),
            'reading' => $reading['reading'],
            'medicalNotified' => $medicalNotified,
        ];
    }

    /**
     * RF-42: nueva frecuencia de monitoreo cuando la alteración es aislada y de
     * baja severidad. Programa el control y cierra la alerta.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function scheduleMonitoring(ClinicalAlert $alert, array $input, User $user): array
    {
        $this->checks->requireOpen($alert);
        $this->checks->requireReassessed($alert);

        if ((int) $alert->news2_total >= 1) {
            throw new ClinicalRuleException(
                'El NEWS2 sigue alterado. Solicite atención médica o espere la notificación automática al médico.',
            );
        }

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
        $this->recorder->record(
            $alert,
            'programacion',
            trim("Próximo control cada {$frequency} minutos. ".(string) $note),
            $user,
        );
        $this->close($alert, $note ?? 'Alteración aislada con nuevo control programado.', $user);

        return [
            'alert' => $this->present($alert->refresh(), $user),
            'schedule' => [
                'nextDueAt' => $schedule->next_due_at->toIso8601String(),
                'frequencyMinutes' => $schedule->frequency_minutes,
            ],
        ];
    }

    /**
     * RF-43 y RF-46: la enfermera confirma que el caso requiere atención médica
     * (incluye nurse's worry sin exigir nueva toma previa).
     *
     * @param  array<string, mixed>  $input
     */
    public function requestMedicalAttention(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->checks->requireOpen($alert);
        $this->notifyDoctor($alert, $input['reason'], $user);

        return $alert->refresh();
    }

    /**
     * RF-49: evaluación e indicaciones médicas de urgencia.
     *
     * @param  array<string, mixed>  $input
     */
    public function recordMedicalAssessment(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->checks->requireOpen($alert);

        $this->recorder->record(
            $alert,
            'atencion_medica',
            "Evaluación: {$input['assessment']} · Indicaciones: {$input['orders']}",
            $user,
        );

        $alert->update([
            'assigned_user_id' => $user->id,
        ]);

        $this->close(
            $alert->refresh(),
            'Atención médica registrada; continuidad del manejo en sala.',
            $user,
        );

        return $alert->refresh();
    }

    /**
     * RF-50: solicitud de intervención del Equipo de Respuesta Rápida.
     *
     * @param  array<string, mixed>  $input
     */
    public function requestRapidResponse(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->checks->requireOpen($alert);

        $alert->update([
            'status' => ClinicalAlert::STATUS_RRT_REQUESTED,
            'assigned_role' => 'equipo_respuesta_rapida',
            'assigned_user_id' => null,
            'medical_due_at' => null,
        ]);

        $this->recorder->record($alert, 'solicitud_err', $input['reason'], $user);

        return $alert->refresh();
    }

    /**
     * RF-51: evaluación del ERR. Si requiere UCI, abre el ciclo de autorización
     * (médico + enfermera) sin cerrar el evento; si no, cierra estabilizado.
     *
     * @param  array<string, mixed>  $input
     */
    public function recordRapidResponseAssessment(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->checks->requireOpen($alert);
        $this->recorder->record($alert, 'evaluacion_err', $input['assessment'], $user);

        if ($input['transferToIcu'] ?? false) {
            $encounter = $this->checks->requireEncounter($alert->encounter_id);
            $alert->update([
                'status' => ClinicalAlert::STATUS_ICU_ORDERED,
                'assigned_role' => null,
                'assigned_user_id' => null,
                'medical_due_at' => null,
                'follow_up_due_at' => null,
                'icu_ordered_at' => now(),
                'icu_doctor_authorized_at' => null,
                'icu_doctor_authorized_by' => null,
                'icu_nurse_authorized_at' => null,
                'icu_nurse_authorized_by' => null,
                'icu_transferred_at' => null,
                'icu_returned_at' => null,
                'icu_previous_room' => $encounter->room,
                'icu_previous_bed' => $encounter->bed,
                'icu_previous_service' => $encounter->service,
            ]);
            $this->recorder->record($alert, 'orden_uci', 'Orden digital de traslado a cuidados intensivos.', $user);
        } else {
            $this->close($alert, 'Paciente estabilizado; continúa en sala general.', $user);
        }

        return $alert->refresh();
    }

    /** Autorización de la orden UCI por médico o enfermera de piso. */
    public function authorizeIcuTransfer(ClinicalAlert $alert, User $user): ClinicalAlert
    {
        $this->checks->requireOpen($alert);

        if ($alert->status !== ClinicalAlert::STATUS_ICU_ORDERED
            && $alert->status !== ClinicalAlert::STATUS_ICU_AUTHORIZED) {
            throw new ClinicalRuleException('No hay una orden de traslado a UCI pendiente de autorización.');
        }

        $isDoctor = in_array($user->role, self::MEDICAL_ROLES, true);
        $isNurse = $user->role === 'enfermera_piso';

        if (! $isDoctor && ! $isNurse) {
            throw new ClinicalRuleException('Solo el médico o la enfermera de piso pueden autorizar el traslado a UCI.');
        }

        if ($isDoctor) {
            if ($alert->icu_doctor_authorized_at !== null) {
                throw new ClinicalRuleException('El médico ya autorizó esta orden de traslado.');
            }
            $alert->update([
                'icu_doctor_authorized_at' => now(),
                'icu_doctor_authorized_by' => $user->id,
            ]);
            $this->recorder->record($alert, 'autorizacion_uci_medico', 'Médico autorizó el traslado a cuidados intensivos.', $user);
        } else {
            if ($alert->icu_nurse_authorized_at !== null) {
                throw new ClinicalRuleException('La enfermera ya autorizó esta orden de traslado.');
            }
            $alert->update([
                'icu_nurse_authorized_at' => now(),
                'icu_nurse_authorized_by' => $user->id,
            ]);
            $this->recorder->record($alert, 'autorizacion_uci_enfermera', 'Enfermera autorizó el traslado a cuidados intensivos.', $user);
        }

        $alert->refresh();
        if ($alert->icuFullyAuthorized()) {
            $alert->update([
                'status' => ClinicalAlert::STATUS_ICU_AUTHORIZED,
                'assigned_role' => 'enfermera_piso',
            ]);
            $this->recorder->record($alert, 'uci_autorizada', 'Orden de traslado a UCI autorizada por médico y enfermera.', $user);
        }

        return $alert->refresh();
    }

    /**
     * Registro del traslado físico a UCI (actualiza ubicación del ingreso).
     *
     * @param  array<string, mixed>  $input
     */
    public function recordIcuTransfer(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->checks->requireOpen($alert);

        if ($alert->status !== ClinicalAlert::STATUS_ICU_AUTHORIZED || ! $alert->icuFullyAuthorized()) {
            throw new ClinicalRuleException('El traslado a UCI requiere autorización del médico y de la enfermera.');
        }

        if (! in_array($user->role, ['enfermera_piso', 'enfermera_supervisora', 'camillero'], true)) {
            throw new ClinicalRuleException('Solo enfermería o el camillero pueden registrar el traslado efectivo a UCI.');
        }

        $encounter = $this->checks->requireEncounter($alert->encounter_id);
        $encounter->update([
            'service' => $input['service'] ?? 'UCI',
            'room' => $input['room'] ?? 'UCI',
            'bed' => $input['bed'] ?? null,
        ]);

        $alert->update([
            'status' => ClinicalAlert::STATUS_IN_ICU,
            'assigned_role' => 'enfermera_piso',
            'icu_transferred_at' => now(),
        ]);

        $location = trim(($input['service'] ?? 'UCI').' '.($input['room'] ?? '').' '.($input['bed'] ?? ''));
        $this->recorder->record($alert, 'traslado_uci_efectivo', "Paciente trasladado a {$location}.", $user);

        return $alert->refresh();
    }

    /**
     * Retorno del paciente a sala general tras estancia en UCI.
     *
     * @param  array<string, mixed>  $input
     */
    public function recordIcuReturn(ClinicalAlert $alert, array $input, User $user): ClinicalAlert
    {
        $this->checks->requireOpen($alert);

        if ($alert->status !== ClinicalAlert::STATUS_IN_ICU) {
            throw new ClinicalRuleException('El paciente no está registrado en UCI.');
        }

        if (! in_array($user->role, ['enfermera_piso', 'enfermera_supervisora'], true)) {
            throw new ClinicalRuleException('Solo enfermería puede registrar el retorno a sala.');
        }

        $encounter = $this->checks->requireEncounter($alert->encounter_id);
        $encounter->update([
            'service' => $input['service'],
            'room' => $input['room'],
            'bed' => $input['bed'] ?? null,
        ]);

        $alert->update([
            'icu_returned_at' => now(),
        ]);

        $note = $input['note'] ?? 'Paciente regresa a sala general tras UCI.';
        $this->recorder->record(
            $alert,
            'retorno_sala',
            "Retorno a {$input['service']}, habitación {$input['room']}. {$note}",
            $user,
        );
        $this->close($alert, $note, $user);

        return $alert->refresh();
    }

    private function notifyDoctor(ClinicalAlert $alert, string $reason, User $user): void
    {
        if (in_array($alert->status, [
            ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
            ClinicalAlert::STATUS_DOCTOR_IN_PROGRESS,
            ClinicalAlert::STATUS_RRT_REQUESTED,
            ClinicalAlert::STATUS_RRT_ESCALATED,
            ClinicalAlert::STATUS_ICU_ORDERED,
            ClinicalAlert::STATUS_ICU_AUTHORIZED,
            ClinicalAlert::STATUS_IN_ICU,
        ], true)) {
            throw new ClinicalRuleException('El médico ya fue notificado o el caso avanzó a otro nivel.');
        }

        $alert->update([
            'status' => ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
            'assigned_role' => 'medico_residente',
            'assigned_user_id' => null,
            'acknowledge_due_at' => null,
            'follow_up_due_at' => null,
            'medical_notified_at' => now(),
            'medical_due_at' => now()->addMinutes($this->minutes('medical_response_minutes')),
        ]);

        $this->recorder->record($alert, 'solicitud_medica', $reason, $user);
    }

    /**
     * RF-45, RF-48, RF-53 y cumplimiento RF-42/RF-32: escalamientos y apertura
     * de alertas por controles/dosis vencidos.
     *
     * @return array{nurse: int, followUp: int, medical: int, controls: int, doses: int}
     */
    public function processOverdueAlerts(): array
    {
        return $this->overdue->process();
    }

    /**
     * Bandeja de trabajo del perfil: alertas abiertas (en curso o por acusar).
     * La sirena solo suena cuando `needsSiren` es verdadero.
     *
     * @return array<string, mixed>
     */
    public function inboxFor(User $user): array
    {
        $alerts = ClinicalAlert::query()
            ->where('status', '!=', ClinicalAlert::STATUS_CLOSED)
            ->where(function ($query) use ($user) {
                $query->where('assigned_role', $user->role)
                    ->orWhere('assigned_user_id', $user->id);

                // Guardia médica: residente y tratante comparten la bandeja.
                if (in_array($user->role, self::MEDICAL_ROLES, true)) {
                    $query->orWhere(function ($medical) {
                        $medical->whereIn('assigned_role', self::MEDICAL_ROLES)
                            ->orWhereIn('status', [
                                ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
                                ClinicalAlert::STATUS_DOCTOR_IN_PROGRESS,
                                ClinicalAlert::STATUS_ICU_ORDERED,
                                ClinicalAlert::STATUS_ICU_AUTHORIZED,
                                ClinicalAlert::STATUS_IN_ICU,
                            ]);
                    });
                }

                if ($user->role === 'enfermera_piso') {
                    $query->orWhereIn('status', [
                        ClinicalAlert::STATUS_ICU_ORDERED,
                        ClinicalAlert::STATUS_ICU_AUTHORIZED,
                        ClinicalAlert::STATUS_IN_ICU,
                    ]);
                }

                if (in_array($user->role, ['enfermera_supervisora', 'camillero'], true)) {
                    $query->orWhereIn('status', [
                        ClinicalAlert::STATUS_ICU_AUTHORIZED,
                        ClinicalAlert::STATUS_IN_ICU,
                    ]);
                }
            })
            ->orderByRaw("CASE WHEN severity = 'alta' THEN 0 ELSE 1 END")
            ->orderByDesc('generated_at')
            ->limit(50)
            ->get()
            ->unique('id')
            ->values()
            ->map(fn (ClinicalAlert $alert) => $this->present($alert, $user))
            ->all();

        $pendingSiren = count(array_filter($alerts, fn (array $alert) => ($alert['needsSiren'] ?? false) === true));

        return [
            'alerts' => $alerts,
            'pending' => $pendingSiren,
        ];
    }

    /**
     * RF-52: historial consolidado y trazable del evento.
     *
     * @return array<string, mixed>
     */
    public function timeline(ClinicalAlert $alert, ?User $viewer = null): array
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
            'alert' => $this->present($alert, $viewer),
            'events' => $events,
            'escalations' => $escalations,
        ];
    }

    /** @return array<string, mixed> */
    public function present(ClinicalAlert $alert, ?User $viewer = null): array
    {
        return $this->presenter->present($alert, $viewer);
    }

    private function close(ClinicalAlert $alert, string $note, ?User $user): void
    {
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

    private function minutes(string $key): int
    {
        return (int) config("vitalsy.alerts.{$key}");
    }
}
