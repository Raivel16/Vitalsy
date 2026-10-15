<?php

namespace App\Services\ClinicalAlerts;

use App\Models\ClinicalAlert;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Quién ve una alerta en su bandeja. Refleja exactamente la consulta de
 * AlertWorkflow::inboxFor (hay una prueba de paridad) para que el push por
 * WebSocket llegue a los mismos destinatarios que el polling.
 */
final class AlertAudience
{
    private const MEDICAL_ROLES = ['medico_residente', 'medico_tratante'];

    private const MEDICAL_STATUSES = [
        ClinicalAlert::STATUS_DOCTOR_NOTIFIED,
        ClinicalAlert::STATUS_DOCTOR_IN_PROGRESS,
        ClinicalAlert::STATUS_ICU_ORDERED,
        ClinicalAlert::STATUS_ICU_AUTHORIZED,
        ClinicalAlert::STATUS_IN_ICU,
    ];

    private const ICU_STATUSES = [
        ClinicalAlert::STATUS_ICU_ORDERED,
        ClinicalAlert::STATUS_ICU_AUTHORIZED,
        ClinicalAlert::STATUS_IN_ICU,
    ];

    private const ICU_LATE_STATUSES = [
        ClinicalAlert::STATUS_ICU_AUTHORIZED,
        ClinicalAlert::STATUS_IN_ICU,
    ];

    public static function sees(User $user, ClinicalAlert $alert): bool
    {
        if ($alert->status === ClinicalAlert::STATUS_CLOSED) {
            return false;
        }

        return self::isAssignedTo($user, $alert)
            || self::seesAsDoctor($user, $alert)
            || self::seesAsNurse($user, $alert);
    }

    private static function isAssignedTo(User $user, ClinicalAlert $alert): bool
    {
        return $alert->assigned_role === $user->role
            || ($alert->assigned_user_id !== null && (int) $alert->assigned_user_id === $user->id);
    }

    private static function seesAsDoctor(User $user, ClinicalAlert $alert): bool
    {
        return in_array($user->role, self::MEDICAL_ROLES, true)
            && (in_array($alert->assigned_role, self::MEDICAL_ROLES, true)
                || in_array($alert->status, self::MEDICAL_STATUSES, true));
    }

    private static function seesAsNurse(User $user, ClinicalAlert $alert): bool
    {
        if ($user->role === 'enfermera_piso') {
            return in_array($alert->status, self::ICU_STATUSES, true);
        }

        return in_array($user->role, ['enfermera_supervisora', 'camillero'], true)
            && in_array($alert->status, self::ICU_LATE_STATUSES, true);
    }

    /**
     * Usuarios de personal activos que ven la alerta en su estado actual.
     *
     * @return Collection<int, User>
     */
    public static function recipients(ClinicalAlert $alert): Collection
    {
        $roles = array_values(array_filter(array_unique([
            $alert->assigned_role,
            ...self::MEDICAL_ROLES,
            'enfermera_piso',
            'enfermera_supervisora',
            'camillero',
        ])));

        return User::query()
            ->where('is_active', true)
            ->where(function ($query) use ($roles, $alert) {
                $query->whereIn('role', $roles);
                if ($alert->assigned_user_id !== null) {
                    $query->orWhere('id', $alert->assigned_user_id);
                }
            })
            ->get()
            ->filter(fn (User $user) => self::sees($user, $alert))
            ->values();
    }
}
