<?php

namespace Tests\Unit\Clinical;

use App\Services\Clinical\ButterworthFilter;
use PHPUnit\Framework\TestCase;

class ButterworthFilterTest extends TestCase
{
    public function test_zero_phase_fourth_order_attenuates_high_frequency_noise(): void
    {
        $filter = new ButterworthFilter();
        $n = 128;
        $noisy = [];
        for ($i = 0; $i < $n; $i++) {
            $t = $i / $n;
            $noisy[] = sin(2 * M_PI * 2 * $t) + 0.5 * sin(2 * M_PI * 24 * $t);
        }

        $filtered = $filter->zeroPhaseFourthOrder($noisy);

        $hf = static function (array $signal): float {
            $energy = 0.0;
            for ($i = 1; $i < count($signal); $i++) {
                $energy += ($signal[$i] - $signal[$i - 1]) ** 2;
            }

            return $energy;
        };

        $this->assertLessThan($hf($noisy) * 0.5, $hf($filtered));
        $this->assertCount($n, $filtered);
    }
}
