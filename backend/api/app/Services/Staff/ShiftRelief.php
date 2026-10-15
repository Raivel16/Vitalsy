<?php

namespace App\Services\Staff;

use App\Exceptions\ClinicalRuleException;
use App\Models\StaffShift;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Regla de relevo del handover: la entrega solo procede entre turnos consecutivos del
 * mismo servicio del rol publicado, en el cambio de turno.
 */
class ShiftRelief
{
    /**
     * Control de objeto del handover: si el rol publicado ubica a ambas enfermeras ese día,
     * deben compartir servicio; así no se consultan ni reasignan pacientes de otra unidad.
     */
    public function assertSameUnit(User $incoming, User $outgoing, string $shiftDate): void
    {
        if ($this->boundary($incoming, $outgoing, $shiftDate) === null) {
            throw new ClinicalRuleException('La entrega solo procede en el cambio de turno, entre turnos consecutivos del mismo servicio del rol publicado.');
        }
    }

    /** @return array{unit: string, endsAt: Carbon}|null */
    public function boundary(User $incoming, User $outgoing, string $shiftDate): ?array
    {
        // Turnos que cubren el día, incluidos los nocturnos iniciados el día anterior.
        $shiftsOf = fn (User $user) => StaffShift::query()
            ->where('user_id', $user->id)
            ->whereDate('starts_at', '<=', $shiftDate)
            ->whereDate('ends_at', '>=', $shiftDate)
            ->get();

        // Falla cerrado. Es un relevo real solo si, en el mismo servicio: el turno de la saliente
        // termina el día indicado (así la fecha reasignada es la del turno relevado), empieza el
        // de la entrante en el límite (1 h) y el cambio de turno es ahora (-1 h a +2 h).
        $incomingShifts = $shiftsOf($incoming);
        $now = now();
        foreach ($shiftsOf($outgoing) as $left) {
            if ($left->unit === null || $left->ends_at->toDateString() !== $shiftDate) {
                continue;
            }
            $secondsToBoundary = $now->diffInSeconds($left->ends_at, false);
            if ($secondsToBoundary > 3600 || $secondsToBoundary < -7200) {
                continue;
            }
            $matches = $incomingShifts->contains(fn (StaffShift $right) => $right->unit === $left->unit
                && abs($left->ends_at->diffInSeconds($right->starts_at, false)) <= 3600);
            if ($matches) {
                return ['unit' => $left->unit, 'endsAt' => $left->ends_at];
            }
        }

        return null;
    }
}
