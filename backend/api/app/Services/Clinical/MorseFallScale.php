<?php

namespace App\Services\Clinical;

class MorseFallScale
{
    /**
     * Cortes de cuidado agudo: 0-24 bajo, 25-44 moderado, 45 o más alto.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function calculate(array $input): array
    {
        $aid = ['none' => 0, 'device' => 15, 'furniture' => 30][$input['ambulatoryAid'] ?? 'none'] ?? 0;
        $gait = ['normal' => 0, 'weak' => 10, 'impaired' => 20][$input['gait'] ?? 'normal'] ?? 0;
        $total = ($input['historyOfFalling'] ? 25 : 0)
            + ($input['secondaryDiagnosis'] ? 15 : 0)
            + $aid
            + ($input['intravenousAccess'] ? 20 : 0)
            + $gait
            + (($input['mentalStatus'] ?? 'oriented') === 'overestimates' ? 15 : 0);

        if ($total >= 45) {
            return [
                'total' => $total,
                'level' => 'high',
                'levelLabel' => 'Riesgo alto de caídas',
                'recommendations' => [
                    'Acompañar la deambulación y las transferencias.',
                    'Mantener la cama en posición baja, timbre al alcance y calzado antideslizante.',
                ],
            ];
        }

        if ($total >= 25) {
            return [
                'total' => $total,
                'level' => 'moderate',
                'levelLabel' => 'Riesgo moderado de caídas',
                'recommendations' => ['Aplicar precauciones estándar de caídas y reevaluar si cambia la condición.'],
            ];
        }

        return [
            'total' => $total,
            'level' => 'low',
            'levelLabel' => 'Riesgo bajo de caídas',
            'recommendations' => ['Mantener cuidados básicos de seguridad y orientar al paciente sobre el entorno.'],
        ];
    }
}
