<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->disableCookieEncryption();
        $this->withHeader('origin', 'http://localhost');
        $this->withHeader('referer', 'http://localhost');
        $this->get('/sanctum/csrf-cookie');
        $this->withHeader('X-CSRF-TOKEN', csrf_token());
    }

    public function test_login_works_without_origin_header_for_lan_clients(): void
    {
        User::factory()->create([
            'email' => 'camillero@vitalsy.local',
            'password' => 'password_ejemplo',
            'role' => 'camillero',
        ]);

        // Simula cliente móvil/LAN que no envía Origin ni Referer.
        $this->withoutHeader('origin')
            ->withoutHeader('referer')
            ->withServerVariables(['HTTP_HOST' => '192.168.1.34:8080'])
            ->get('/sanctum/csrf-cookie');

        $this->withHeader('X-CSRF-TOKEN', csrf_token())
            ->withoutHeader('origin')
            ->withoutHeader('referer')
            ->withServerVariables(['HTTP_HOST' => '192.168.1.34:8080'])
            ->postJson('/api/v1/auth/login', [
                'email' => 'camillero@vitalsy.local',
                'password' => 'password_ejemplo',
            ])
            ->assertOk()
            ->assertJsonPath('user.role', 'camillero');
    }

    public function test_login_rejects_unknown_credentials_in_spanish(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'nadie@vitalsy.local',
            'password' => 'incorrecta',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'El correo o la contraseña no son correctos.');
    }

    public function test_login_rejects_deactivated_accounts(): void
    {
        User::factory()->create([
            'email' => 'baja@vitalsy.local',
            'password' => 'password_ejemplo',
            'role' => 'camillero',
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'baja@vitalsy.local',
            'password' => 'password_ejemplo',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'El correo o la contraseña no son correctos.');
    }

    public function test_login_starts_a_session_and_logout_ends_it(): void
    {
        User::factory()->create([
            'name' => 'Mesa de admisión',
            'email' => 'admision@vitalsy.local',
            'password' => 'password_ejemplo',
            'role' => 'admision',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admision@vitalsy.local',
            'password' => 'password_ejemplo',
        ])->assertOk()
            ->assertJsonPath('user.email', 'admision@vitalsy.local')
            ->assertJsonPath('user.role', 'admision');

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.name', 'Mesa de admisión');

        $this->withHeader('X-CSRF-TOKEN', csrf_token())
            ->postJson('/api/v1/auth/logout')
            ->assertNoContent();

        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Debe iniciar sesión para continuar.');
    }

    public function test_support_role_signs_in_and_stays_out_of_clinical_routes(): void
    {
        User::factory()->create([
            'name' => 'Gestión de camas',
            'email' => 'gestion_camas@vitalsy.local',
            'password' => 'password_ejemplo',
            'role' => 'gestion_camas',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'gestion_camas@vitalsy.local',
            'password' => 'password_ejemplo',
        ])->assertOk()
            ->assertJsonPath('user.role', 'gestion_camas');

        $this->getJson('/api/v1/hospital-admission/admission-orders/OI-2026-0001')
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para esta acción.');
    }

    public function test_guest_and_wrong_role_cannot_open_an_admission_order(): void
    {
        $this->getJson('/api/v1/hospital-admission/admission-orders/OI-2026-0001')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Debe iniciar sesión para continuar.');

        $physician = User::factory()->create(['role' => 'medico_residente']);

        $this->actingAs($physician)
            ->getJson('/api/v1/hospital-admission/admission-orders/OI-2026-0001')
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para esta acción.');
    }

    public function test_temporary_password_blocks_every_route_except_the_rotation_ones(): void
    {
        $user = User::factory()->create([
            'role' => 'admision',
            'password' => 'password_temporal',
            'must_change_password' => true,
        ]);
        $this->actingAs($user);

        $this->getJson('/api/v1/hospital-admission/encounters')
            ->assertForbidden()
            ->assertJsonPath('code', 'password_change_required');

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.mustChangePassword', true);
    }

    public function test_user_rotates_the_temporary_password_and_regains_access(): void
    {
        $user = User::factory()->create([
            'role' => 'admision',
            'password' => 'password_temporal',
            'must_change_password' => true,
        ]);
        $this->actingAs($user);

        $this->postJson('/api/v1/auth/change-password', [
            'currentPassword' => 'password_temporal',
            'password' => 'Clave-nueva-segura-9',
            'password_confirmation' => 'Clave-nueva-segura-9',
        ])->assertOk()->assertJsonPath('user.mustChangePassword', false);

        $this->assertFalse($user->fresh()->must_change_password);
        $this->assertTrue(Hash::check('Clave-nueva-segura-9', $user->fresh()->password));
        $this->getJson('/api/v1/hospital-admission/encounters')->assertOk();
    }

    public function test_rotation_rejects_wrong_current_weak_or_reused_passwords(): void
    {
        $user = User::factory()->create([
            'role' => 'admision',
            'password' => 'password_temporal',
            'must_change_password' => true,
        ]);
        $this->actingAs($user);

        $this->postJson('/api/v1/auth/change-password', [
            'currentPassword' => 'equivocada',
            'password' => 'Clave-nueva-segura-9',
            'password_confirmation' => 'Clave-nueva-segura-9',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/change-password', [
            'currentPassword' => 'password_temporal',
            'password' => 'corta',
            'password_confirmation' => 'corta',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/change-password', [
            'currentPassword' => 'password_temporal',
            'password' => 'password_temporal',
            'password_confirmation' => 'password_temporal',
        ])->assertStatus(422);

        $this->assertTrue($user->fresh()->must_change_password);
    }
}
