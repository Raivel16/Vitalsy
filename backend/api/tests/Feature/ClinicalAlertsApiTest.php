<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\AlertEvent;
use App\Models\ClinicalAlert;
use App\Models\MonitoringSchedule;
use App\Models\User;
use App\Models\VitalSignReading;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ClinicalAlertsApiTest extends TestCase
{
    private const V_11_00_00 = '2026-09-26 11:00:00';

    private const V_10_00_00 = '2026-09-26 10:00:00';

    private const CON_DETERIORO_DEMO = 'Paciente con Deterioro Demo';

    private const V_08_10_00 = '2026-09-26 08:10:00';

    private const V_08_05_00 = '2026-09-26 08:05:00';

    private const CLINICAL_ALERTS_INBOX = '/api/v1/clinical-alerts/inbox';

    private const V_10_15_00 = '2026-09-26 10:15:00';

    private const V_08_00_00 = '2026-09-26 08:00:00';

    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-ALERT-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-ALERT-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-ALERT-1',
            'patient_name' => self::CON_DETERIORO_DEMO,
            'document_type' => 'DNI',
            'document_number' => '55443322',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => '507',
            'bed' => 'B',
            'service' => 'Medicina',
            'wristband_code' => 'BRZ-ALERT-0001',
            'record_id' => 'EXP-ALERT-0001',
            'current_step' => 'cerrado',
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    /** @param array<string, mixed> $overrides */
    private function openAlert(array $overrides = []): ClinicalAlert
    {
        return ClinicalAlert::query()->create([
            'encounter_id' => 'ENC-ALERT-0001',
            'source' => 'news2',
            'severity' => 'media',
            'news2_total' => 4,
            'message' => 'NEWS2 4: requiere verificación.',
            'status' => 'abierta',
            'assigned_role' => 'enfermera_piso',
            'acknowledge_due_at' => now()->addMinutes(5),
            'generated_at' => now(),
            ...$overrides,
        ]);
    }

    private function vitalsPayload(): array
    {
        return [
            'respiratoryRate' => 22,
            'oxygenSaturation' => 93,
            'systolicBloodPressure' => 104,
            'diastolicBloodPressure' => 68,
            'pulse' => 105,
            'temperature' => 38.2,
            'consciousness' => 'alert',
            'supplementalOxygen' => false,
            'spo2Scale' => 'scale1',
        ];
    }

    /** Constantes normalizadas (NEWS2 0) para programar control. */
    private function normalVitalsPayload(): array
    {
        return [
            'respiratoryRate' => 16,
            'oxygenSaturation' => 98,
            'systolicBloodPressure' => 120,
            'diastolicBloodPressure' => 80,
            'pulse' => 72,
            'temperature' => 36.6,
            'consciousness' => 'alert',
            'supplementalOxygen' => false,
            'spo2Scale' => 'scale1',
        ];
    }

    public function test_monitoring_alert_is_routed_to_the_floor_nurse_with_a_deadline(): void
    {
        Carbon::setTestNow(self::V_08_00_00);
        $this->inpatientEncounter();
        $this->asRole('enfermera_piso');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-ALERT-0001/vital-signs', $this->vitalsPayload())
            ->assertCreated()
            ->assertJsonPath('alertActivated', true);

        $alert = ClinicalAlert::query()->firstOrFail();
        $this->assertSame('enfermera_piso', $alert->assigned_role);
        $this->assertSame('abierta', $alert->status);
        $this->assertSame(self::V_08_05_00, $alert->acknowledge_due_at->toDateTimeString());
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'generada']);
    }

    public function test_auxiliary_registers_unexpected_deterioration_for_the_nurse(): void
    {
        $this->inpatientEncounter();
        $this->asRole('auxiliar_enfermeria');

        $this->postJson('/api/v1/clinical-alerts/observations', [
            'encounterId' => 'ENC-ALERT-0001',
            'note' => 'Paciente sudoroso y con dificultad para hablar.',
            'severity' => 'alta',
        ])->assertCreated()
            ->assertJsonPath('alert.status', 'abierta')
            ->assertJsonPath('alert.assignedRole', 'enfermera_piso');

        $alert = ClinicalAlert::query()->firstOrFail();
        $this->assertSame('observacion', $alert->source);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'observacion']);
    }

    public function test_observation_requires_a_note(): void
    {
        $this->inpatientEncounter();
        $this->asRole('auxiliar_enfermeria');

        $this->postJson('/api/v1/clinical-alerts/observations', [
            'encounterId' => 'ENC-ALERT-0001',
            'note' => '',
        ])->assertStatus(422)
            ->assertJsonPath('errors.note.0', 'Describa el deterioro observado.');
    }

    public function test_inbox_lists_open_alerts_for_the_role_and_hides_closed_ones(): void
    {
        Carbon::setTestNow(self::V_08_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert();
        $this->openAlert(['status' => 'cerrada', 'assigned_role' => 'enfermera_piso', 'closed_at' => now()]);
        $this->asRole('enfermera_piso');

        $this->getJson(self::CLINICAL_ALERTS_INBOX)
            ->assertOk()
            ->assertJsonCount(1, 'alerts')
            ->assertJsonPath('alerts.0.id', $alert->id)
            ->assertJsonPath('alerts.0.patientName', self::CON_DETERIORO_DEMO)
            ->assertJsonPath('alerts.0.location', 'Habitación 507, lecho B')
            ->assertJsonPath('alerts.0.needsSiren', true)
            ->assertJsonPath('pending', 1);
    }

    public function test_nurse_acknowledges_the_alert_and_the_siren_stops_while_work_continues(): void
    {
        Carbon::setTestNow('2026-09-26 08:03:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert(['acknowledge_due_at' => Carbon::parse(self::V_08_05_00)]);
        $nurse = $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")
            ->assertOk()
            ->assertJsonPath('alert.status', 'en_atencion')
            ->assertJsonPath('alert.needsSiren', false)
            ->assertJsonPath('alert.followUpDueAt', '2026-09-26T08:18:00+00:00');

        $this->assertDatabaseHas('alert_acknowledgements', [
            'alert_id' => $alert->id,
            'user_id' => $nurse->id,
            'role' => 'enfermera_piso',
        ]);
        $this->assertSame('en_atencion', $alert->refresh()->status);
        $this->assertSame('2026-09-26 08:18:00', $alert->follow_up_due_at->toDateTimeString());

        // RF-53: tras confirmar la lectura deja de sonar, pero sigue en la bandeja
        // hasta reevaluar y disponer.
        $this->getJson(self::CLINICAL_ALERTS_INBOX)
            ->assertOk()
            ->assertJsonCount(1, 'alerts')
            ->assertJsonPath('alerts.0.id', $alert->id)
            ->assertJsonPath('alerts.0.needsSiren', false)
            ->assertJsonPath('pending', 0);

        // El plazo de acuse inicial ya no escala.
        Carbon::setTestNow(self::V_08_10_00);
        $this->artisan('alerts:process-slas')->assertSuccessful();
        $this->assertSame('en_atencion', $alert->refresh()->status);
    }

    public function test_acknowledged_alert_without_follow_up_re_alerts_after_fifteen_minutes(): void
    {
        Carbon::setTestNow(self::V_08_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['acknowledge_due_at' => Carbon::parse(self::V_08_05_00)]);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")->assertOk();

        Carbon::setTestNow('2026-09-26 08:16:00');
        $this->artisan('alerts:process-slas')->assertSuccessful();

        $alert->refresh();
        $this->assertSame('en_atencion', $alert->status);
        $this->assertSame('enfermera_piso', $alert->assigned_role);
        $this->assertDatabaseHas('alert_events', [
            'alert_id' => $alert->id,
            'type' => 'seguimiento_vencido',
        ]);
        $this->assertDatabaseHas('alert_escalations', [
            'alert_id' => $alert->id,
            'to_role' => 'enfermera_supervisora',
        ]);

        $this->getJson(self::CLINICAL_ALERTS_INBOX)
            ->assertOk()
            ->assertJsonPath('alerts.0.needsSiren', true)
            ->assertJsonPath('pending', 1);

        // Un nuevo acuse calla la sirena y reinicia el plazo de 15 minutos.
        Carbon::setTestNow('2026-09-26 08:17:00');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")
            ->assertOk()
            ->assertJsonPath('alert.needsSiren', false)
            ->assertJsonPath('alert.followUpDueAt', '2026-09-26T08:32:00+00:00');
    }

    public function test_unacknowledged_nurse_alert_escalates_to_the_supervisor(): void
    {
        Carbon::setTestNow(self::V_08_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['acknowledge_due_at' => Carbon::parse(self::V_08_05_00)]);

        Carbon::setTestNow('2026-09-26 08:06:00');
        $this->artisan('alerts:process-slas')->assertSuccessful();

        $alert->refresh();
        $this->assertSame('escalada_supervisora', $alert->status);
        $this->assertSame('enfermera_supervisora', $alert->assigned_role);
        $this->assertDatabaseHas('alert_escalations', [
            'alert_id' => $alert->id,
            'to_role' => 'enfermera_supervisora',
        ]);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'escalamiento']);
    }

    public function test_reassessment_recalculates_news2_on_the_same_alert_without_duplicating_it(): void
    {
        Carbon::setTestNow(self::V_08_10_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion']);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/reassessment", $this->normalVitalsPayload())
            ->assertOk()
            ->assertJsonPath('alert.id', $alert->id)
            ->assertJsonPath('alert.status', 'en_atencion')
            ->assertJsonPath('medicalNotified', false);

        $this->assertSame(1, ClinicalAlert::query()->count());
        $this->assertSame(1, VitalSignReading::query()->where('encounter_id', 'ENC-ALERT-0001')->count());
        $this->assertSame(0, $alert->refresh()->news2_total);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'revaloracion']);
    }

    public function test_medication_alert_rejects_vitals_and_never_notifies_or_closes_through_them(): void
    {
        Carbon::setTestNow(self::V_08_10_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert([
            'source' => 'emar', 'compliance_key' => 'emar:1', 'news2_total' => null,
            'status' => 'en_atencion', 'reassessed_at' => now(),
        ]);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/reassessment", $this->vitalsPayload())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Esta alerta es de una dosis pendiente: adminístrela en e-MAR.');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/monitoring-schedule", ['frequencyMinutes' => 60])
            ->assertUnprocessable();

        $this->assertSame('en_atencion', $alert->refresh()->status);
        $this->assertSame(0, VitalSignReading::query()->where('encounter_id', 'ENC-ALERT-0001')->count());
    }

    public function test_reassessment_with_persistent_alteration_auto_notifies_the_doctor(): void
    {
        Carbon::setTestNow(self::V_08_10_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion']);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/reassessment", $this->vitalsPayload())
            ->assertOk()
            ->assertJsonPath('medicalNotified', true)
            ->assertJsonPath('alert.status', 'medico_notificado')
            ->assertJsonPath('alert.assignedRole', 'medico_residente');

        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'solicitud_medica']);
        $this->assertNotNull($alert->refresh()->medical_due_at);
    }

    public function test_nurse_can_request_medical_attention_without_reassessment_for_clinical_worry(): void
    {
        Carbon::setTestNow(self::V_10_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion', 'reassessed_at' => null]);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/medical-request", [
            'reason' => 'Nurse worry: paciente sudoroso antes de la segunda toma.',
        ])->assertOk()
            ->assertJsonPath('alert.status', 'medico_notificado');
    }

    public function test_nurse_schedules_a_new_monitoring_frequency(): void
    {
        Carbon::setTestNow('2026-09-26 09:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert([
            'status' => 'en_atencion',
            'reassessed_at' => now(),
            'news2_total' => 0,
            'severity' => 'baja',
        ]);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/monitoring-schedule", [
            'frequencyMinutes' => 240,
            'note' => 'Alteración aislada de baja severidad.',
        ])->assertOk()
            ->assertJsonPath('schedule.nextDueAt', '2026-09-26T13:00:00+00:00');

        $schedule = MonitoringSchedule::query()->where('encounter_id', 'ENC-ALERT-0001')->firstOrFail();
        $this->assertSame(240, $schedule->frequency_minutes);
        $this->assertSame('cerrada', $alert->refresh()->status);
    }

    public function test_nurse_confirms_medical_attention_and_the_doctor_is_notified_with_a_fifteen_minute_clock(): void
    {
        Carbon::setTestNow(self::V_10_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion']);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/medical-request", [
            'reason' => 'Persiste taquipnea y preocupación clínica de enfermería.',
        ])->assertOk()
            ->assertJsonPath('alert.status', 'medico_notificado')
            ->assertJsonPath('alert.assignedRole', 'medico_residente');

        $alert->refresh();
        $this->assertSame(self::V_10_15_00, $alert->medical_due_at->toDateTimeString());
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'solicitud_medica']);
    }

    public function test_doctor_acknowledges_and_records_the_urgent_assessment(): void
    {
        Carbon::setTestNow('2026-09-26 10:05:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert([
            'status' => 'medico_notificado',
            'assigned_role' => 'medico_residente',
            'medical_due_at' => Carbon::parse(self::V_10_15_00),
        ]);
        $doctor = $this->asRole('medico_residente');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")
            ->assertOk()
            ->assertJsonPath('alert.status', 'medico_en_atencion');

        $this->assertDatabaseHas('alert_acknowledgements', [
            'alert_id' => $alert->id,
            'user_id' => $doctor->id,
            'role' => 'medico_residente',
        ]);

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/medical-assessment", [
            'assessment' => 'Paciente con foco respiratorio, murmullo disminuido en base derecha.',
            'orders' => 'Oxígeno a 2 litros por cánula y radiografía de tórax urgente.',
        ])->assertCreated()
            ->assertJsonPath('alert.status', 'cerrada');

        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'atencion_medica']);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'cierre']);
        $this->assertSame('cerrada', $alert->refresh()->status);

        $this->getJson(self::CLINICAL_ALERTS_INBOX)
            ->assertOk()
            ->assertJsonPath('pending', 0)
            ->assertJsonCount(0, 'alerts');
    }

    public function test_missing_medical_response_escalates_to_supervisor_and_rapid_response_team(): void
    {
        Carbon::setTestNow(self::V_10_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert([
            'status' => 'medico_notificado',
            'assigned_role' => 'medico_residente',
            'medical_due_at' => Carbon::parse(self::V_10_15_00),
        ]);

        Carbon::setTestNow('2026-09-26 10:16:00');
        $this->artisan('alerts:process-slas')->assertSuccessful();

        $alert->refresh();
        $this->assertSame('escalada_err', $alert->status);
        $this->assertSame('equipo_respuesta_rapida', $alert->assigned_role);
        $this->assertDatabaseHas('alert_escalations', [
            'alert_id' => $alert->id,
            'to_role' => 'enfermera_supervisora',
        ]);
        $this->assertDatabaseHas('alert_escalations', [
            'alert_id' => $alert->id,
            'to_role' => 'equipo_respuesta_rapida',
        ]);
    }

    public function test_doctor_requests_the_rapid_response_team(): void
    {
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'medico_en_atencion', 'assigned_role' => 'medico_residente']);
        $this->asRole('medico_residente');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/rapid-response-request", [
            'reason' => 'No se estabiliza tras oxigenoterapia; requiere intensivista.',
        ])->assertOk()
            ->assertJsonPath('alert.status', 'err_solicitado')
            ->assertJsonPath('alert.assignedRole', 'equipo_respuesta_rapida');

        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'solicitud_err']);
    }

    public function test_rapid_response_acknowledgement_silences_the_siren_and_keeps_the_case_with_the_team(): void
    {
        $this->inpatientEncounter();
        foreach (['err_solicitado', 'escalada_err'] as $status) {
            $alert = $this->openAlert(['status' => $status, 'assigned_role' => 'equipo_respuesta_rapida']);
            $this->asRole('equipo_respuesta_rapida');

            $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")
                ->assertOk()
                ->assertJsonPath('alert.status', $status)
                ->assertJsonPath('alert.needsSiren', false);

            $this->assertDatabaseHas('alert_acknowledgements', ['alert_id' => $alert->id, 'role' => 'equipo_respuesta_rapida']);
            $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'recepcion']);

            $this->postJson("/api/v1/clinical-alerts/{$alert->id}/err-assessment", [
                'assessment' => 'Paciente estable tras evaluación del equipo.',
                'transferToIcu' => false,
            ])->assertCreated()->assertJsonPath('alert.status', 'cerrada');
        }
    }

    public function test_a_new_rapid_response_request_sounds_again_after_an_earlier_team_acknowledgement(): void
    {
        Carbon::setTestNow(self::V_11_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'err_solicitado', 'assigned_role' => 'equipo_respuesta_rapida']);
        $this->asRole('equipo_respuesta_rapida');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")->assertOk()->assertJsonPath('alert.needsSiren', false);

        Carbon::setTestNow('2026-09-26 11:10:00');
        $this->asRole('medico_residente');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/rapid-response-request", ['reason' => 'Empeora la saturación.'])
            ->assertOk()
            ->assertJsonPath('alert.needsSiren', true);
    }

    public function test_rapid_response_team_orders_icu_without_closing_the_case(): void
    {
        Carbon::setTestNow(self::V_11_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'err_solicitado', 'assigned_role' => 'equipo_respuesta_rapida']);
        $this->asRole('equipo_respuesta_rapida');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/err-assessment", [
            'assessment' => 'Insuficiencia respiratoria aguda con criterio de ventilación no invasiva.',
            'transferToIcu' => true,
        ])->assertCreated()
            ->assertJsonPath('alert.status', 'orden_uci')
            ->assertJsonPath('alert.icuTransfer.ordered', true);

        $alert->refresh();
        $this->assertNull($alert->closed_at);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'orden_uci']);
    }

    public function test_rapid_response_team_can_keep_the_patient_on_the_ward(): void
    {
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'err_solicitado', 'assigned_role' => 'equipo_respuesta_rapida']);
        $this->asRole('equipo_respuesta_rapida');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/err-assessment", [
            'assessment' => 'Paciente estabilizado; continúa manejo en sala general.',
            'transferToIcu' => false,
        ])->assertCreated()
            ->assertJsonPath('alert.status', 'cerrada');

        $this->assertDatabaseMissing('alert_events', ['alert_id' => $alert->id, 'type' => 'orden_uci']);
    }

    public function test_timeline_consolidates_the_whole_history_in_order(): void
    {
        Carbon::setTestNow(self::V_08_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert();
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")->assertOk();
        Carbon::setTestNow(self::V_08_10_00);
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/reassessment", $this->normalVitalsPayload())->assertOk();
        Carbon::setTestNow('2026-09-26 08:20:00');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/medical-request", [
            'reason' => 'Persiste el deterioro pese a la reevaluación.',
        ])->assertOk();

        $response = $this->getJson("/api/v1/clinical-alerts/{$alert->id}/timeline")->assertOk();

        $types = array_column($response->json('events'), 'type');
        $this->assertSame(['recepcion', 'revaloracion', 'solicitud_medica'], $types);
        $this->assertSame(self::CON_DETERIORO_DEMO, $response->json('alert.patientName'));
    }

    public function test_icu_order_requires_doctor_and_nurse_authorization_before_transfer_and_return(): void
    {
        Carbon::setTestNow(self::V_11_00_00);
        $encounter = $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'err_solicitado', 'assigned_role' => 'equipo_respuesta_rapida']);
        $this->asRole('equipo_respuesta_rapida');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/err-assessment", [
            'assessment' => 'Insuficiencia respiratoria aguda con criterio de ventilación no invasiva.',
            'transferToIcu' => true,
        ])->assertCreated()
            ->assertJsonPath('alert.status', 'orden_uci');

        $alert->refresh();
        $this->assertNull($alert->closed_at);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'orden_uci']);

        $this->asRole('medico_residente');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/icu-authorize")
            ->assertOk()
            ->assertJsonPath('alert.icuTransfer.doctorAuthorized', true)
            ->assertJsonPath('alert.icuTransfer.fullyAuthorized', false);

        $this->asRole('enfermera_piso');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/icu-authorize")
            ->assertOk()
            ->assertJsonPath('alert.status', 'uci_autorizada')
            ->assertJsonPath('alert.icuTransfer.fullyAuthorized', true);

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/icu-transfer", [
            'service' => 'UCI',
            'room' => 'UCI-1',
            'bed' => 'A',
        ])->assertOk()
            ->assertJsonPath('alert.status', 'en_uci');

        $encounter->refresh();
        $this->assertSame('UCI', $encounter->service);
        $this->assertSame('UCI-1', $encounter->room);

        Carbon::setTestNow('2026-09-26 18:00:00');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/icu-return", [
            'service' => 'Medicina',
            'room' => '507',
            'bed' => 'B',
            'note' => 'Paciente estabilizado; regresa a sala general.',
        ])->assertOk()
            ->assertJsonPath('alert.status', 'cerrada');

        $encounter->refresh();
        $this->assertSame('Medicina', $encounter->service);
        $this->assertSame('507', $encounter->room);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'retorno_sala']);
    }

    public function test_alert_history_cannot_be_rewritten_once_recorded(): void
    {
        $this->inpatientEncounter();
        $alert = $this->openAlert();
        $this->asRole('enfermera_piso');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")->assertOk();

        $event = AlertEvent::query()->firstOrFail();

        $this->expectException(\RuntimeException::class);
        $event->update(['type' => 'adulterado']);
    }

    public function test_treating_physician_sees_medical_alerts_assigned_to_the_resident_role(): void
    {
        Carbon::setTestNow(self::V_10_00_00);
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion']);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/medical-request", [
            'reason' => 'Nurse worry: deterioro antes de la segunda toma.',
        ])->assertOk()
            ->assertJsonPath('alert.assignedRole', 'medico_residente');

        $this->asRole('medico_tratante');
        $this->getJson(self::CLINICAL_ALERTS_INBOX)
            ->assertOk()
            ->assertJsonPath('alerts.0.id', $alert->id)
            ->assertJsonPath('alerts.0.needsSiren', true)
            ->assertJsonPath('pending', 1);

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")
            ->assertOk()
            ->assertJsonPath('alert.status', 'medico_en_atencion');
    }

    public function test_administrative_roles_cannot_reach_the_alert_flow(): void
    {
        $this->inpatientEncounter();
        $alert = $this->openAlert();
        $this->asRole('admision');

        $this->getJson(self::CLINICAL_ALERTS_INBOX)->assertForbidden();
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")->assertForbidden();
    }

    public function test_only_the_assigned_role_can_acknowledge_the_alert(): void
    {
        $this->inpatientEncounter();
        $alert = $this->openAlert(['assigned_role' => 'enfermera_piso']);
        $this->asRole('equipo_respuesta_rapida');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")
            ->assertStatus(422)
            ->assertJsonPath('message', 'La alerta está asignada a otro perfil.');
    }
}
