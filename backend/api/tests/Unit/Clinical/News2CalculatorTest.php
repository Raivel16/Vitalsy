<?php

namespace Tests\Unit\Clinical;

use App\Services\Clinical\News2Calculator;
use PHPUnit\Framework\TestCase;

class News2CalculatorTest extends TestCase
{
    public function test_stable_patient_scores_zero_low_and_green(): void
    {
        $result = (new News2Calculator)->calculate($this->baseline());

        $this->assertSame(0, $result['total']);
        $this->assertSame('low', $result['band']);
        $this->assertSame('green', $result['visual']);
        $this->assertFalse($result['singleParameterAlert']);
        $this->assertStringContainsString('12 horas', $result['monitoring']);
    }

    public function test_single_parameter_of_three_is_urgent_low_medium(): void
    {
        $result = (new News2Calculator)->calculate([
            ...$this->baseline(),
            'respiratoryRate' => 25,
        ]);

        $this->assertSame(3, $result['total']);
        $this->assertSame('low-medium', $result['band']);
        $this->assertSame('yellow', $result['visual']);
        $this->assertTrue($result['singleParameterAlert']);
        $this->assertStringContainsString('urgente', mb_strtolower($result['clinicalResponse']));
    }

    public function test_scale_two_scores_oxygen_and_air_differently(): void
    {
        $onOxygen = (new News2Calculator)->calculate([
            ...$this->baseline(),
            'spo2Scale' => 'scale2',
            'supplementalOxygen' => true,
            'oxygenSaturation' => 97,
        ]);
        $this->assertSame(3, $onOxygen['parameters']['spo2']);
        $this->assertSame(2, $onOxygen['parameters']['oxygen']);

        $onAir = (new News2Calculator)->calculate([
            ...$this->baseline(),
            'spo2Scale' => 'scale2',
            'supplementalOxygen' => false,
            'oxygenSaturation' => 97,
        ]);
        $this->assertSame(0, $onAir['parameters']['spo2']);
    }

    public function test_chronic_confusion_does_not_score(): void
    {
        $result = (new News2Calculator)->calculate([
            ...$this->baseline(),
            'consciousness' => 'confusion',
            'confusionOnset' => 'chronic',
        ]);

        $this->assertSame(0, $result['parameters']['consciousness']);
    }

    /**
     * @return array<string, mixed>
     */
    private function baseline(): array
    {
        return [
            'respiratoryRate' => 16,
            'oxygenSaturation' => 98,
            'spo2Scale' => 'scale1',
            'supplementalOxygen' => false,
            'systolicBloodPressure' => 120,
            'pulse' => 72,
            'consciousness' => 'alert',
            'temperature' => 36.8,
        ];
    }
}
