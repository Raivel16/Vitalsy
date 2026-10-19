<?php

namespace Tests\Feature;

use App\Models\LifeAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeAuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_citizen_registers_and_receives_token(): void
    {
        $this->postJson('/api/v1/life/auth/register', [
            'name' => 'Ana Rojas', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9',
        ])->assertCreated()->assertJsonStructure(['token', 'account' => ['id', 'name', 'email']]);

        $this->assertDatabaseHas('life_accounts', ['email' => 'ana@correo.pe']);
    }

    public function test_login_rejects_wrong_password(): void
    {
        LifeAccount::query()->create(['name' => 'Ana', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9']);

        $this->postJson('/api/v1/life/auth/login', ['email' => 'ana@correo.pe', 'password' => 'otra'])
            ->assertStatus(422);
    }

    public function test_login_returns_token_with_valid_credentials(): void
    {
        LifeAccount::query()->create(['name' => 'Ana', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9']);

        $this->postJson('/api/v1/life/auth/login', ['email' => 'ANA@correo.pe', 'password' => 'Clave-segura-9'])
            ->assertOk()->assertJsonStructure(['token', 'account' => ['id', 'name', 'email']]);
    }

    public function test_register_rejects_weak_password_and_duplicate_email(): void
    {
        $this->postJson('/api/v1/life/auth/register', [
            'name' => 'Ana', 'email' => 'ana@correo.pe', 'password' => 'corta',
        ])->assertStatus(422);

        LifeAccount::query()->create(['name' => 'Ana', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9']);
        $this->postJson('/api/v1/life/auth/register', [
            'name' => 'Otra', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9',
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
