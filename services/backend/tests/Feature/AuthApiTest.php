<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            'password' => 'Vitalsy.2026',
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
                'password' => 'Vitalsy.2026',
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

    public function test_login_starts_a_session_and_logout_ends_it(): void
    {
        User::factory()->create([
            'name' => 'Mesa de admisión',
            'email' => 'admision@vitalsy.local',
            'password' => 'Vitalsy.2026',
            'role' => 'admision',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admision@vitalsy.local',
            'password' => 'Vitalsy.2026',
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
}
