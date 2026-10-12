<?php

namespace App\Listeners;

use App\Events\PatientExited;
use App\Models\LifeDischargePlan;

/** RF-98: al salir el paciente, la custodia del plan pasa a la app y el plan queda activo. */
class ActivateLifePlanOnExit
{
    public function handle(PatientExited $event): void
    {
        $plan = LifeDischargePlan::query()->where('encounter_id', $event->encounterId)->first();
        if (! $plan) {
            return;
        }

        $plan->update([
            'custody_transferred_at' => now(),
            'status' => $plan->status === 'pendiente' ? 'activo' : $plan->status,
        ]);
    }
}
