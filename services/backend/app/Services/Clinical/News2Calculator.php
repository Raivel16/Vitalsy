<?php

namespace App\Services\Clinical;

class News2Calculator
{
    /**
     * NEWS2 chart 1, Royal College of Physicians 2017.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function calculate(array $input): array
    {
        $onOxygen = (bool) ($input['supplementalOxygen'] ?? false);
        $scale = ($input['spo2Scale'] ?? 'scale1') === 'scale2' ? 'scale2' : 'scale1';

        $parameters = [
            'respiration' => $this->respiration((int) round((float) $input['respiratoryRate'])),
            'spo2' => $scale === 'scale2'
                ? $this->spo2Scale2((int) round((float) $input['oxygenSaturation']), $onOxygen)
                : $this->spo2Scale1((int) round((float) $input['oxygenSaturation'])),
            'oxygen' => $onOxygen ? 2 : 0,
            'systolic' => $this->systolic((int) round((float) $input['systolicBloodPressure'])),
            'pulse' => $this->pulse((int) round((float) $input['pulse'])),
            'consciousness' => $this->consciousness(
                (string) ($input['consciousness'] ?? 'alert'),
                isset($input['confusionOnset']) ? (string) $input['confusionOnset'] : null,
            ),
            'temperature' => $this->temperature((float) $input['temperature']),
        ];

        $total = array_sum($parameters);
        $single = max($parameters) === 3;
        $classification = $this->classify($total, $single);

        return [
            'total' => $total,
            'parameters' => $parameters,
            'singleParameterAlert' => $single,
            'source' => 'RCP NEWS2 2017, chart 1',
            ...$classification,
        ];
    }

    private function respiration(int $value): int
    {
        if ($value <= 8 || $value >= 25) {
            return 3;
        }
        if ($value <= 11) {
            return 1;
        }
        if ($value <= 20) {
            return 0;
        }

        return 2;
    }

    private function spo2Scale1(int $value): int
    {
        if ($value <= 91) {
            return 3;
        }
        if ($value <= 93) {
            return 2;
        }
        if ($value <= 95) {
            return 1;
        }

        return 0;
    }

    private function spo2Scale2(int $value, bool $onOxygen): int
    {
        if ($value <= 83) {
            return 3;
        }
        if ($value <= 85) {
            return 2;
        }
        if ($value <= 87) {
            return 1;
        }
        if ($value <= 92 || ! $onOxygen) {
            return 0;
        }
        if ($value <= 94) {
            return 1;
        }
        if ($value <= 96) {
            return 2;
        }

        return 3;
    }

    private function systolic(int $value): int
    {
        if ($value <= 90 || $value >= 220) {
            return 3;
        }
        if ($value <= 100) {
            return 2;
        }
        if ($value <= 110) {
            return 1;
        }

        return 0;
    }

    private function pulse(int $value): int
    {
        if ($value <= 40 || $value >= 131) {
            return 3;
        }
        if ($value <= 50) {
            return 1;
        }
        if ($value <= 90) {
            return 0;
        }
        if ($value <= 110) {
            return 1;
        }
        if ($value <= 130) {
            return 2;
        }

        return 3;
    }

    private function temperature(float $value): int
    {
        $value = round($value, 1);
        if ($value <= 35) {
            return 3;
        }
        if ($value <= 36) {
            return 1;
        }
        if ($value <= 38) {
            return 0;
        }
        if ($value <= 39) {
            return 1;
        }

        return 2;
    }

    private function consciousness(string $consciousness, ?string $onset): int
    {
        if ($consciousness === 'alert') {
            return 0;
        }
        if ($consciousness === 'confusion' && $onset === 'chronic') {
            return 0;
        }

        return 3;
    }

    /**
     * @return array{band: string, visual: string, visualLabel: string, clinicalResponse: string, monitoring: string}
     */
    private function classify(int $total, bool $single): array
    {
        if ($total >= 7) {
            return [
                'band' => 'high',
                'visual' => 'red',
                'visualLabel' => 'Riesgo alto',
                'clinicalResponse' => 'Riesgo alto. Evaluación de emergencia por el equipo clínico y considerar traslado a un nivel de cuidado superior.',
                'monitoring' => 'Monitoreo continuo',
            ];
        }

        if ($total >= 5) {
            return [
                'band' => 'medium',
                'visual' => 'yellow',
                'visualLabel' => 'Riesgo medio',
                'clinicalResponse' => 'Riesgo medio. Revisión urgente por un clínico competente en enfermedad aguda.',
                'monitoring' => 'Mínimo cada 1 hora',
            ];
        }

        if ($single) {
            return [
                'band' => 'low-medium',
                'visual' => 'yellow',
                'visualLabel' => 'Riesgo bajo-medio',
                'clinicalResponse' => 'Riesgo bajo-medio con puntuación de 3 en un parámetro. Revisión urgente por enfermería registrada y considerar evaluación clínica.',
                'monitoring' => 'Mínimo cada 1 hora',
            ];
        }

        if ($total >= 1) {
            return [
                'band' => 'low-medium',
                'visual' => 'yellow',
                'visualLabel' => 'Riesgo bajo-medio',
                'clinicalResponse' => 'Riesgo bajo-medio. Valoración por enfermería registrada.',
                'monitoring' => 'Mínimo cada 4 a 6 horas',
            ];
        }

        return [
            'band' => 'low',
            'visual' => 'green',
            'visualLabel' => 'Riesgo bajo',
            'clinicalResponse' => 'Riesgo bajo. Continuar cuidados rutinarios de sala.',
            'monitoring' => 'Mínimo cada 12 horas',
        ];
    }
}
