<?php

namespace App\Services\Clinical;

class News2Calculator
{
    private const EVERY_HOUR = 'Mínimo cada 1 hora';

    private const LOW_MEDIUM = 'Riesgo bajo-medio';

    /** Clasificación NEWS2: alto, medio, un parámetro en 3, bajo-medio y bajo. */
    private const BANDS = [
        'high' => [
            'band' => 'high',
            'visual' => 'red',
            'visualLabel' => 'Riesgo alto',
            'clinicalResponse' => 'Riesgo alto. Evaluación de emergencia por el equipo clínico y considerar traslado a un nivel de cuidado superior.',
            'monitoring' => 'Monitoreo continuo',
        ],
        'medium' => [
            'band' => 'medium',
            'visual' => 'yellow',
            'visualLabel' => 'Riesgo medio',
            'clinicalResponse' => 'Riesgo medio. Revisión urgente por un clínico competente en enfermedad aguda.',
            'monitoring' => self::EVERY_HOUR,
        ],
        'single' => [
            'band' => 'low-medium',
            'visual' => 'yellow',
            'visualLabel' => self::LOW_MEDIUM,
            'clinicalResponse' => 'Riesgo bajo-medio con puntuación de 3 en un parámetro. Revisión urgente por enfermería registrada y considerar evaluación clínica.',
            'monitoring' => self::EVERY_HOUR,
        ],
        'low-medium' => [
            'band' => 'low-medium',
            'visual' => 'yellow',
            'visualLabel' => self::LOW_MEDIUM,
            'clinicalResponse' => 'Riesgo bajo-medio. Valoración por enfermería registrada.',
            'monitoring' => 'Mínimo cada 4 a 6 horas',
        ],
        'low' => [
            'band' => 'low',
            'visual' => 'green',
            'visualLabel' => 'Riesgo bajo',
            'clinicalResponse' => 'Riesgo bajo. Continuar cuidados rutinarios de sala.',
            'monitoring' => 'Mínimo cada 12 horas',
        ],
    ];

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

    /**
     * Puntaje del primer umbral superior alcanzado (límites inclusivos y ascendentes).
     *
     * @param  array<int, int>  $upperBounds  límite superior => puntaje
     */
    private function bandScore(int|float $value, array $upperBounds, int $above): int
    {
        foreach ($upperBounds as $limit => $score) {
            if ($value <= $limit) {
                return $score;
            }
        }

        return $above;
    }

    private function respiration(int $value): int
    {
        if ($value <= 8 || $value >= 25) {
            return 3;
        }

        return $this->bandScore($value, [11 => 1, 20 => 0], 2);
    }

    private function spo2Scale1(int $value): int
    {
        return $this->bandScore($value, [91 => 3, 93 => 2, 95 => 1], 0);
    }

    private function spo2Scale2(int $value, bool $onOxygen): int
    {
        // Sin oxígeno suplementario, por encima de 87 % no puntúa (solo puntúa la hipoxemia).
        if (! $onOxygen && $value > 87) {
            return 0;
        }

        return $this->bandScore($value, [83 => 3, 85 => 2, 87 => 1, 92 => 0, 94 => 1, 96 => 2], 3);
    }

    private function systolic(int $value): int
    {
        if ($value <= 90 || $value >= 220) {
            return 3;
        }

        return $this->bandScore($value, [100 => 2, 110 => 1], 0);
    }

    private function pulse(int $value): int
    {
        if ($value <= 40 || $value >= 131) {
            return 3;
        }

        return $this->bandScore($value, [50 => 1, 90 => 0, 110 => 1, 130 => 2], 3);
    }

    private function temperature(float $value): int
    {
        return $this->bandScore(round($value, 1), [35 => 3, 36 => 1, 38 => 0, 39 => 1], 2);
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
        // El orden importa: un solo parámetro en 3 clasifica como bajo-medio
        // únicamente cuando el total aún no llegó a riesgo medio (5) ni alto (7).
        $key = match (true) {
            $total >= 7 => 'high',
            $total >= 5 => 'medium',
            $single => 'single',
            $total >= 1 => 'low-medium',
            default => 'low',
        };

        return self::BANDS[$key];
    }
}
