<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\RoleCatalog;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAccountsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_one_active_account_per_catalog_role(): void
    {
        $this->seed(DatabaseSeeder::class);

        foreach (RoleCatalog::all() as $role) {
            $user = User::query()->where('role', $role)->first();

            $this->assertNotNull($user, "Falta la cuenta demo del rol {$role}.");
            $this->assertSame("{$role}@vitalsy.local", $user->email);
            $this->assertTrue((bool) $user->is_active);
        }
    }

    public function test_seeder_does_not_keep_legacy_generic_roles(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(0, User::query()->whereIn('role', ['enfermeria', 'medico'])->count());
    }

    public function test_seeder_adds_fictitious_people_for_testing(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertGreaterThanOrEqual(6, User::query()->where('role', 'enfermera_piso')->count());
        $this->assertGreaterThanOrEqual(4, User::query()->whereIn('role', ['medico_residente', 'medico_tratante'])->count());
        foreach (RoleCatalog::all() as $role) {
            $this->assertGreaterThanOrEqual(2, User::query()->where('role', $role)->count(), "Falta una persona de prueba para {$role}.");
        }
        $person = User::query()->where('email', 'rosa.quispe@vitalsy.local')->first();
        $this->assertNotNull($person);
        $this->assertTrue((bool) $person->is_active);
        $this->assertNotSame('Enfermera de piso', $person->name);

        $this->seed(DatabaseSeeder::class);
        $this->assertSame(1, User::query()->where('email', 'rosa.quispe@vitalsy.local')->count());
    }

    public function test_demo_people_do_not_prevent_the_standard_demo_encounters(): void
    {
        $this->seed(DatabaseSeeder::class);

        foreach (['ENC-0001', 'ENC-0002', 'ENC-0003', 'ENC-PRAC-1'] as $id) {
            $this->assertDatabaseHas('admission_encounters', ['encounter_id' => $id]);
        }
    }
}
