<?php

namespace Tests\Unit;

use App\Services\Life\BaselineCalculator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

class BaselineCalculatorTest extends TestCase
{
    /** Una lectura por dia, la mas reciente hoy; las ultimas de `values` son las mas recientes. */
    private function samples(string $kind, array $values): Collection
    {
        $now = Carbon::now();
        $count = count($values);

        return collect($values)->map(fn ($v, $i) => (object) [
            'kind' => $kind,
            'value' => $v,
            'started_at' => $now->copy()->subDays($count - 1 - $i)->subMinutes(5),
        ]);
    }

    private function hrSamples(int $days, ?array $values = null): Collection
    {
        return $this->samples('heart_rate', $values ?? array_map(fn ($i) => 60 + $i, range(0, $days + 2)));
    }

    public function test_baseline_is_omitted_with_less_than_seven_days_of_history(): void
    {
        $this->assertSame([], (new BaselineCalculator)->summarize($this->hrSamples(days: 5)));
    }

    public function test_baseline_excludes_three_most_recent_readings(): void
    {
        $samples = $this->hrSamples(days: 10, values: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 200, 200, 200]);
        $metric = (new BaselineCalculator)->summarize($samples)[0];

        $this->assertSame('heart_rate', $metric['kind']);
        $this->assertLessThan(100, $metric['high']);
        $this->assertSame(10, $metric['days']);
        $this->assertEqualsWithDelta(60.9, $metric['low'], 0.0001);
        $this->assertEqualsWithDelta(68.1, $metric['high'], 0.0001);
    }

    public function test_seven_days_of_fitting_history_is_enough(): void
    {
        $result = (new BaselineCalculator)->summarize($this->samples('spo2', [95, 96, 97, 96, 95, 97, 96, 99, 99, 99]));

        $this->assertCount(1, $result);
        $this->assertSame('spo2', $result[0]['kind']);
        $this->assertSame(7, $result[0]['days']);
    }

    public function test_only_deviation_kinds_are_summarized(): void
    {
        $steps = $this->samples('steps', [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);

        $this->assertSame([], (new BaselineCalculator)->summarize($steps));
    }

    public function test_readings_older_than_fourteen_days_are_ignored(): void
    {
        $old = $this->samples('heart_rate', range(60, 79))->map(function ($s, $i) {
            $s->started_at = Carbon::now()->subDays(40 + $i);

            return $s;
        });

        $this->assertSame([], (new BaselineCalculator)->summarize($old));
    }
}
