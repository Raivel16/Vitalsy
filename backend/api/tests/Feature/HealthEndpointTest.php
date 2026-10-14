<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** RNF-11: sonda de salud sin autenticación y sin datos clínicos. */
class HealthEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_reports_ok_with_database_ping_without_auth(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok', 'db' => 'ok']);
    }

    public function test_health_returns_503_when_database_is_down(): void
    {
        DB::shouldReceive('select')->andThrow(new \RuntimeException('down'));

        $this->getJson('/api/health')
            ->assertStatus(503)
            ->assertExactJson(['status' => 'degraded', 'db' => 'fail']);
    }
}
