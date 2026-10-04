<?php

namespace App\Services\Clinical;

use InvalidArgumentException;

class BradenScale
{
    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function calculate(array $input): array
    {
        foreach (['sensoryPerception', 'moisture', 'activity', 'mobility', 'nutrition'] as $key) {
            $this->assertRange((int) $input[$key], 1, 4, $key);
        }
        $this->assertRange((int) $input['frictionShear'], 1, 3, 'fricción y cizallamiento');

        $total = (int) $input['sensoryPerception']
            + (int) $input['moisture']
            + (int) $input['activity']
            + (int) $input['mobility']
            + (int) $input['nutrition']
            + (int) $input['frictionShear'];

        if ($total <= 9) {
            return $this->result($total, 'severe', 'Riesgo muy alto de úlceras por presión', [
                'Iniciar cambios posturales programados y protección de prominencias óseas.',
            ]);
        }
        if ($total <= 12) {
            return $this->result($total, 'high', 'Riesgo alto de úlceras por presión', [
                'Programar cambios posturales y proteger zonas de apoyo.',
            ]);
        }
        if ($total <= 14) {
            return $this->result($total, 'moderate', 'Riesgo moderado de úlceras por presión', [
                'Vigilar puntos de presión y reposicionar si la movilidad está limitada.',
            ]);
        }
        if ($total <= 18) {
            return $this->result($total, 'mild', 'Riesgo leve de úlceras por presión', [
                'Mantener higiene de piel y estimular los cambios de posición espontáneos.',
            ]);
        }

        return $this->result($total, 'none', 'Sin riesgo actual de úlceras por presión', [
            'Continuar la inspección rutinaria de la piel durante la estancia.',
        ]);
    }

    private function assertRange(int $value, int $min, int $max, string $label): void
    {
        if ($value < $min || $value > $max) {
            throw new InvalidArgumentException("La subescala de {$label} está fuera de rango.");
        }
    }

    /**
     * @param  array<int, string>  $recommendations
     * @return array<string, mixed>
     */
    private function result(int $total, string $level, string $label, array $recommendations): array
    {
        return [
            'total' => $total,
            'level' => $level,
            'levelLabel' => $label,
            'recommendations' => $recommendations,
        ];
    }
}
