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

    public function test_braden_bands_cover_high_moderate_mild_and_none(): void
    {
        $scale = new BradenScale;

        $high = $scale->calculate($this->braden(2, 2, 2, 2, 2, 1));
        $moderate = $scale->calculate($this->braden(2, 2, 2, 2, 3, 2));
        $mild = $scale->calculate($this->braden(3, 3, 3, 3, 3, 2));
        $none = $scale->calculate($this->braden(4, 4, 4, 4, 4, 3));

        $this->assertSame('high', $high['level']);
        $this->assertSame(11, $high['total']);
        $this->assertSame('moderate', $moderate['level']);
        $this->assertSame(13, $moderate['total']);
        $this->assertSame('mild', $mild['level']);
        $this->assertSame(17, $mild['total']);
        $this->assertSame('none', $none['level']);
        $this->assertSame(23, $none['total']);
        $this->assertNotEmpty($none['recommendations']);
    }

    public function test_braden_rejects_a_subscale_outside_one_to_four(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new BradenScale)->calculate($this->braden(0, 2, 2, 2, 2, 2));
    }

    /**
     * @return array<string, int>
     */
    private function braden(int $sensory, int $moisture, int $activity, int $mobility, int $nutrition, int $friction): array
    {
        return [
            'sensoryPerception' => $sensory,
            'moisture' => $moisture,
            'activity' => $activity,
            'mobility' => $mobility,
            'nutrition' => $nutrition,
            'frictionShear' => $friction,
        ];
    }
}
