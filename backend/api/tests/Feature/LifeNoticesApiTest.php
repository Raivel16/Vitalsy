<?php

namespace Tests\Feature;

use App\Models\LifeAccount;
use App\Models\LifeBiometricSample;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeNoticesApiTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    private function asCitizen(): LifeAccount
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9']);
        Sanctum::actingAs($account, ['life']);

        return $account;
    }

    private function sample(LifeAccount $account, string $kind, float $value, Carbon $at): void
    {
        LifeBiometricSample::query()->create([
            'life_account_id' => $account->id, 'client_id' => 'c-'.(++$this->seq), 'kind' => $kind,
            'value' => $value, 'unit' => 'u', 'started_at' => $at, 'ended_at' => $at->copy()->addMinute(), 'origin' => 'manual',
        ]);
    }

    /** 8 días de historial (60-67) y una cola de 3 lecturas recientes. */
    private function history(LifeAccount $account, string $kind, array $tail, int $days = 8): void
    {
        for ($i = 0; $i < $days; $i++) {
            $this->sample($account, $kind, 60 + $i, now()->subDays(12 - $i)->setTime(9, 0));
        }
        foreach ($tail as $i => $value) {
            $this->sample($account, $kind, $value, now()->subHours(3 - $i));
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-11 12:00:00');
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/v1/life/notices')->assertUnauthorized();
    }

    public function test_three_readings_outside_range_yield_preventive_notice(): void
    {
        $account = $this->asCitizen();
        $this->history($account, 'heart_rate', [110, 112, 115]);

        $response = $this->getJson('/api/v1/life/notices')->assertOk();

        $notice = collect($response->json('notices'))->firstWhere('kind', 'preventivo');
        $this->assertNotNull($notice);
        $this->assertSame('heart_rate', $notice['metric']);
        $this->assertSame('Un ritmo un poco más alto de lo usual', $notice['title']);
        $this->assertNotEmpty($notice['id']);
        $this->assertNotEmpty($notice['createdAt']);
    }

    public function test_readings_inside_range_yield_no_notice(): void
    {
        $account = $this->asCitizen();
        $this->history($account, 'heart_rate', [62, 63, 64]);

        $this->getJson('/api/v1/life/notices')->assertOk()->assertExactJson(['notices' => []]);
    }

    public function test_only_two_readings_outside_range_yield_no_notice(): void
    {
        $account = $this->asCitizen();
        $this->history($account, 'heart_rate', [62, 110, 115]);

        $this->getJson('/api/v1/life/notices')->assertOk()->assertExactJson(['notices' => []]);
    }

    public function test_less_than_seven_days_of_history_yield_no_notice(): void
    {
        $account = $this->asCitizen();
        $this->history($account, 'heart_rate', [110, 112, 115], 5);

        $this->getJson('/api/v1/life/notices')->assertOk()->assertExactJson(['notices' => []]);
    }

    public function test_low_steps_yield_habit_notice(): void
    {
        $account = $this->asCitizen();
        $this->history($account, 'steps', [20, 25, 30]);

        $notice = $this->getJson('/api/v1/life/notices')->assertOk()->json('notices.0');

        $this->assertSame('habito', $notice['kind']);
        $this->assertSame('steps', $notice['metric']);
    }

    public function test_short_sleep_yields_habit_notice(): void
    {
        $account = $this->asCitizen();
        $this->history($account, 'sleep', [10, 11, 12]);

        $notice = $this->getJson('/api/v1/life/notices')->assertOk()->json('notices.0');

        $this->assertSame('habito', $notice['kind']);
        $this->assertSame('sleep', $notice['metric']);
    }

    public function test_notices_never_use_forbidden_wording(): void
    {
        $account = $this->asCitizen();
        $this->history($account, 'heart_rate', [20, 21, 22]);
        $this->history($account, 'steps', [1, 2, 3]);
        $this->history($account, 'sleep', [1, 2, 3]);

        $notices = $this->getJson('/api/v1/life/notices')->assertOk()->json('notices');

        $this->assertCount(3, $notices);
        foreach ($notices as $notice) {
            $this->assertDoesNotMatchRegularExpression(
                '/cr[ií]tico|grave|news2|alerta cl[ií]nica|diagn[oó]stico/iu',
                $notice['title'].' '.$notice['body'],
            );
        }
    }
}
