<?php

namespace Tests\Feature;

use App\Events\PatientExited;
use App\Models\AdmissionEncounter;
use App\Models\Bed;
use App\Models\BedAssignment;
use App\Models\CleaningOrder;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BedManagementApiTest extends TestCase
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

    public function test_census_shows_beds_by_ward(): void
    {
        $this->asRole('gestion_camas');

        $this->getJson('/api/v1/beds/census')
            ->assertOk()
            ->assertJsonPath('wards.1.code', 'MED-A')
            ->assertJsonStructure(['wards' => [['beds' => [['status']]]]]);
    }

    public function test_request_without_availability_goes_to_prioritized_waitlist(): void
    {
        Bed::query()->update(['status' => 'occupied']);
        $this->asRole('gestion_camas');

        $this->postJson('/api/v1/beds/requests', [
            'source' => 'urgencias',
            'priority' => 'critica',
            'specialty' => 'medicina_interna',
            'gender' => 'female',
            'isolation' => false,
            'patientName' => 'Paciente en espera',
        ])->assertCreated()
            ->assertJsonPath('request.status', 'en_espera');

        $this->getJson('/api/v1/beds/requests?status=en_espera')
            ->assertOk()
            ->assertJsonPath('requests.0.priority', 'critica');
    }

    public function test_suggests_isolation_room_and_assigns_it(): void
    {
        $bed = Bed::query()->where('isolation', true)->firstOrFail();
        $bed->update(['status' => 'available']);
        $this->asRole('gestion_camas');

        $created = $this->postJson('/api/v1/beds/requests', [
            'source' => 'admisiones',
            'priority' => 'alta',
            'specialty' => 'cirugia',
            'gender' => 'male',
            'isolation' => true,
            'patientName' => 'Paciente aislamiento',
            'encounterId' => 'ENC-CAMA-0001',
        ])->assertCreated();

        $id = $created->json('request.id');
        $this->getJson("/api/v1/beds/requests/{$id}/suggestions")
            ->assertOk()
            ->assertJsonPath('suggestions.0.isolation', true);

        $this->postJson("/api/v1/beds/requests/{$id}/assign", [
            'bedId' => $bed->id,
        ])->assertCreated()
            ->assertJsonPath('assignment.bedId', $bed->id);

        $this->assertSame('occupied', $bed->fresh()->status);
    }

    public function test_exit_dispatches_cleaning_then_unit_becomes_available(): void
    {
        $bed = Bed::query()->where('isolation', false)->where('status', 'available')->firstOrFail();
        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-CAMA-0002',
            'order_number' => 'OI-CAMA-2',
            'source' => 'manual',
            'patient_name' => 'Egreso de cama',
            'document_type' => 'DNI',
            'document_number' => '44556677',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => $bed->room,
            'bed' => $bed->bed_code,
            'service' => 'Medicina',
            'current_step' => 'egresado',
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
        $bed->update(['status' => 'occupied']);
        BedAssignment::query()->create([
            'bed_id' => $bed->id,
            'encounter_id' => 'ENC-CAMA-0002',
            'assigned_at' => now(),
        ]);

        PatientExited::dispatch('ENC-CAMA-0002');

        $this->assertDatabaseHas('cleaning_orders', [
            'bed_id' => $bed->id,
            'protocol' => 'standard',
            'status' => 'pendiente',
        ]);
        $this->assertSame('cleaning', $bed->fresh()->status);

        $order = CleaningOrder::query()->where('bed_id', $bed->id)->firstOrFail();
        $this->asRole('servicios_generales');
        $this->postJson("/api/v1/beds/cleaning-orders/{$order->id}/complete", [
            'checklist' => ['superficies' => true, 'portasuero' => true, 'colchon' => true, 'ventilacion' => true],
        ])->assertOk()
            ->assertJsonPath('order.status', 'completada');

        $this->asRole('auxiliar_enfermeria');
        $this->postJson("/api/v1/beds/{$bed->id}/equip")
            ->assertCreated();

        $this->asRole('enfermera_supervisora');
        $this->postJson("/api/v1/beds/{$bed->id}/release")
            ->assertOk()
            ->assertJsonPath('bed.status', 'available');
    }

    public function test_supervisor_registers_discharge_projection(): void
    {
        $this->asRole('enfermera_supervisora');
        $this->postJson('/api/v1/beds/projections', [
            'encounterId' => 'ENC-CAMA-0003',
            'projectedAt' => now()->addHours(6)->toIso8601String(),
        ])->assertCreated()
            ->assertJsonPath('projection.encounterId', 'ENC-CAMA-0003');
    }

    public function test_floor_nurse_lists_available_beds(): void
    {
        $this->asRole('enfermera_piso');

        $payload = $this->getJson('/api/v1/beds/available')
            ->assertOk()
            ->assertJsonStructure(['count', 'beds' => [['id', 'room', 'bedCode', 'status']]])
            ->json();

        $this->assertGreaterThan(0, $payload['count']);
        foreach ($payload['beds'] as $bed) {
            $this->assertSame('available', $bed['status']);
        }
    }

    public function test_admission_cannot_list_available_beds(): void
    {
        $this->asRole('admision');
        $this->getJson('/api/v1/beds/available')->assertForbidden();
    }

    public function test_unrelated_role_cannot_see_census(): void
    {
        $this->asRole('admision');
        $this->getJson('/api/v1/beds/census')->assertForbidden();
    }

    public function test_waitlist_orders_critical_first(): void
    {
        Bed::query()->update(['status' => 'occupied']);
        $this->asRole('gestion_camas');
        $this->postJson('/api/v1/beds/requests', [
            'source' => 'quirofano',
            'priority' => 'baja',
            'specialty' => 'cirugia',
            'gender' => 'male',
            'isolation' => false,
            'patientName' => 'Baja',
        ])->assertCreated();
        $this->postJson('/api/v1/beds/requests', [
            'source' => 'urgencias',
            'priority' => 'critica',
            'specialty' => 'medicina_interna',
            'gender' => 'female',
            'isolation' => false,
            'patientName' => 'Crítica',
        ])->assertCreated();

        $this->getJson('/api/v1/beds/requests?status=en_espera')
            ->assertOk()
            ->assertJsonPath('requests.0.patientName', 'Crítica');
    }
}
