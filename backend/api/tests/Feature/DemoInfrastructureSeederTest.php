<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\Ward;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoInfrastructureSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_catalogo_demo_precarga_unas_treinta_camas_variadas(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertGreaterThanOrEqual(30, Bed::query()->count());
        $this->assertGreaterThanOrEqual(4, Ward::query()->count());
        $this->assertGreaterThanOrEqual(20, Bed::query()->where('status', 'available')->count());
        $this->assertGreaterThan(0, Bed::query()->where('isolation', true)->where('status', 'available')->count());
        $this->assertEqualsCanonicalizing(['female', 'male', 'mixed'], Bed::query()->distinct()->pluck('gender_policy')->all());
    }

    public function test_volver_a_sembrar_no_resucita_lo_que_el_administrador_borro(): void
    {
        $this->seed(DatabaseSeeder::class);
        $bed = Bed::query()->where('room', '101')->where('bed_code', 'A')->firstOrFail();
        $bed->delete();
        Ward::query()->where('code', 'UCI-C')->firstOrFail()->delete();

        $this->seed(DatabaseSeeder::class);

        $this->assertNull(Bed::query()->find($bed->id));
        $this->assertNull(Ward::query()->where('code', 'UCI-C')->first());
    }
}
