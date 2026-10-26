<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\BedAssignment;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BedInfrastructureApiTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/v1/bed-infrastructure';

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    private function ward(string $code = 'MED-A'): Ward
    {
        return Ward::query()->create(['code' => $code, 'name' => 'Medicina Interna', 'specialty' => 'medicina_interna']);
    }

    private function bed(Ward $ward, string $room = '101', string $code = 'A', string $status = 'available'): Bed
    {
        return Bed::query()->create([
            'ward_id' => $ward->id, 'room' => $room, 'bed_code' => $code,
            'gender_policy' => 'mixed', 'isolation' => false, 'status' => $status,
        ]);
    }

    public function test_solo_el_administrador_de_accesos_configura_la_infraestructura(): void
    {
        foreach (['gestion_camas', 'enfermera_supervisora', 'admision'] as $role) {
            $this->asRole($role);
            $this->getJson(self::BASE.'/wards')->assertForbidden();
        }

        $this->asRole('administrador_accesos');
        $this->getJson(self::BASE.'/wards')->assertOk()->assertJsonPath('wards', []);
    }

    public function test_el_administrador_crea_un_pabellon_y_una_cama_con_auditoria(): void
    {
        $admin = $this->asRole('administrador_accesos');

        $wardId = $this->postJson(self::BASE.'/wards', [
            'code' => 'UCI-C', 'name' => 'Cuidados intensivos', 'specialty' => 'cuidados_intensivos',
        ])->assertCreated()->assertJsonPath('ward.code', 'UCI-C')->json('ward.id');

        $this->postJson(self::BASE.'/beds', [
            'wardId' => $wardId, 'room' => '501', 'bedCode' => 'A', 'genderPolicy' => 'female', 'isolation' => true,
        ])->assertCreated()
            ->assertJsonPath('bed.room', '501')
            ->assertJsonPath('bed.genderPolicy', 'female')
            ->assertJsonPath('bed.isolation', true)
            ->assertJsonPath('bed.active', true)
            ->assertJsonPath('bed.status', 'available');

        $this->assertDatabaseHas('bed_infrastructure_changes', ['user_id' => $admin->id, 'action' => 'ward.created']);
        $this->assertDatabaseHas('bed_infrastructure_changes', ['user_id' => $admin->id, 'action' => 'bed.created']);
    }

    public function test_rechaza_datos_invalidos_y_camas_duplicadas(): void
    {
        $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $this->bed($ward);

        $this->postJson(self::BASE.'/wards', ['code' => 'MED-A', 'name' => 'Otra', 'specialty' => 'x'])
            ->assertUnprocessable()->assertJsonValidationErrors(['code']);
        $this->postJson(self::BASE.'/beds', ['wardId' => $ward->id, 'room' => '101', 'bedCode' => 'A', 'genderPolicy' => 'mixed'])
            ->assertUnprocessable();
        $this->postJson(self::BASE.'/beds', ['wardId' => $ward->id, 'room' => '102', 'bedCode' => 'A', 'genderPolicy' => 'otro'])
            ->assertUnprocessable()->assertJsonValidationErrors(['genderPolicy']);
        $this->postJson(self::BASE.'/beds', ['wardId' => 9999, 'room' => '102', 'bedCode' => 'A', 'genderPolicy' => 'mixed'])
            ->assertUnprocessable()->assertJsonValidationErrors(['wardId']);
    }

    public function test_una_cama_desactivada_no_se_ofrece_ni_se_asigna_y_se_puede_reactivar(): void
    {
        $this->asRole('administrador_accesos');
        $bed = $this->bed($this->ward());

        $this->patchJson(self::BASE.'/beds/'.$bed->id, ['active' => false])
            ->assertOk()->assertJsonPath('bed.active', false);

        $this->asRole('gestion_camas');
        $this->getJson('/api/v1/beds/available')->assertOk()->assertJsonPath('count', 0);
        $census = $this->getJson('/api/v1/beds/census')->assertOk();
        $this->assertSame([], $census->json('wards.0.beds'));

        $this->asRole('administrador_accesos');
        $this->patchJson(self::BASE.'/beds/'.$bed->id, ['active' => true])->assertOk();
        $this->asRole('gestion_camas');
        $this->getJson('/api/v1/beds/available')->assertJsonPath('count', 1);
    }

    public function test_no_se_desactiva_ni_se_borra_una_cama_ocupada_o_en_limpieza(): void
    {
        $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $occupied = $this->bed($ward, '101', 'A', 'occupied');
        $cleaning = $this->bed($ward, '101', 'B', 'cleaning');

        foreach ([$occupied, $cleaning] as $bed) {
            $this->patchJson(self::BASE.'/beds/'.$bed->id, ['active' => false])->assertUnprocessable();
            $this->deleteJson(self::BASE.'/beds/'.$bed->id)->assertUnprocessable();
            $this->assertNotNull(Bed::query()->find($bed->id));
        }
    }

    public function test_borrar_una_cama_conserva_el_historial_y_oculta_la_cama(): void
    {
        $admin = $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $bed = $this->bed($ward);
        BedAssignment::query()->create([
            'bed_id' => $bed->id, 'encounter_id' => 'ENC-0001',
            'assigned_at' => now()->subDay(), 'released_at' => now()->subHour(),
        ]);

        $this->deleteJson(self::BASE.'/beds/'.$bed->id)->assertOk();

        $this->assertNull(Bed::query()->find($bed->id));
        $this->assertNotNull(Bed::withTrashed()->find($bed->id)->deleted_at);
        $this->assertDatabaseHas('bed_assignments', ['bed_id' => $bed->id, 'encounter_id' => 'ENC-0001']);
        $this->assertDatabaseHas('bed_infrastructure_changes', ['user_id' => $admin->id, 'action' => 'bed.deleted']);

        $this->getJson(self::BASE.'/wards')->assertJsonPath('wards.0.beds', []);
        $this->asRole('gestion_camas');
        $this->getJson('/api/v1/beds/available')->assertJsonPath('count', 0);
    }

    public function test_crear_una_cama_borrada_con_el_mismo_codigo_la_restaura(): void
    {
        $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $bed = $this->bed($ward);
        $this->deleteJson(self::BASE.'/beds/'.$bed->id)->assertOk();

        $this->postJson(self::BASE.'/beds', [
            'wardId' => $ward->id, 'room' => '101', 'bedCode' => 'A', 'genderPolicy' => 'male', 'isolation' => false,
        ])->assertCreated()->assertJsonPath('bed.id', $bed->id)->assertJsonPath('bed.genderPolicy', 'male');

        $this->assertSame(1, Bed::query()->count());
    }

    public function test_borrar_un_pabellon_oculta_sus_camas_salvo_que_haya_ocupadas(): void
    {
        $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $busy = $this->bed($ward, '101', 'A', 'occupied');
        $this->bed($ward, '101', 'B');

        $this->deleteJson(self::BASE.'/wards/'.$ward->id)->assertUnprocessable();
        $this->assertNotNull(Ward::query()->find($ward->id));

        $busy->update(['status' => 'available']);
        $this->deleteJson(self::BASE.'/wards/'.$ward->id)->assertOk();
        $this->assertNull(Ward::query()->find($ward->id));
        $this->assertSame(0, Bed::query()->count());
        $this->assertSame(2, Bed::withTrashed()->count());
    }

    public function test_alta_en_lote_con_vista_previa_y_sin_duplicar(): void
    {
        $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $payload = [
            'wardId' => $ward->id, 'roomFrom' => 301, 'roomTo' => 303, 'bedsPerRoom' => 2,
            'genderPolicy' => 'mixed', 'isolation' => false,
        ];

        $preview = $this->postJson(self::BASE.'/beds/bulk/preview', $payload)->assertOk();
        $this->assertSame(6, $preview->json('total'));
        $this->assertSame(0, $preview->json('existing'));
        $this->assertSame(['301-A', '301-B', '302-A'], array_slice(array_column($preview->json('beds'), 'label'), 0, 3));
        $this->assertSame(0, Bed::query()->count());

        $this->postJson(self::BASE.'/beds/bulk', $payload)->assertCreated()
            ->assertJsonPath('created', 6)->assertJsonPath('skipped', 0);
        $this->assertSame(6, Bed::query()->count());

        $this->postJson(self::BASE.'/beds/bulk', $payload)->assertCreated()
            ->assertJsonPath('created', 0)->assertJsonPath('skipped', 6);
        $this->assertSame(6, Bed::query()->count());
    }

    public function test_alta_en_lote_valida_rango_y_tope(): void
    {
        $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $base = ['wardId' => $ward->id, 'bedsPerRoom' => 2, 'genderPolicy' => 'mixed', 'isolation' => false];

        $this->postJson(self::BASE.'/beds/bulk', $base + ['roomFrom' => 310, 'roomTo' => 301])
            ->assertUnprocessable()->assertJsonValidationErrors(['roomTo']);
        $this->postJson(self::BASE.'/beds/bulk', ['bedsPerRoom' => 9, 'roomFrom' => 1, 'roomTo' => 2] + $base)
            ->assertUnprocessable()->assertJsonValidationErrors(['bedsPerRoom']);
        $this->postJson(self::BASE.'/beds/bulk', $base + ['roomFrom' => 1, 'roomTo' => 150])
            ->assertUnprocessable();
        $this->assertSame(0, Bed::query()->count());
    }

    public function test_editar_pabellon_y_desactivarlo_oculta_sus_camas_de_la_asignacion(): void
    {
        $this->asRole('administrador_accesos');
        $ward = $this->ward();
        $this->bed($ward);

        $this->patchJson(self::BASE.'/wards/'.$ward->id, ['name' => 'Medicina Interna Norte', 'active' => false])
            ->assertOk()->assertJsonPath('ward.name', 'Medicina Interna Norte')->assertJsonPath('ward.active', false);

        $this->asRole('gestion_camas');
        $this->getJson('/api/v1/beds/available')->assertJsonPath('count', 0);
    }
}
