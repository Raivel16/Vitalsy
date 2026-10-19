<?php

namespace App\Services\ClinicalAlerts;

use App\Models\ClinicalAlert;
use App\Models\User;

/** Cuándo una alerta exige la sirena (solo calla al confirmar la lectura) y cuándo espera acuse. */
class AlertSirenPolicy
{
    /** Perfiles médicos que reciben la notificación de alta prioridad. */
    private const MEDICAL_ROLES = ['medico_residente', 'medico_tratante'];

    private const ICU_TRANSFER_ROLES = ['enfermera_piso', 'enfermera_supervisora', 'camillero'];

    public function needsSiren(ClinicalAlert $alert, ?User $viewer = null): bool
    {
        if ($alert->isClosed()) {
            return false;
        }

        if ($this->awaitsAcknowledgement($alert) || $this->followUpOverdue($alert)) {
            return true;
        }

        return match ($alert->status) {
            ClinicalAlert::STATUS_ICU_ORDERED => $this->icuOrderedNeedsSiren($alert, $viewer),
            ClinicalAlert::STATUS_ICU_AUTHORIZED => $viewer === null || in_array($viewer->role, self::ICU_TRANSFER_ROLES, true),
            default => false,
        };
    }

    public function awaitsAcknowledgement(ClinicalAlert $alert): bool
    {
        return in_array($alert->status, [
            ClinicalAlert::STATUS_OPEN,
            ClinicalAlert::STATUS_SUPERVISOR,
            ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
            ClinicalAlert::STATUS_RRT_REQUESTED,
            ClinicalAlert::STATUS_RRT_ESCALATED,
        ], true);
    }

    private function followUpOverdue(ClinicalAlert $alert): bool
    {
        return $alert->status === ClinicalAlert::STATUS_IN_PROGRESS
            && $alert->follow_up_due_at !== null
            && $alert->follow_up_due_at->lte(now());
    }

    private function icuOrderedNeedsSiren(ClinicalAlert $alert, ?User $viewer): bool
    {
        if ($viewer === null) {
            return ! $alert->icuFullyAuthorized();
        }
        if (in_array($viewer->role, self::MEDICAL_ROLES, true)) {
            return $alert->icu_doctor_authorized_at === null;
        }

        return $viewer->role === 'enfermera_piso' && $alert->icu_nurse_authorized_at === null;
    }
}
