<?php

namespace Tests\Feature;

use App\Models\LifeAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeAuthApiTest extends TestCase
{
    private const ANA_CORREO_PE = 'ana@correo.pe';

    private const LIFE_AUTH_REGISTER = '/api/v1/life/auth/register';

    use RefreshDatabase;

    public function test_citizen_registers_and_receives_token(): void
    {
        $this->postJson(self::LIFE_AUTH_REGISTER, [
            'name' => 'Ana Rojas', 'email' => self::ANA_CORREO_PE, 'password' => 'Clave-segura-9',
        ])->assertCreated()->assertJsonStructure(['token', 'account' => ['id', 'name', 'email']]);

        $this->assertDatabaseHas('life_accounts', ['email' => self::ANA_CORREO_PE]);
    }

    public function test_login_rejects_wrong_password(): void
    {
        LifeAccount::query()->create(['name' => 'Ana', 'email' => self::ANA_CORREO_PE, 'password' => 'Clave-segura-9']);

        $this->postJson('/api/v1/life/auth/login', ['email' => self::ANA_CORREO_PE, 'password' => 'otra'])
            ->assertStatus(422);
    }

    public function test_login_returns_token_with_valid_credentials(): void
    {
        LifeAccount::query()->create(['name' => 'Ana', 'email' => self::ANA_CORREO_PE, 'password' => 'Clave-segura-9']);

        $this->postJson('/api/v1/life/auth/login', ['email' => 'ANA@correo.pe', 'password' => 'Clave-segura-9'])
            ->assertOk()->assertJsonStructure(['token', 'account' => ['id', 'name', 'email']]);
    }

    public function test_register_rejects_weak_password_and_duplicate_email(): void
    {
        $this->postJson(self::LIFE_AUTH_REGISTER, [
            'name' => 'Ana', 'email' => self::ANA_CORREO_PE, 'password' => 'corta',
        ])->assertStatus(422);

        LifeAccount::query()->create(['name' => 'Ana', 'email' => self::ANA_CORREO_PE, 'password' => 'Clave-segura-9']);
        $this->postJson(self::LIFE_AUTH_REGISTER, [
            'name' => 'Otra', 'email' => self::ANA_CORREO_PE, 'password' => 'Clave-segura-9',
        ])->assertStatus(422);
    }

    public function test_staff_cannot_use_life_routes(): void
    {
        $staff = User::factory()->create(['role' => 'admision']);
        $this->actingAs($staff);

        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true])->assertForbidden();
    }

    public function test_citizen_cannot_use_clinical_routes(): void
    {
        $citizen = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'a@b.pe', 'password' => 'Clave-segura-9']);
        Sanctum::actingAs($citizen, ['life']);

        $this->getJson('/api/v1/hospital-admission/encounters')->assertForbidden();
    }
}
