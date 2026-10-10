<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\CoverageRequest;
use App\Models\DailyPatientAssignment;
use App\Models\RetainerConfirmation;
use App\Models\StaffAbsence;
use App\Models\StaffShift;
use App\Models\StaffShiftPlan;
use App\Models\User;
use App\Models\VitalSignReading;
use App\Services\ClinicalAlerts\AlertRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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

    /** Publica turnos directamente para ubicar a cada persona en un servicio ese día. */
    private function planShifts(array $shifts): void
    {
        $plan = StaffShiftPlan::query()->firstOrCreate(
            ['year_month' => '2026-09'],
            ['published_at' => now()],
        );
        foreach ($shifts as [$user, $unit, $startsAt, $endsAt]) {
            StaffShift::query()->create([
                'plan_id' => $plan->id,
                'user_id' => $user->id,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'unit' => $unit,
            ]);
        }
    }

    public function test_handover_requires_both_nurses_in_the_published_roster_of_the_same_unit(): void
    {
        $this->hospitalized('ENC-STAFF-9');
        $outgoing = User::factory()->create(['role' => 'enfermera_piso']);
        $incoming = $this->asRole('enfermera_piso');
        $this->assignment('2026-09-26', $outgoing, 'ENC-STAFF-9', 2);

        // Sin rol publicado no se puede consultar ni reasignar pacientes de otra persona.
        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-26&fromUserId={$outgoing->id}")->assertStatus(422);
        $this->postJson('/api/v1/staff/handover', ['fromUserId' => $outgoing->id, 'shiftDate' => '2026-09-26'])->assertStatus(422);

        // Turno noche de la saliente iniciado el día anterior y que cruza la medianoche.
        Carbon::setTestNow('2026-09-26 07:10:00');
        $this->planShifts([
            [$outgoing, 'Medicina', '2026-09-25T19:00:00', '2026-09-26T07:00:00'],
            [$incoming, 'Medicina', '2026-09-26T07:00:00', '2026-09-26T19:00:00'],
        ]);
        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-26&fromUserId={$outgoing->id}")->assertOk();

        // No se firma una entrega consigo misma.
        $this->postJson('/api/v1/staff/handover', ['fromUserId' => $incoming->id, 'shiftDate' => '2026-09-26'])->assertStatus(422);
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

        $this->planShifts([
            [$outgoing, 'Medicina', '2026-09-26T07:00:00', '2026-09-26T19:00:00'],
            [$incoming, 'Medicina', '2026-09-26T19:00:00', '2026-09-27T07:00:00'],
        ]);
        Carbon::setTestNow('2026-09-26 19:10:00');
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

    private function assignment(string $date, User $nurse, string $encounterId, int $weight): DailyPatientAssignment
    {
        return DailyPatientAssignment::query()->create([
            'shift_date' => $date,
            'nurse_user_id' => $nurse->id,
            'encounter_id' => $encounterId,
            'news2_weight' => $weight,
        ]);
    }

    public function test_absence_rejects_unknown_or_non_care_user_and_missing_reason(): void
    {
        $this->asRole('enfermera_supervisora');
        $admission = User::factory()->create(['role' => 'admision']);

        $this->postJson('/api/v1/staff/absences', ['userId' => 999999, 'shiftDate' => '2026-09-26', 'reason' => 'Inasistencia'])
            ->assertStatus(422);
        $this->postJson('/api/v1/staff/absences', ['userId' => $admission->id, 'shiftDate' => '2026-09-26', 'reason' => 'Inasistencia'])
            ->assertStatus(422);
        $nurse = User::factory()->create(['role' => 'enfermera_piso']);
        $this->postJson('/api/v1/staff/absences', ['userId' => $nurse->id, 'shiftDate' => '2026-09-26'])
            ->assertStatus(422);
    }

    public function test_absence_cannot_be_registered_twice_for_the_same_day(): void
    {
        $this->asRole('enfermera_supervisora');
        $nurse = User::factory()->create(['role' => 'enfermera_piso']);
        $payload = ['userId' => $nurse->id, 'shiftDate' => '2026-09-26', 'reason' => 'Inasistencia'];

        $this->postJson('/api/v1/staff/absences', $payload)->assertCreated();
        $this->postJson('/api/v1/staff/absences', $payload)->assertStatus(422);
        $this->assertSame(1, StaffAbsence::query()->count());
    }

    public function test_approve_rejects_unknown_nurse(): void
    {
        $this->asRole('enfermera_supervisora');
        $this->hospitalized('ENC-STAFF-6');

        $this->postJson('/api/v1/staff/assignments/approve', [
            'shiftDate' => '2026-09-26',
            'assignments' => [['nurseUserId' => 999999, 'encounterId' => 'ENC-STAFF-6']],
        ])->assertStatus(422);
        $this->assertDatabaseCount('daily_patient_assignments', 0);
    }

    public function test_absence_rebalances_by_weight_to_least_loaded_nurse_and_reports_it(): void
    {
        $absent = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Ausente']);
        $heavy = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Cargada']);
        $light = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Holgada']);
        $this->assignment('2026-09-26', $absent, 'ENC-A1', 2);
        $this->assignment('2026-09-26', $absent, 'ENC-A2', 1);
        $this->assignment('2026-09-26', $heavy, 'ENC-H1', 5);
        $this->assignment('2026-09-26', $heavy, 'ENC-H2', 5);
        $this->assignment('2026-09-26', $light, 'ENC-L1', 1);
        $this->asRole('enfermera_supervisora');

        $response = $this->postJson('/api/v1/staff/absences', [
            'userId' => $absent->id, 'shiftDate' => '2026-09-26', 'reason' => 'Inasistencia',
        ])->assertCreated()
            ->assertJsonPath('coverage.required', false)
            ->assertJsonPath('reassignments.0.nurseName', 'Holgada')
            ->assertJsonPath('reassignments.0.patients', 2);

        $this->assertSame(0, $response->json('unassigned'));
        $this->assertSame(2, DailyPatientAssignment::query()->where('nurse_user_id', $light->id)->whereIn('encounter_id', ['ENC-A1', 'ENC-A2'])->count());
    }

    public function test_absence_without_receiving_nurses_opens_coverage_and_reports_unassigned(): void
    {
        $absent = User::factory()->create(['role' => 'enfermera_piso']);
        $this->assignment('2026-09-26', $absent, 'ENC-A3', 1);
        $this->asRole('enfermera_supervisora');

        $this->postJson('/api/v1/staff/absences', [
            'userId' => $absent->id, 'shiftDate' => '2026-09-26', 'reason' => 'Licencia',
        ])->assertCreated()
            ->assertJsonPath('coverage.required', true)
            ->assertJsonPath('unassigned', 1);
    }

    public function test_coverage_list_exposes_names_date_reason_and_approvers(): void
    {
        $absent = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Marta Ausente']);
        $this->assignment('2026-09-26', $absent, 'ENC-A4', 8);
        $this->asRole('enfermera_supervisora');
        $this->postJson('/api/v1/staff/absences', [
            'userId' => $absent->id, 'shiftDate' => '2026-09-26', 'reason' => 'Descanso médico',
        ])->assertCreated();

        $row = $this->getJson('/api/v1/staff/coverage-requests')->assertOk()->json('requests.0');

        $this->assertSame('Marta Ausente', $row['absentName']);
        $this->assertSame('2026-09-26', $row['shiftDate']);
        $this->assertSame('Descanso médico', $row['reason']);
        $this->assertNull($row['approvedByName']);
    }

    public function test_coverage_transitions_reject_wrong_state_and_repeats(): void
    {
        $absent = User::factory()->create(['role' => 'enfermera_piso']);
        $this->assignment('2026-09-26', $absent, 'ENC-A5', 8);
        $this->asRole('enfermera_supervisora');
        $this->postJson('/api/v1/staff/absences', ['userId' => $absent->id, 'shiftDate' => '2026-09-26', 'reason' => 'X'])->assertCreated();
        $id = $this->getJson('/api/v1/staff/coverage-requests')->json('requests.0.id');
        $retainer = User::factory()->create(['role' => 'enfermera_piso']);

        $this->postJson("/api/v1/staff/coverage-requests/{$id}/confirm", ['userId' => $retainer->id])->assertStatus(422);

        $this->asRole('jefatura_enfermeria');
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/approve")->assertOk();
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/approve")->assertStatus(422);

        $this->asRole('recursos_humanos');
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/authorize")->assertOk();
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/authorize")->assertStatus(422);

        $this->asRole('enfermera_supervisora');
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/confirm", ['userId' => 999999])->assertStatus(422);
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/confirm", ['userId' => $retainer->id])->assertCreated();
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/confirm", ['userId' => $retainer->id])->assertStatus(422);

        $this->asRole('jefatura_enfermeria');
        $this->postJson("/api/v1/staff/coverage-requests/{$id}/approve")->assertStatus(422);
    }

    public function test_handover_preview_lists_the_outgoing_nurse_patients_for_the_incoming_one(): void
    {
        $this->hospitalized('ENC-STAFF-7');
        $outgoing = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Saliente']);
        $incoming = $this->asRole('enfermera_piso');
        $this->assignment('2026-09-26', $outgoing, 'ENC-STAFF-7', 2);
        Carbon::setTestNow('2026-09-26 19:10:00');
        $this->planShifts([
            [$outgoing, 'Medicina', '2026-09-26T07:00:00', '2026-09-26T19:00:00'],
            [$incoming, 'Medicina', '2026-09-26T19:00:00', '2026-09-27T07:00:00'],
        ]);

        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-26&fromUserId={$outgoing->id}")
            ->assertOk()
            ->assertJsonPath('handover.fromName', 'Saliente')
            ->assertJsonPath('handover.patients.0.encounterId', 'ENC-STAFF-7');

        $this->postJson('/api/v1/staff/handover', ['fromUserId' => 999999, 'shiftDate' => '2026-09-26'])->assertStatus(422);

        $this->postJson('/api/v1/staff/handover', ['fromUserId' => $outgoing->id, 'shiftDate' => '2026-09-26'])->assertCreated();
        $this->assertSame(1, DailyPatientAssignment::query()->where('nurse_user_id', $incoming->id)->count());
    }

    public function test_staff_endpoints_enforce_roles_and_missing_plan_is_404(): void
    {
        $this->asRole('enfermera_piso');
        $this->postJson('/api/v1/staff/shift-plans', [])->assertForbidden();
        $this->postJson('/api/v1/staff/absences', [])->assertForbidden();
        $this->postJson('/api/v1/staff/assignments/approve', [])->assertForbidden();

        $this->asRole('recursos_humanos');
        $this->postJson('/api/v1/staff/coverage-requests/1/approve')->assertForbidden();
        $this->getJson('/api/v1/staff/handover?shiftDate=2026-09-26')->assertForbidden();

        $this->asRole('jefatura_enfermeria');
        $this->postJson('/api/v1/staff/coverage-requests/1/authorize')->assertForbidden();
        $this->getJson('/api/v1/staff/shift-plans/2030-01')->assertNotFound();
    }

    public function test_handover_is_refused_between_nurses_published_in_different_units(): void
    {
        $this->hospitalized('ENC-STAFF-8');
        $outgoing = User::factory()->create(['role' => 'enfermera_piso']);
        $incoming = User::factory()->create(['role' => 'enfermera_piso']);
        $this->assignment('2026-09-26', $outgoing, 'ENC-STAFF-8', 2);

        $this->asRole('jefatura_enfermeria');
        $this->postJson('/api/v1/staff/shift-plans', [
            'yearMonth' => '2026-09',
            'shifts' => [
                ['userId' => $outgoing->id, 'startsAt' => '2026-09-26T07:00:00', 'endsAt' => '2026-09-26T19:00:00', 'unit' => 'UCI'],
                ['userId' => $incoming->id, 'startsAt' => '2026-09-26T19:00:00', 'endsAt' => '2026-09-27T07:00:00', 'unit' => 'Medicina'],
            ],
        ])->assertCreated();

        $this->actingAs($incoming);
        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-26&fromUserId={$outgoing->id}")->assertStatus(422);
        $this->postJson('/api/v1/staff/handover', ['fromUserId' => $outgoing->id, 'shiftDate' => '2026-09-26'])->assertStatus(422);
        $this->assertSame(1, DailyPatientAssignment::query()->where('nurse_user_id', $outgoing->id)->count());
    }

    public function test_handover_is_refused_between_overlapping_shifts_of_the_same_unit(): void
    {
        $this->hospitalized('ENC-STAFF-10');
        $colleague = User::factory()->create(['role' => 'enfermera_piso']);
        $incoming = $this->asRole('enfermera_piso');
        $this->assignment('2026-09-26', $colleague, 'ENC-STAFF-10', 2);
        // Mismo servicio y mismo horario: es una compañera, no un relevo.
        $this->planShifts([
            [$colleague, 'Medicina', '2026-09-26T07:00:00', '2026-09-26T19:00:00'],
            [$incoming, 'Medicina', '2026-09-26T07:00:00', '2026-09-26T19:00:00'],
        ]);

        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-26&fromUserId={$colleague->id}")->assertStatus(422);
        $this->postJson('/api/v1/staff/handover', ['fromUserId' => $colleague->id, 'shiftDate' => '2026-09-26'])->assertStatus(422);
        $this->assertSame(1, DailyPatientAssignment::query()->where('nurse_user_id', $colleague->id)->count());
    }

    public function test_handover_is_bound_to_the_relieved_shift_boundary_and_date(): void
    {
        $this->hospitalized('ENC-STAFF-11');
        $outgoing = User::factory()->create(['role' => 'enfermera_piso']);
        $incoming = $this->asRole('enfermera_piso');
        $this->assignment('2026-09-26', $outgoing, 'ENC-STAFF-11', 2);
        $this->assignment('2026-09-27', $outgoing, 'ENC-STAFF-12', 2);
        $this->planShifts([
            [$outgoing, 'Medicina', '2026-09-26T07:00:00', '2026-09-26T19:00:00'],
            [$incoming, 'Medicina', '2026-09-26T19:00:00', '2026-09-27T07:00:00'],
        ]);
        $query = "fromUserId={$outgoing->id}";

        // A media jornada no hay relevo: la entrega no procede.
        Carbon::setTestNow('2026-09-26 12:00:00');
        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-26&{$query}")->assertStatus(422);

        // En el cambio de turno, solo la fecha del turno relevado.
        Carbon::setTestNow('2026-09-26 19:10:00');
        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-27&{$query}")->assertStatus(422);
        $this->postJson('/api/v1/staff/handover', ['fromUserId' => $outgoing->id, 'shiftDate' => '2026-09-27'])->assertStatus(422);
        $this->getJson("/api/v1/staff/handover?shiftDate=2026-09-26&{$query}")->assertOk();
        $this->assertSame(2, DailyPatientAssignment::query()->where('nurse_user_id', $outgoing->id)->count());
    }

    public function test_plans_listing_returns_published_months_within_twelve_months_newest_first(): void
    {
        $leader = $this->asRole('jefatura_enfermeria');
        $nurse = User::factory()->create(['role' => 'enfermera_piso']);
        $thisMonth = now()->format('Y-m');
        $lastYear = now()->subMonths(11)->format('Y-m');
        $tooOld = now()->subMonths(14)->format('Y-m');
        foreach ([$tooOld, $lastYear, $thisMonth] as $month) {
            $this->postJson('/api/v1/staff/shift-plans', [
                'yearMonth' => $month,
                'shifts' => [['userId' => $nurse->id, 'startsAt' => "{$month}-05T07:00:00", 'endsAt' => "{$month}-05T19:00:00", 'unit' => 'Medicina']],
            ])->assertCreated();
        }

        $response = $this->getJson('/api/v1/staff/shift-plans')->assertOk();

        $this->assertSame([$thisMonth, $lastYear], collect($response->json('plans'))->pluck('yearMonth')->all());
        $this->assertSame($leader->name, $response->json('plans.0.publishedByName'));
        $this->assertSame(1, $response->json('plans.0.shiftCount'));
        $this->assertSame(1, $response->json('plans.0.staffCount'));
    }

    public function test_republishing_a_month_replaces_it_and_listing_keeps_a_single_row(): void
    {
        $this->asRole('jefatura_enfermeria');
        $nurse = User::factory()->create(['role' => 'enfermera_piso']);
        $other = User::factory()->create(['role' => 'auxiliar_enfermeria']);
        $month = now()->format('Y-m');
        $shift = fn (User $user) => ['userId' => $user->id, 'startsAt' => "{$month}-05T07:00:00", 'endsAt' => "{$month}-05T19:00:00", 'unit' => 'Medicina'];

        $this->postJson('/api/v1/staff/shift-plans', ['yearMonth' => $month, 'shifts' => [$shift($nurse)]])->assertCreated();
        $this->postJson('/api/v1/staff/shift-plans', ['yearMonth' => $month, 'shifts' => [$shift($other), $shift($nurse)]])->assertCreated();

        $plans = $this->getJson('/api/v1/staff/shift-plans')->json('plans');
        $this->assertCount(1, $plans);
        $this->assertSame(2, $plans[0]['shiftCount']);
    }

    public function test_show_plan_includes_names_publisher_and_confirmed_retainers(): void
    {
        $leader = $this->asRole('jefatura_enfermeria');
        $nurse = User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Rosa Quispe']);
        $retainer = User::factory()->create(['role' => 'auxiliar_enfermeria']);
        $this->postJson('/api/v1/staff/shift-plans', [
            'yearMonth' => '2026-09',
            'shifts' => [['userId' => $nurse->id, 'startsAt' => '2026-09-05T07:00:00', 'endsAt' => '2026-09-05T19:00:00', 'unit' => 'Medicina']],
        ])->assertCreated();
        $absence = StaffAbsence::query()->create(['user_id' => $nurse->id, 'shift_date' => '2026-09-09', 'reason' => 'X', 'recorded_by' => $leader->id]);
        $coverage = CoverageRequest::query()->create(['absence_id' => $absence->id, 'status' => 'confirmada']);
        RetainerConfirmation::query()->create(['coverage_request_id' => $coverage->id, 'user_id' => $retainer->id, 'confirmed_at' => now()]);

        $plan = $this->getJson('/api/v1/staff/shift-plans/2026-09')->assertOk()->json('plan');

        $this->assertSame('Rosa Quispe', $plan['shifts'][0]['userName']);
        $this->assertSame('enfermera_piso', $plan['shifts'][0]['userRole']);
        $this->assertSame($leader->name, $plan['publishedByName']);
        $this->assertNotNull($plan['publishedAt']);
        $this->assertSame([['userId' => $retainer->id, 'userName' => $retainer->name, 'date' => '2026-09-09']], $plan['retainers']);
    }

    public function test_plans_listing_is_forbidden_for_non_roster_roles(): void
    {
        $this->asRole('admision');
        $this->getJson('/api/v1/staff/shift-plans')->assertForbidden();
    }
}
