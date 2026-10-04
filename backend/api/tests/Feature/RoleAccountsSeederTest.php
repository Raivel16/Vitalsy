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
}
