<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\Bed;
use App\Models\BedAssignment;
use App\Models\BedRequest;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RF-68, RF-70, RF-71, RF-72, RF-73 — solicitud, compatibilidad, asignación y notificación.
 *
 * Catálogo sembrado (CatalogSeeder):
 *   101-A/B mixed (medicina_interna) · 102-A female (medicina_interna)
 *   201-A male (cirugia) · 201-B male + aislamiento (blocked) · 202-A mixed (limpieza)
 */
class BedAssignmentFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    private function bed(string $room, string $code): Bed
    {
        return Bed::query()->where('room', $room)->where('bed_code', $code)->firstOrFail();
    }

    /** @param array<string, mixed> $overrides */
    private function request(array $overrides = []): int
    {
        return (int) $this->postJson('/api/v1/beds/requests', array_merge([
            'source' => 'urgencias',
            'priority' => 'alta',
            'specialty' => 'medicina_interna',
            'gender' => 'female',
            'isolation' => false,
            'patientName' => 'Paciente de prueba',
        ], $overrides))->assertCreated()->json('request.id');
    }

    private function encounter(string $id, string $name, string $step = 'cerrado', string $doc = '70000001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $id,
            'order_number' => 'OI-'.$id,
            'source' => 'manual',
            'patient_name' => $name,
            'document_type' => 'DNI',
            'document_number' => $doc,
            'origin_service' => 'Urgencias',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'service' => 'Medicina',
            'current_step' => $step,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    // --- RF-68 solicitud ---------------------------------------------------------------

    public function test_request_requires_a_patient_reference(): void
    {
        $this->asRole('gestion_camas');

        $this->postJson('/api/v1/beds/requests', [
            'source' => 'urgencias',
            'priority' => 'alta',
        ])->assertStatus(422)->assertJsonValidationErrors(['patientName']);
    }

    public function test_request_stores_isolation_type_and_equipment(): void
    {
        $this->asRole('gestion_camas');

        $this->postJson('/api/v1/beds/requests', [
            'source' => 'quirofano',
            'priority' => 'media',
            'patientName' => 'Con aislamiento',
            'isolationType' => 'respiratorio',
            'equipment' => ['oxigeno_central', 'monitor'],
        ])->assertCreated()
            ->assertJsonPath('request.isolation', true)
            ->assertJsonPath('request.isolationType', 'respiratorio')
            ->assertJsonPath('request.equipment', ['oxigeno_central', 'monitor']);
    }

    public function test_request_rejects_unknown_isolation_type_and_equipment(): void
    {
        $this->asRole('gestion_camas');

        $this->postJson('/api/v1/beds/requests', [
            'source' => 'urgencias',
            'priority' => 'alta',
            'patientName' => 'X',
            'isolationType' => 'inventado',
            'equipment' => ['helicoptero'],
        ])->assertStatus(422)->assertJsonValidationErrors(['isolationType', 'equipment.0']);
    }

    public function test_request_derives_name_and_gender_from_the_encounter(): void
    {
        $this->encounter('ENC-B-1', 'Ana Quispe', 'cerrado', '70000010');
        Patient::query()->create([
            'document_type' => 'DNI',
            'document_number' => '70000010',
            'full_name' => 'Ana Quispe',
            'sex' => 'Femenino',
        ]);
        $this->asRole('gestion_camas');

        $this->postJson('/api/v1/beds/requests', [
            'source' => 'admisiones',
            'priority' => 'media',
            'encounterId' => 'ENC-B-1',
        ])->assertCreated()
            ->assertJsonPath('request.patientName', 'Ana Quispe')
            ->assertJsonPath('request.gender', 'female');
    }

    // --- RF-70 lista de espera ------------------------------------------------------------

    public function test_requests_can_be_filtered_by_several_statuses(): void
    {
        $this->asRole('gestion_camas');
        $assignedId = $this->request(['patientName' => 'Asignada']);
        $this->request(['patientName' => 'Pendiente']);
        BedRequest::query()->whereKey($assignedId)->update(['status' => 'asignada']);

        $names = collect($this->getJson('/api/v1/beds/requests?status=pendiente,en_espera')
            ->assertOk()->json('requests'))->pluck('patientName');

        $this->assertSame(['Pendiente'], $names->all());
    }

    // --- RF-72 compatibilidad ---------------------------------------------------------------

    public function test_assign_rejects_a_conventional_bed_for_an_isolation_request(): void
    {
        $this->bed('201', 'B')->update(['status' => 'available']);
        $this->asRole('gestion_camas');
        $requestId = $this->request([
            'specialty' => 'cirugia', 'gender' => 'male', 'isolationType' => 'contacto',
        ]);
        $incompatible = $this->bed('201', 'A');

        $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $incompatible->id])
            ->assertStatus(422);

        $this->assertSame('available', $incompatible->fresh()->status);
        $this->assertSame(0, BedAssignment::query()->count());
        $this->assertSame('pendiente', BedRequest::query()->findOrFail($requestId)->status);
    }

    public function test_assign_rejects_a_bed_of_another_specialty(): void
    {
        $this->asRole('gestion_camas');
        $requestId = $this->request(['specialty' => 'cirugia', 'gender' => 'male']);

        $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $this->bed('101', 'A')->id])
            ->assertStatus(422);
    }

    public function test_assign_rejects_a_bed_with_a_gender_policy_mismatch(): void
    {
        $this->asRole('gestion_camas');
        $requestId = $this->request(['specialty' => 'cirugia', 'gender' => 'female']);

        $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $this->bed('201', 'A')->id])
            ->assertStatus(422);
    }

    public function test_assign_accepts_a_compatible_bed_and_updates_the_encounter(): void
    {
        $this->encounter('ENC-B-2', 'Lucía Ramos', 'cerrado', '70000020');
        $this->asRole('gestion_camas');
        $requestId = $this->request(['encounterId' => 'ENC-B-2', 'patientName' => 'Lucía Ramos']);
        $bed = $this->bed('102', 'A');

        $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $bed->id])
            ->assertCreated()
            ->assertJsonPath('assignment.bedId', $bed->id);

        $this->assertSame('occupied', $bed->fresh()->status);
        $this->assertSame('asignada', BedRequest::query()->findOrFail($requestId)->status);
        $this->assertDatabaseHas('admission_encounters', ['encounter_id' => 'ENC-B-2', 'bed' => 'A', 'room' => '102']);
    }

    public function test_an_assigned_request_cannot_be_assigned_again(): void
    {
        $this->asRole('gestion_camas');
        $requestId = $this->request();
        $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $this->bed('102', 'A')->id])
            ->assertCreated();

        $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $this->bed('101', 'A')->id])
            ->assertStatus(422);
    }

    public function test_assignment_is_atomic(): void
    {
        $this->withoutExceptionHandling();
        $this->asRole('gestion_camas');
        $requestId = $this->request();
        $bed = $this->bed('102', 'A');
        BedAssignment::creating(function () {
            throw new \RuntimeException('fallo simulado');
        });

        try {
            $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $bed->id]);
            $this->fail('Se esperaba la excepción simulada.');
        } catch (\RuntimeException) {
            // esperado
        }

        $this->assertSame('available', $bed->fresh()->status);
        $this->assertSame('pendiente', BedRequest::query()->findOrFail($requestId)->status);
    }

    // --- RF-73 notificación a la supervisora ----------------------------------------------------

    public function test_assignment_notifies_the_supervisor_who_can_acknowledge_it(): void
    {
        $this->asRole('gestion_camas');
        $requestId = $this->request(['patientName' => 'Notificada']);
        $this->postJson("/api/v1/beds/requests/{$requestId}/assign", ['bedId' => $this->bed('102', 'A')->id])
            ->assertCreated();

        $this->asRole('enfermera_supervisora');
        $list = $this->getJson('/api/v1/beds/assignments/notifications')
            ->assertOk()
            ->assertJsonPath('notifications.0.patientName', 'Notificada')
            ->assertJsonPath('notifications.0.room', '102')
            ->assertJsonPath('notifications.0.bedCode', 'A')
            ->json('notifications');

        $this->postJson("/api/v1/beds/assignments/{$list[0]['id']}/acknowledge")->assertOk();

        $this->getJson('/api/v1/beds/assignments/notifications')
            ->assertOk()
            ->assertJsonCount(0, 'notifications');
    }

    public function test_only_the_supervisor_reads_assignment_notifications(): void
    {
        $this->asRole('gestion_camas');
        $this->getJson('/api/v1/beds/assignments/notifications')->assertForbidden();
        $this->postJson('/api/v1/beds/assignments/1/acknowledge')->assertForbidden();
    }

    // --- Censo con ocupante (diseño: cama ocupada muestra al paciente) --------------------------

    public function test_census_exposes_the_occupant_of_an_occupied_bed(): void
    {
        $this->encounter('ENC-OC-1', 'Carlos Ramírez', 'cerrado', '70000061');
        $bed = $this->bed('101', 'A');
        $bed->update(['status' => 'occupied']);
        BedAssignment::query()->create([
            'bed_id' => $bed->id,
            'encounter_id' => 'ENC-OC-1',
            'assigned_at' => now()->subDays(2),
        ]);
        $this->asRole('enfermera_supervisora');

        $beds = collect($this->getJson('/api/v1/beds/census')->assertOk()->json('wards'))
            ->flatMap(fn (array $ward) => $ward['beds']);

        $occupied = $beds->firstWhere('id', $bed->id);
        $this->assertSame('ENC-OC-1', $occupied['occupant']['encounterId']);
        $this->assertSame('Carlos Ramírez', $occupied['occupant']['patientName']);
        $this->assertNotNull($occupied['occupant']['since']);

        $free = $beds->firstWhere('id', $this->bed('101', 'B')->id);
        $this->assertNull($free['occupant']);
    }

    // --- Selector de pacientes -------------------------------------------------------------------

    public function test_patient_lookup_lists_open_encounters_without_a_bed(): void
    {
        $this->encounter('ENC-P-1', 'Ana Quispe', 'cerrado', '70000031');
        $this->encounter('ENC-P-2', 'Egresado Uno', 'egresado', '70000032');
        $this->encounter('ENC-P-3', 'Con Cama', 'cerrado', '70000033');
        BedAssignment::query()->create([
            'bed_id' => $this->bed('101', 'A')->id,
            'encounter_id' => 'ENC-P-3',
            'assigned_at' => now(),
        ]);
        Patient::query()->create([
            'document_type' => 'DNI', 'document_number' => '70000031', 'full_name' => 'Ana Quispe', 'sex' => 'F',
        ]);
        $this->asRole('gestion_camas');

        $patients = $this->getJson('/api/v1/beds/patients')->assertOk()->json('patients');

        $this->assertCount(1, $patients);
        $this->assertSame('ENC-P-1', $patients[0]['encounterId']);
        $this->assertSame('Ana Quispe', $patients[0]['patientName']);
        $this->assertSame('female', $patients[0]['gender']);
    }

    public function test_patient_lookup_filters_by_name_or_document(): void
    {
        $this->encounter('ENC-P-4', 'Carlos Ramírez', 'cerrado', '70000041');
        $this->encounter('ENC-P-5', 'María Quispe', 'cerrado', '70000042');
        $this->asRole('gestion_camas');

        $byName = $this->getJson('/api/v1/beds/patients?query=Carlos')->assertOk()->json('patients');
        $byDoc = $this->getJson('/api/v1/beds/patients?query=70000042')->assertOk()->json('patients');

        $this->assertSame(['ENC-P-4'], array_column($byName, 'encounterId'));
        $this->assertSame(['ENC-P-5'], array_column($byDoc, 'encounterId'));
    }

    public function test_patient_lookup_is_restricted_to_bed_management(): void
    {
        $this->asRole('enfermera_piso');
        $this->getJson('/api/v1/beds/patients')->assertForbidden();
    }

    // --- RF-71 proyecciones ----------------------------------------------------------------------

    public function test_projections_are_listed_for_supervisor_and_bed_management(): void
    {
        $this->encounter('ENC-PR-1', 'Proyectado', 'cerrado', '70000051');
        $this->asRole('enfermera_supervisora');
        $this->postJson('/api/v1/beds/projections', [
            'encounterId' => 'ENC-PR-1',
            'projectedAt' => now()->addHours(5)->toIso8601String(),
        ])->assertCreated();

        $this->getJson('/api/v1/beds/projections')
            ->assertOk()
            ->assertJsonPath('projections.0.encounterId', 'ENC-PR-1')
            ->assertJsonPath('projections.0.patientName', 'Proyectado');

        $this->asRole('gestion_camas');
        $this->getJson('/api/v1/beds/projections')->assertOk()->assertJsonCount(1, 'projections');

        $this->asRole('servicios_generales');
        $this->getJson('/api/v1/beds/projections')->assertForbidden();
    }

    public function test_projection_rejects_a_past_date(): void
    {
        $this->asRole('enfermera_supervisora');

        $this->postJson('/api/v1/beds/projections', [
            'encounterId' => 'ENC-PR-2',
            'projectedAt' => now()->subDay()->toIso8601String(),
        ])->assertStatus(422)->assertJsonValidationErrors(['projectedAt']);
    }
}
