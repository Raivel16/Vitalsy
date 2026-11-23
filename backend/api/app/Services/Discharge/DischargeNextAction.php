<?php

namespace App\Services\Discharge;

/**
 * Siguiente acción del egreso según el avance (banderas por entregable) y el rol de quien consulta.
 *
 * No es un stepper libre: cada entregable abre el siguiente. Con el pase emitido,
 * solo la enfermera de piso registra la salida; el camillero ve el traslado y el
 * resto espera esa salida. Antes del pase, cada rol ve el primer entregable que
 * le falta. Si no le queda ninguno propio, se pide lo social o la conciliación
 * y, en último caso, la cuenta de caja.
 */
final class DischargeNextAction
{
    private const ROLE_CHECKLISTS = [
        'trabajo_social' => ['social'],
        'medico_residente' => ['order', 'epicrisis', 'prescriptions'],
        'medico_tratante' => ['order', 'epicrisis', 'prescriptions'],
        'enfermera_piso' => ['reconciliation', 'nursing', 'receipt'],
    ];

    /** @param  array<string, bool>  $done */
    public function resolve(array $done, ?string $role): ?string
    {
        if ($done['exit']) {
            return null;
        }
        if ($done['pass']) {
            return match ($role) {
                'enfermera_piso' => 'exit',
                'camillero' => 'transfer',
                default => 'await_exit',
            };
        }

        return $this->pending($done, $role);
    }

    /** @param  array<string, bool>  $done */
    private function pending(array $done, ?string $role): string
    {
        if ($done['account'] && $done['nursing'] && $done['receipt'] && $done['social']) {
            return 'pass';
        }

        return $this->roleStep($done, $role)
            ?? $this->firstMissing($done, ['social', 'reconciliation'])
            ?? 'account';
    }

    /** @param  array<string, bool>  $done */
    private function roleStep(array $done, ?string $role): ?string
    {
        if ($role === 'altas_caja') {
            return $done['account'] ? 'pass' : 'account';
        }

        return $this->firstMissing($done, self::ROLE_CHECKLISTS[$role ?? ''] ?? []);
    }

    /**
     * @param  array<string, bool>  $done
     * @param  list<string>  $keys
     */
    private function firstMissing(array $done, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (! $done[$key]) {
                return $key;
            }
        }

        return null;
    }
}
