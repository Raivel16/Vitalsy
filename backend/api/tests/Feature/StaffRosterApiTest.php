<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\DailyPatientAssignment;
use App\Models\StaffAbsence;
use App\Models\User;
use App\Models\VitalSignReading;
use App\Services\ClinicalAlerts\AlertRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffRosterApiTest extends TestCase
{
    use RefreshDatabase;

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    private function hospitalized(string $id, string $name = 'Paciente de turno'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $id,
            'order_number' => "OI-{$id}",
            'source' => 'manual',
            'patient_name' => $name,
            'document_type' => 'DNI',
            'document_number' => substr(crc32($id), 0, 8),
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => '401',
            'bed' => 'A',
            'service' => 'Medicina',
            'current_step' => 'cerrado',
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    public function test_leadership_publishes_monthly_shift_plan(): void
    {
        $this->asRole('jefatura_enfermeria');
        $nurse = User::factory()->create(['role' => 'enfermera_piso']);

        $this->postJson('/api/v1/staff/shift-plans', [
            'yearMonth' => '2026-09',
            'shifts' => [[
                'userId' => $nurse->id,
                'startsAt' => '2026-09-26T07:00:00+00:00',
                'endsAt' => '2026-09-26T19:00:00+00:00',
                'unit' => 'Medicina',
            ]],
        ])->assertCreated()
            ->assertJsonPath('plan.yearMonth', '2026-09')
            ->assertJsonPath('plan.published', true);

        $this->getJson('/api/v1/staff/shift-plans/2026-09')
            ->assertOk()
            ->assertJsonCount(1, 'plan.shifts');
    }

    public function test_suggests_fewer_patients_for_high_news2_and_approves_assignment(): void
    {
        $green = $this->hospitalized('ENC-STAFF-1', 'Verde');
        $red = $this->hospitalized('ENC-STAFF-2', 'Rojo');
        VitalSignReading::query()->create([
            'encounter_id' => $green->encounter_id,
            'rr' => 16, 'spo2' => 98, 'sbp' => 120, 'pulse' => 72, 'temperature' => 36.8,
            'news2_total' => 0, 'recorded_at' => now(),
        ]);
        VitalSignReading::query()->create([
            'encounter_id' => $red->encounter_id,
            'rr' => 30, 'spo2' => 90, 'sbp' => 88, 'pulse' => 130, 'temperature' => 39.2,
            'news2_total' => 8, 'recorded_at' => now(),
        ]);

        $n1 = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Enfermera Uno']);
        $n2 = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Enfermera Dos']);
        $this->asRole('enfermera_supervisora');

        $suggestion = $this->postJson('/api/v1/staff/assignments/suggest', [
            'shiftDate' => '2026-09-26',
            'nurseIds' => [$n1->id, $n2->id],
        ])->assertOk();

        $loads = collect($suggestion->json('suggestion.loads'));
        $this->assertTrue($loads->every(fn ($load) => $load['patients'] <= 2));

        $this->postJson('/api/v1/staff/assignments/approve', [
            'shiftDate' => '2026-09-26',
            'assignments' => $suggestion->json('suggestion.assignments'),
        ])->assertCreated()
            ->assertJsonPath('approved', true);

        $this->assertDatabaseCount('daily_patient_assignments', 2);
    }

    public function test_handover_consolidates_vitals_emar_and_alerts_then_signs(): void
    {
        $this->hospitalized('ENC-STAFF-3');
        $outgoing = User::factory()->create(['role' => 'enfermera_piso']);
        $incoming = User::factory()->create(['role' => 'enfermera_piso']);
        DailyPatientAssignment::query()->create([
            'shift_date' => '2026-09-26',
            'nurse_user_id' => $outgoing->id,
            'encounter_id' => 'ENC-STAFF-3',
            'news2_weight' => 2,
        ]);
        ClinicalAlert::query()->create([
            'encounter_id' => 'ENC-STAFF-3',
            'source' => 'news2',
            'severity' => 'media',
            'news2_total' => 3,
            'message' => 'Alerta abierta',
            'status' => 'abierta',
            'assigned_role' => 'enfermera_piso',
            'generated_at' => now(),
        ]);

        $this->actingAs($outgoing);
        $preview = $this->getJson('/api/v1/staff/handover?shiftDate=2026-09-26')
            ->assertOk()
            ->assertJsonPath('handover.patients.0.encounterId', 'ENC-STAFF-3');
        $this->assertNotEmpty($preview->json('handover.patients.0.alerts'));

        $this->actingAs($incoming);
        $this->postJson('/api/v1/staff/handover', [
            'fromUserId' => $outgoing->id,
            'shiftDate' => '2026-09-26',
        ])->assertCreated()
            ->assertJsonPath('handover.signed', true);
    }

    public function test_absence_in_critical_sector_opens_coverage_request(): void
    {
        $this->hospitalized('ENC-STAFF-4');
        VitalSignReading::query()->create([
            'encounter_id' => 'ENC-STAFF-4',
            'rr' => 30, 'spo2' => 88, 'sbp' => 80, 'pulse' => 140, 'temperature' => 39.5,
            'news2_total' => 9, 'recorded_at' => now(),
        ]);
        $absent = User::factory()->create(['role' => 'enfermera_piso']);
        DailyPatientAssignment::query()->create([
            'shift_date' => '2026-09-26',
            'nurse_user_id' => $absent->id,
            'encounter_id' => 'ENC-STAFF-4',
            'news2_weight' => 8,
        ]);
        $supervisor = $this->asRole('enfermera_supervisora');

        $this->postJson('/api/v1/staff/absences', [
            'userId' => $absent->id,
            'shiftDate' => '2026-09-26',
            'reason' => 'Inasistencia',
        ])->assertCreated()
            ->assertJsonPath('coverage.required', true);

        $coverageId = StaffAbsence::query()->first()->id;
        $requestId = $this->getJson('/api/v1/staff/coverage-requests')->json('requests.0.id');

        $this->asRole('jefatura_enfermeria');
        $this->postJson("/api/v1/staff/coverage-requests/{$requestId}/approve")->assertOk();

        $this->asRole('recursos_humanos');
        $this->postJson("/api/v1/staff/coverage-requests/{$requestId}/authorize")->assertOk();

        $retainer = User::factory()->create(['role' => 'enfermera_piso']);
        $this->actingAs($supervisor);
        $this->postJson("/api/v1/staff/coverage-requests/{$requestId}/confirm", [
            'userId' => $retainer->id,
        ])->assertCreated()
            ->assertJsonPath('confirmation.userId', $retainer->id);

        $this->assertNotNull($coverageId);
    }

    public function test_alert_is_assigned_to_the_nurse_of_the_day(): void
    {
        $this->hospitalized('ENC-STAFF-5');
        $nurse = User::factory()->create(['role' => 'enfermera_piso']);
        DailyPatientAssignment::query()->create([
            'shift_date' => now()->toDateString(),
            'nurse_user_id' => $nurse->id,
            'encounter_id' => 'ENC-STAFF-5',
            'news2_weight' => 4,
        ]);

        $alert = app(AlertRecorder::class)->openFromMonitoring('ENC-STAFF-5', 4);
        $this->assertSame($nurse->id, $alert->assigned_user_id);
    }
}
