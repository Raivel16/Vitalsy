<?php

namespace Tests\Feature;

use App\Exceptions\ClinicalRuleException;
use App\Models\User;
use App\Services\Users\UserAdministration;
use App\Support\RoleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UserAdminApiTest extends TestCase
{
    private const NUEVO_VITALSY_LOCAL = 'nuevo@vitalsy.local';

    private const USERS = '/api/v1/users';

    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create(['name' => 'Admin Accesos', 'email' => 'admin.accesos@vitalsy.local', 'role' => 'administrador_accesos']);
        $this->actingAs($user);

        return $user;
    }

    public function test_catalog_includes_access_administrator_role(): void
    {
        $this->assertTrue(RoleCatalog::has('administrador_accesos'));
        $this->assertCount(15, RoleCatalog::all());
    }

    public function test_admin_lists_accounts_without_secrets(): void
    {
        $this->admin();
        User::factory()->create(['name' => 'Rosa Quispe', 'role' => 'enfermera_piso', 'email' => 'rosa@vitalsy.local']);

        $response = $this->getJson(self::USERS)->assertOk();

        $response->assertJsonStructure(['data' => [['id', 'name', 'email', 'role', 'roleLabel', 'isActive']]]);
        $this->assertStringNotContainsString('password', $response->getContent());
        $this->assertStringNotContainsString('remember_token', $response->getContent());
    }

    public function test_admin_searches_and_filters_by_status(): void
    {
        $this->admin();
        User::factory()->create(['name' => 'Rosa Quispe', 'email' => 'rquispe@vitalsy.local', 'role' => 'enfermera_piso']);
        User::factory()->create(['name' => 'Pedro Inactivo', 'email' => 'pinactivo@vitalsy.local', 'role' => 'camillero', 'is_active' => false]);

        $this->getJson('/api/v1/users?search=rosa')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/users?status=inactive')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Pedro Inactivo');
        $this->getJson('/api/v1/users?status=active')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_admin_creates_account_with_temporary_password(): void
    {
        $this->admin();

        $response = $this->postJson(self::USERS, [
            'name' => 'Lucía Mendoza',
            'email' => 'Lucia@Vitalsy.local',
            'role' => 'enfermera_piso',
        ])->assertCreated();

        $response->assertJsonPath('user.email', 'lucia@vitalsy.local')
            ->assertJsonPath('user.role', 'enfermera_piso')
            ->assertJsonPath('user.mustChangePassword', true);
        $this->assertGreaterThanOrEqual(12, strlen($response->json('temporaryPassword')));

        $created = User::query()->where('email', 'lucia@vitalsy.local')->firstOrFail();
        $this->assertTrue((bool) $created->must_change_password);
        $this->assertTrue(\Hash::check($response->json('temporaryPassword'), $created->password));
        $this->assertSame(1, DB::table('access_audit_logs')->where('action', 'user.created')->count());
    }

    public function test_create_rejects_duplicate_email_invalid_role_and_empty_fields(): void
    {
        $this->admin();
        User::factory()->create(['email' => 'dup@vitalsy.local']);

        $this->postJson(self::USERS, ['name' => 'X', 'email' => 'dup@vitalsy.local', 'role' => 'camillero'])
            ->assertStatus(422);
        $this->postJson(self::USERS, ['name' => 'X', 'email' => self::NUEVO_VITALSY_LOCAL, 'role' => 'inexistente'])
            ->assertStatus(422);
        $this->postJson(self::USERS, [])->assertStatus(422);
    }

    public function test_admin_updates_name_email_and_role_with_audit(): void
    {
        $this->admin();
        $target = User::factory()->create(['role' => 'camillero', 'email' => 'viejo@vitalsy.local']);

        $this->patchJson("/api/v1/users/{$target->id}", [
            'name' => 'Nombre Nuevo',
            'email' => self::NUEVO_VITALSY_LOCAL,
            'role' => 'auxiliar_enfermeria',
        ])->assertOk()->assertJsonPath('user.role', 'auxiliar_enfermeria');

        $this->assertSame(self::NUEVO_VITALSY_LOCAL, $target->fresh()->email);
        $this->assertSame(1, DB::table('access_audit_logs')->where('action', 'user.updated')->count());
    }

    public function test_update_keeps_email_unique_and_returns_404_for_unknown_user(): void
    {
        $this->admin();
        User::factory()->create(['email' => 'ocupado@vitalsy.local']);
        $target = User::factory()->create(['role' => 'camillero']);

        $this->patchJson("/api/v1/users/{$target->id}", ['email' => 'ocupado@vitalsy.local'])->assertStatus(422);
        $this->patchJson('/api/v1/users/999999', ['name' => 'Nadie'])->assertNotFound();
    }

    public function test_deactivation_blocks_login_and_existing_session_without_deleting(): void
    {
        $this->admin();
        $target = User::factory()->create(['role' => 'camillero', 'email' => 'baja@vitalsy.local', 'password' => 'clave_de_prueba']);

        $this->postJson("/api/v1/users/{$target->id}/deactivate")
            ->assertOk()->assertJsonPath('user.isActive', false);

        $target->refresh();
        $this->assertFalse($target->is_active);
        $this->assertNotNull($target->deactivated_at);
        $this->assertDatabaseHas('users', ['id' => $target->id]);
        $this->assertSame(1, DB::table('access_audit_logs')->where('action', 'user.deactivated')->count());

        $this->actingAs($target)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_admin_cannot_deactivate_self_or_last_administrator(): void
    {
        $admin = $this->admin();

        $this->postJson("/api/v1/users/{$admin->id}/deactivate")->assertStatus(422);

        $other = User::factory()->create(['role' => 'administrador_accesos']);
        $this->postJson("/api/v1/users/{$other->id}/deactivate")->assertOk();

        $last = User::factory()->create(['role' => 'administrador_accesos']);
        $this->actingAs($other->fresh());
        // Un administrador inactivo ya no puede operar; el último activo queda protegido.
        $this->actingAs($admin)->postJson("/api/v1/users/{$last->id}/deactivate")->assertOk();
        $this->assertSame(1, User::query()->where('role', 'administrador_accesos')->where('is_active', true)->count());
    }

    public function test_admin_cannot_change_own_role_through_update(): void
    {
        $admin = $this->admin();

        $this->patchJson("/api/v1/users/{$admin->id}", ['role' => 'camillero'])->assertStatus(422);

        $this->assertSame('administrador_accesos', $admin->fresh()->role);
        $this->patchJson("/api/v1/users/{$admin->id}", ['name' => 'Nuevo nombre'])->assertOk();
    }

    public function test_deactivating_an_already_inactive_account_is_rejected_without_new_audit(): void
    {
        $this->admin();
        $target = User::factory()->create(['role' => 'camillero', 'is_active' => false]);

        $this->postJson("/api/v1/users/{$target->id}/deactivate")->assertStatus(422);
        $this->assertSame(0, DB::table('access_audit_logs')->where('action', 'user.deactivated')->count());
    }

    public function test_service_rejects_an_actor_deactivated_after_the_request_was_authorized(): void
    {
        $staleActor = User::factory()->create(['role' => 'administrador_accesos']);
        $target = User::factory()->create(['role' => 'camillero']);
        User::query()->whereKey($staleActor->id)->update(['is_active' => false]);

        $this->expectException(ClinicalRuleException::class);
        app(UserAdministration::class)->deactivate($target, $staleActor);
    }

    public function test_non_admin_roles_get_403_on_user_endpoints(): void
    {
        $target = User::factory()->create(['role' => 'camillero']);

        foreach (array_diff(RoleCatalog::all(), ['administrador_accesos']) as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]));
            $this->getJson(self::USERS)->assertForbidden();
            $this->postJson(self::USERS, [])->assertForbidden();
            $this->patchJson("/api/v1/users/{$target->id}", [])->assertForbidden();
            $this->postJson("/api/v1/users/{$target->id}/deactivate")->assertForbidden();
        }
    }

    public function test_staff_members_lists_only_active_care_roles_for_roster_roles(): void
    {
        User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Ana Piso']);
        User::factory()->create(['role' => 'auxiliar_enfermeria', 'name' => 'Beto Aux']);
        User::factory()->create(['role' => 'enfermera_piso', 'name' => 'Inactiva', 'is_active' => false]);
        User::factory()->create(['role' => 'admision', 'name' => 'Mesa']);

        foreach (['jefatura_enfermeria', 'enfermera_supervisora', 'enfermera_piso', 'recursos_humanos'] as $role) {
            $this->actingAs(User::factory()->create(['role' => $role]));
            $response = $this->getJson('/api/v1/staff/members?role=enfermera_piso')->assertOk();
            $names = collect($response->json('data'))->pluck('name');
            $this->assertTrue($names->contains('Ana Piso'));
            $this->assertFalse($names->contains('Inactiva'));
            $this->assertFalse($names->contains('Beto Aux'));
            $this->assertFalse($names->contains('Mesa'));
            $expected = in_array($role, ['jefatura_enfermeria', 'enfermera_supervisora'], true)
                ? ['id', 'name', 'email', 'role', 'isActive']
                : ['id', 'name', 'role', 'isActive'];
            $this->assertSame($expected, array_keys($response->json('data.0')));
        }

        $this->actingAs(User::factory()->create(['role' => 'camillero']));
        $this->getJson('/api/v1/staff/members')->assertForbidden();
    }
}
