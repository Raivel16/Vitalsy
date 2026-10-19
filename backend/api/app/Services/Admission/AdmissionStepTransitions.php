<?php

namespace App\Services\Admission;

use App\Models\AdmissionEncounter;

/** Reglas de avance del stepper de admisión: quién puede avanzar y a qué paso se transita. */
class AdmissionStepTransitions
{
    private const MEDICAL_ROLES = ['medico_residente', 'medico_tratante'];

    private const NOT_CURRENT_STEP = 'Este no es el paso vigente del ingreso.';

    /**
     * Valida cobertura, paso vigente y perfil; lanza AdmissionBoardException si no procede.
     */
    public function assertCanAdvance(
        AdmissionEncounter $encounter,
        string $step,
        string $stepRole,
        string $role,
        ?string $coverageStatus,
    ): void {
        $resolvingCoverage = $coverageStatus === 'aprobada'
            && in_array($step, ['cobertura', 'derivacion'], true);

        if ($encounter->waiting_reason && ! $resolvingCoverage) {
            throw new AdmissionBoardException('La cobertura no permite continuar. Derive el trámite.', 422);
        }
        if ($encounter->current_step === 'cerrado' || $encounter->current_step !== $step) {
            throw new AdmissionBoardException(self::NOT_CURRENT_STEP, 422);
        }
        $allowedRoles = $step === 'indicaciones' ? self::MEDICAL_ROLES : [$stepRole];
        if (! in_array($role, $allowedRoles, true)) {
            throw new AdmissionBoardException('Este paso corresponde a otro perfil.', 403);
        }
    }

    /**
     * Paso siguiente, motivo de espera y entregables resultantes de avanzar `$step`.
     *
     * @param  array<string, bool>  $deliverables
     * @return array{0: string|null, 1: string|null, 2: array<string, bool>}
     */
    public function resolve(string $step, ?string $defaultNext, ?string $coverageStatus, array $deliverables): array
    {
        $next = $defaultNext;
        $waiting = null;

        if ($step === 'cobertura' || $step === 'derivacion') {
            $approved = $coverageStatus === 'aprobada';
            $next = $approved ? 'brazalete' : 'derivacion';
            $deliverables['fichaAdmision'] = $approved;
            if (! $approved && $step === 'derivacion') {
                $waiting = 'cobertura';
            }
        }

        return [$next, $waiting, $deliverables];
    }
}
