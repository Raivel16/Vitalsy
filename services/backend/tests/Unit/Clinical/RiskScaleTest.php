<?php

namespace Tests\Unit\Clinical;

use App\Services\Clinical\BradenScale;
use App\Services\Clinical\MorseFallScale;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class RiskScaleTest extends TestCase
{
    public function test_morse_uses_acute_care_cutoffs(): void
    {
        $low = (new MorseFallScale)->calculate([
            'historyOfFalling' => false,
            'secondaryDiagnosis' => false,
            'ambulatoryAid' => 'none',
            'intravenousAccess' => false,
            'gait' => 'normal',
            'mentalStatus' => 'oriented',
        ]);
        $high = (new MorseFallScale)->calculate([
            'historyOfFalling' => true,
            'secondaryDiagnosis' => false,
            'ambulatoryAid' => 'none',
            'intravenousAccess' => false,
            'gait' => 'impaired',
            'mentalStatus' => 'oriented',
        ]);

        $this->assertSame(0, $low['total']);
        $this->assertSame('low', $low['level']);
        $this->assertSame(45, $high['total']);
        $this->assertSame('high', $high['level']);
    }

    public function test_braden_lower_score_means_higher_risk_and_rejects_invalid_friction(): void
    {
        $severe = (new BradenScale)->calculate([
            'sensoryPerception' => 1,
            'moisture' => 1,
            'activity' => 1,
            'mobility' => 1,
            'nutrition' => 1,
            'frictionShear' => 1,
        ]);

        $this->assertSame(6, $severe['total']);
        $this->assertSame('severe', $severe['level']);

        $this->expectException(InvalidArgumentException::class);
        (new BradenScale)->calculate([
            'sensoryPerception' => 4,
            'moisture' => 4,
            'activity' => 4,
            'mobility' => 4,
            'nutrition' => 4,
            'frictionShear' => 4,
        ]);
    }
}
