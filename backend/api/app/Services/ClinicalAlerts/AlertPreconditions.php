<?php

namespace App\Services\ClinicalAlerts;

use App\Exceptions\ClinicalRuleException;
use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** Precondiciones compartidas por las operaciones del flujo de alertas. */
class AlertPreconditions
{
    private const MEDICAL_ROLES = ['medico_residente', 'medico_tratante'];

    public function requireAssignedTo(ClinicalAlert $alert, User $user): void
    {
        $this->requireOpen($alert);

        if ($alert->assigned_role === null || $alert->assigned_role === $user->role) {
            return;
        }

        // Guardia médica: alerta asignada a residente también la atiende el tratante.
        if (in_array($alert->assigned_role, self::MEDICAL_ROLES, true)
            && in_array($user->role, self::MEDICAL_ROLES, true)) {
            return;
        }

        throw new ClinicalRuleException('La alerta está asignada a otro perfil.');
    }

    public function requireReassessed(ClinicalAlert $alert): void
    {
        if ($alert->reassessed_at === null) {
            throw new ClinicalRuleException('Registre una nueva toma de constantes antes de disponer la alerta.');
        }
    }

    public function requireOpen(ClinicalAlert $alert): void
    {
        if ($alert->isClosed()) {
            throw new ClinicalRuleException('La alerta ya está cerrada.');
        }
    }

    /** Una alerta de dosis no se atiende con constantes: se cierra al administrar la dosis en e-MAR. */
    public function requireVitalsApply(ClinicalAlert $alert): void
    {
        if ($alert->source === 'emar') {
            throw new ClinicalRuleException('Esta alerta es de una dosis pendiente: adminístrela en e-MAR.');
        }
    }

    public function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }
}
