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

        [$level, $label, $recommendation] = match (true) {
            $total <= 9 => ['severe', 'Riesgo muy alto de úlceras por presión', 'Iniciar cambios posturales programados y protección de prominencias óseas.'],
            $total <= 12 => ['high', 'Riesgo alto de úlceras por presión', 'Programar cambios posturales y proteger zonas de apoyo.'],
            $total <= 14 => ['moderate', 'Riesgo moderado de úlceras por presión', 'Vigilar puntos de presión y reposicionar si la movilidad está limitada.'],
            $total <= 18 => ['mild', 'Riesgo leve de úlceras por presión', 'Mantener higiene de piel y estimular los cambios de posición espontáneos.'],
            default => ['none', 'Sin riesgo actual de úlceras por presión', 'Continuar la inspección rutinaria de la piel durante la estancia.'],
        };

        return $this->result($total, $level, $label, [$recommendation]);
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
