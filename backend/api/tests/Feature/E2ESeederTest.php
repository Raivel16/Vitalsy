<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\User;
use App\Models\Ward;
use App\Support\RoleCatalog;
use Database\Seeders\E2ESeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class E2ESeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_refuses_outside_e2e(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('E2ESeeder solo se ejecuta con APP_ENV=e2e.');

        $this->seed(E2ESeeder::class);
    }

    public function test_seeds_extended_catalog_in_e2e(): void
    {
        $this->app['env'] = 'e2e';

        $this->seed(E2ESeeder::class);

        $this->assertSame(7, Ward::query()->count());
        $this->assertSame(76, Bed::query()->count());
        $this->assertSame(10, Bed::query()->where('isolation', true)->where('status', 'available')->count());
        foreach (RoleCatalog::all() as $role) {
            $this->assertTrue(User::query()->where('email', "{$role}@vitalsy.local")->exists(), $role);
        }
    }
}
