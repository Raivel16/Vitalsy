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
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-ALERT-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-ALERT-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-ALERT-1',
            'patient_name' => 'Paciente con Deterioro Demo',
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
            'pulse' => 105,
            'temperature' => 38.2,
            'consciousness' => 'alert',
            'supplementalOxygen' => false,
            'spo2Scale' => 'scale1',
        ];
    }

    public function test_monitoring_alert_is_routed_to_the_floor_nurse_with_a_deadline(): void
    {
        Carbon::setTestNow('2026-09-26 08:00:00');
        $this->inpatientEncounter();
        $this->asRole('enfermera_piso');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-ALERT-0001/vital-signs', $this->vitalsPayload())
            ->assertCreated()
            ->assertJsonPath('alertActivated', true);

        $alert = ClinicalAlert::query()->firstOrFail();
        $this->assertSame('enfermera_piso', $alert->assigned_role);
        $this->assertSame('abierta', $alert->status);
        $this->assertSame('2026-09-26 08:05:00', $alert->acknowledge_due_at->toDateTimeString());
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

    public function test_inbox_lists_pending_alerts_for_the_role_and_hides_acknowledged_ones(): void
    {
        Carbon::setTestNow('2026-09-26 08:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert();
        $this->openAlert(['status' => 'cerrada', 'assigned_role' => 'enfermera_piso', 'closed_at' => now()]);
        $this->asRole('enfermera_piso');

        $this->getJson('/api/v1/clinical-alerts/inbox')
            ->assertOk()
            ->assertJsonCount(1, 'alerts')
            ->assertJsonPath('alerts.0.id', $alert->id)
            ->assertJsonPath('alerts.0.patientName', 'Paciente con Deterioro Demo')
            ->assertJsonPath('alerts.0.location', 'Habitación 507, lecho B')
            ->assertJsonPath('pending', 1);
    }

    public function test_nurse_acknowledges_the_alert_and_the_clock_stops(): void
    {
        Carbon::setTestNow('2026-09-26 08:03:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert(['acknowledge_due_at' => Carbon::parse('2026-09-26 08:05:00')]);
        $nurse = $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")
            ->assertOk()
            ->assertJsonPath('alert.status', 'en_atencion');

        $this->assertDatabaseHas('alert_acknowledgements', [
            'alert_id' => $alert->id,
            'user_id' => $nurse->id,
            'role' => 'enfermera_piso',
        ]);
        $this->assertSame('en_atencion', $alert->refresh()->status);

        // Vencido el plazo, el escalamiento ya no debe dispararse.
        Carbon::setTestNow('2026-09-26 08:30:00');
        $this->artisan('alerts:process-slas')->assertSuccessful();
        $this->assertSame('en_atencion', $alert->refresh()->status);
    }

    public function test_unacknowledged_nurse_alert_escalates_to_the_supervisor(): void
    {
        Carbon::setTestNow('2026-09-26 08:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert(['acknowledge_due_at' => Carbon::parse('2026-09-26 08:05:00')]);

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
        Carbon::setTestNow('2026-09-26 08:10:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion']);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/reassessment", $this->vitalsPayload())
            ->assertOk()
            ->assertJsonPath('alert.id', $alert->id);

        $this->assertSame(1, ClinicalAlert::query()->count());
        $this->assertSame(1, VitalSignReading::query()->where('encounter_id', 'ENC-ALERT-0001')->count());
        $this->assertNotSame(4, $alert->refresh()->news2_total);
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'revaloracion']);
    }

    public function test_nurse_schedules_a_new_monitoring_frequency(): void
    {
        Carbon::setTestNow('2026-09-26 09:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion']);
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
        Carbon::setTestNow('2026-09-26 10:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'en_atencion']);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/medical-request", [
            'reason' => 'Persiste taquipnea y preocupación clínica de enfermería.',
        ])->assertOk()
            ->assertJsonPath('alert.status', 'medico_notificado')
            ->assertJsonPath('alert.assignedRole', 'medico_residente');

        $alert->refresh();
        $this->assertSame('2026-09-26 10:15:00', $alert->medical_due_at->toDateTimeString());
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'solicitud_medica']);
    }

    public function test_doctor_acknowledges_and_records_the_urgent_assessment(): void
    {
        Carbon::setTestNow('2026-09-26 10:05:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert([
            'status' => 'medico_notificado',
            'assigned_role' => 'medico_residente',
            'medical_due_at' => Carbon::parse('2026-09-26 10:15:00'),
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
        ])->assertCreated();

        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'atencion_medica']);
    }

    public function test_missing_medical_response_escalates_to_supervisor_and_rapid_response_team(): void
    {
        Carbon::setTestNow('2026-09-26 10:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert([
            'status' => 'medico_notificado',
            'assigned_role' => 'medico_residente',
            'medical_due_at' => Carbon::parse('2026-09-26 10:15:00'),
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

    public function test_rapid_response_team_records_assessment_and_icu_transfer_order(): void
    {
        Carbon::setTestNow('2026-09-26 11:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert(['status' => 'err_solicitado', 'assigned_role' => 'equipo_respuesta_rapida']);
        $this->asRole('equipo_respuesta_rapida');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/err-assessment", [
            'assessment' => 'Insuficiencia respiratoria aguda con criterio de ventilación no invasiva.',
            'transferToIcu' => true,
        ])->assertCreated()
            ->assertJsonPath('alert.status', 'cerrada');

        $alert->refresh();
        $this->assertSame('2026-09-26 11:00:00', $alert->closed_at->toDateTimeString());
        $this->assertDatabaseHas('alert_events', ['alert_id' => $alert->id, 'type' => 'traslado_uci']);
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

        $this->assertDatabaseMissing('alert_events', ['alert_id' => $alert->id, 'type' => 'traslado_uci']);
    }

    public function test_timeline_consolidates_the_whole_history_in_order(): void
    {
        Carbon::setTestNow('2026-09-26 08:00:00');
        $this->inpatientEncounter();
        $alert = $this->openAlert();
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/acknowledge")->assertOk();
        Carbon::setTestNow('2026-09-26 08:20:00');
        $this->postJson("/api/v1/clinical-alerts/{$alert->id}/medical-request", [
            'reason' => 'Persiste el deterioro pese a la reevaluación.',
        ])->assertOk();

        $response = $this->getJson("/api/v1/clinical-alerts/{$alert->id}/timeline")->assertOk();

        $types = array_column($response->json('events'), 'type');
        $this->assertSame(['recepcion', 'solicitud_medica'], $types);
        $this->assertSame('Paciente con Deterioro Demo', $response->json('alert.patientName'));
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

    public function test_administrative_roles_cannot_reach_the_alert_flow(): void
    {
        $this->inpatientEncounter();
        $alert = $this->openAlert();
        $this->asRole('admision');

        $this->getJson('/api/v1/clinical-alerts/inbox')->assertForbidden();
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
