<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\BedReadinessCheck;
use App\Models\CleaningOrder;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RF-74…RF-77 — ciclo de la orden de limpieza (pruebas de transición de estados, ISO/IEC/IEEE 29119).
 *
 * Orden: pendiente → completada → equipada → habilitada.
 * Cama:  cleaning → available (solo al habilitar).
 */
class BedCleaningWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private const CHECKLIST = [
        'superficies' => true,
        'portasuero' => true,
        'colchon' => true,
        'ventilacion' => true,
    ];

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

    private function dirtyBed(string $orderStatus = 'pendiente', string $protocol = 'standard'): array
    {
        $bed = Bed::query()->where('status', 'available')->firstOrFail();
        $bed->update(['status' => 'cleaning']);
        $order = CleaningOrder::query()->create([
            'bed_id' => $bed->id,
            'protocol' => $protocol,
            'status' => $orderStatus,
            'dispatched_at' => now(),
        ]);

        return [$bed, $order];
    }

    // --- RF-75 desinfección -------------------------------------------------------------

    public function test_cleaning_requires_the_full_checklist(): void
    {
        [, $order] = $this->dirtyBed();
        $this->asRole('servicios_generales');

        $this->postJson("/api/v1/beds/cleaning-orders/{$order->id}/complete", [
            'checklist' => ['superficies' => true, 'portasuero' => true, 'colchon' => false, 'ventilacion' => true],
        ])->assertStatus(422);

        $this->assertSame('pendiente', $order->fresh()->status);
    }

    public function test_cleaning_without_checklist_is_rejected(): void
    {
        [, $order] = $this->dirtyBed();
        $this->asRole('servicios_generales');

        $this->postJson("/api/v1/beds/cleaning-orders/{$order->id}/complete")->assertStatus(422);
    }

    public function test_cleaning_completes_and_records_who_and_when(): void
    {
        [, $order] = $this->dirtyBed();
        $user = $this->asRole('servicios_generales');

        $this->postJson("/api/v1/beds/cleaning-orders/{$order->id}/complete", ['checklist' => self::CHECKLIST])
            ->assertOk()
            ->assertJsonPath('order.status', 'completada')
            ->assertJsonPath('order.checklist.colchon', true);

        $fresh = $order->fresh();
        $this->assertSame($user->id, (int) $fresh->disinfected_by);
        $this->assertNotNull($fresh->completed_at);
    }

    public function test_cleaning_cannot_be_completed_twice(): void
    {
        [, $order] = $this->dirtyBed('completada');
        $this->asRole('servicios_generales');

        $this->postJson("/api/v1/beds/cleaning-orders/{$order->id}/complete", ['checklist' => self::CHECKLIST])
            ->assertStatus(422);
    }

    // --- RF-76 habilitación (equipamiento) ---------------------------------------------

    public function test_equip_is_rejected_while_disinfection_is_pending(): void
    {
        [$bed] = $this->dirtyBed('pendiente');
        $this->asRole('auxiliar_enfermeria');

        $this->postJson("/api/v1/beds/{$bed->id}/equip")->assertStatus(422);
        $this->assertSame(0, BedReadinessCheck::query()->count());
    }

    public function test_equip_links_the_check_to_the_order_and_advances_it(): void
    {
        [$bed, $order] = $this->dirtyBed('completada');
        $user = $this->asRole('auxiliar_enfermeria');

        $this->postJson("/api/v1/beds/{$bed->id}/equip")
            ->assertCreated()
            ->assertJsonPath('order.status', 'equipada');

        $this->assertDatabaseHas('bed_readiness_checks', [
            'bed_id' => $bed->id,
            'cleaning_order_id' => $order->id,
        ]);
        $this->assertSame($user->id, (int) $order->fresh()->equipped_by);
    }

    public function test_equip_cannot_be_repeated(): void
    {
        [$bed] = $this->dirtyBed('equipada');
        $this->asRole('auxiliar_enfermeria');

        $this->postJson("/api/v1/beds/{$bed->id}/equip")->assertStatus(422);
    }

    // --- RF-77 disponible --------------------------------------------------------------

    public function test_release_is_rejected_when_unit_is_not_equipped(): void
    {
        [$bed] = $this->dirtyBed('completada');
        $this->asRole('enfermera_supervisora');

        $this->postJson("/api/v1/beds/{$bed->id}/release")->assertStatus(422);
        $this->assertSame('cleaning', $bed->fresh()->status);
    }

    public function test_release_ignores_a_readiness_check_from_a_previous_cycle(): void
    {
        [$bed, $oldOrder] = $this->dirtyBed('habilitada');
        BedReadinessCheck::query()->create([
            'bed_id' => $bed->id,
            'cleaning_order_id' => $oldOrder->id,
            'linen_ok' => true,
            'supplies_ok' => true,
            'confirmed_at' => now()->subDay(),
        ]);
        // nuevo egreso → nueva orden sucia sobre la misma cama
        CleaningOrder::query()->create([
            'bed_id' => $bed->id,
            'protocol' => 'standard',
            'status' => 'pendiente',
            'dispatched_at' => now(),
        ]);
        $this->asRole('enfermera_supervisora');

        $this->postJson("/api/v1/beds/{$bed->id}/release")->assertStatus(422);
        $this->assertSame('cleaning', $bed->fresh()->status);
    }

    public function test_release_enables_the_bed_and_closes_the_order(): void
    {
        [$bed, $order] = $this->dirtyBed('equipada');
        BedReadinessCheck::query()->create([
            'bed_id' => $bed->id,
            'cleaning_order_id' => $order->id,
            'linen_ok' => true,
            'supplies_ok' => true,
            'confirmed_at' => now(),
        ]);
        $user = $this->asRole('enfermera_supervisora');

        $this->postJson("/api/v1/beds/{$bed->id}/release")
            ->assertOk()
            ->assertJsonPath('bed.status', 'available')
            ->assertJsonPath('order.status', 'habilitada');

        $fresh = $order->fresh();
        $this->assertSame('habilitada', $fresh->status);
        $this->assertSame($user->id, (int) $fresh->enabled_by);
        $this->assertNotNull($fresh->enabled_at);
    }

    public function test_release_is_rejected_when_bed_is_not_in_cleaning(): void
    {
        $bed = Bed::query()->where('status', 'available')->firstOrFail();
        CleaningOrder::query()->create([
            'bed_id' => $bed->id,
            'protocol' => 'standard',
            'status' => 'equipada',
            'dispatched_at' => now(),
        ]);
        $this->asRole('enfermera_supervisora');

        $this->postJson("/api/v1/beds/{$bed->id}/release")->assertStatus(422);
    }

    // --- Lectura para la pizarra --------------------------------------------------------

    public function test_cleaning_orders_expose_what_the_board_needs(): void
    {
        [$bed] = $this->dirtyBed('pendiente', 'deep');
        $this->asRole('servicios_generales');

        $this->getJson('/api/v1/beds/cleaning-orders')
            ->assertOk()
            ->assertJsonPath('orders.0.bedId', $bed->id)
            ->assertJsonPath('orders.0.protocol', 'deep')
            ->assertJsonStructure(['orders' => [[
                'id', 'bedId', 'room', 'bedCode', 'ward', 'protocol', 'status',
                'isolation', 'dispatchedAt', 'checklist',
            ]]]);
    }

    // --- Mínimo privilegio (ISO/IEC 27001) ----------------------------------------------

    public function test_each_step_is_restricted_to_its_role(): void
    {
        [$bed, $order] = $this->dirtyBed('pendiente');

        $this->asRole('auxiliar_enfermeria');
        $this->postJson("/api/v1/beds/cleaning-orders/{$order->id}/complete", ['checklist' => self::CHECKLIST])
            ->assertForbidden();

        $this->asRole('servicios_generales');
        $this->postJson("/api/v1/beds/{$bed->id}/equip")->assertForbidden();
        $this->postJson("/api/v1/beds/{$bed->id}/release")->assertForbidden();

        $this->asRole('enfermera_supervisora');
        $this->postJson("/api/v1/beds/{$bed->id}/equip")->assertForbidden();
    }
}
