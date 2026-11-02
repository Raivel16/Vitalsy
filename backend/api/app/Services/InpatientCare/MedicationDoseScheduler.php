<?php

namespace App\Services\InpatientCare;

use App\Models\MedicationAdministration;
use App\Models\PatientExit;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Support\MedicationFrequency;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * RF-25 / RF-32: crea las dosis desde la primera dosis y la frecuencia indicadas, al firmar
 * y luego con 24 horas de adelanto. El turno solo decide qué muestra el e-MAR.
 */
class MedicationDoseScheduler
{
    /** Margen para aceptar una primera dosis en el minuto en curso. */
    public const PAST_TOLERANCE_MINUTES = 5;

    private const HORIZON_HOURS = 24;

    public function __construct(private readonly MonitoringControlsBoard $board) {}

    public function syncEncounter(string $encounterId): void
    {
        if (PatientExit::query()->where('encounter_id', $encounterId)->exists()) {
            return;
        }

        // El bloqueo evita dosis duplicadas si coinciden la tarea programada, el e-MAR y una firma.
        DB::transaction(function () use ($encounterId) {
            $prescription = Prescription::query()
                ->with('items')
                ->where('encounter_id', $encounterId)
                ->where('status', 'activo')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $prescription) {
                return;
            }

            $this->cancelPending(
                MedicationAdministration::query()
                    ->where('encounter_id', $encounterId)
                    ->whereNotIn('prescription_item_id', $prescription->items->pluck('id')->all()),
                'Dosis cancelada: el medicamento ya no está en el plan activo.',
            );

            foreach ($prescription->items as $item) {
                $this->scheduleItem($encounterId, $item);
            }
        });
    }

    public function extendActivePlans(): int
    {
        $encounterIds = Prescription::query()
            ->where('status', 'activo')
            ->whereNotIn('encounter_id', PatientExit::query()->select('encounter_id'))
            ->distinct()
            ->pluck('encounter_id');

        foreach ($encounterIds as $encounterId) {
            $this->syncEncounter($encounterId);
        }

        return $encounterIds->count();
    }

    public function cancelPendingForItem(int $itemId, string $reason): void
    {
        $this->cancelPending(MedicationAdministration::query()->where('prescription_item_id', $itemId), $reason);
    }

    public function cancelPendingForEncounter(string $encounterId, string $reason): void
    {
        $this->cancelPending(MedicationAdministration::query()->where('encounter_id', $encounterId), $reason);
    }

    /**
     * @param  Builder<MedicationAdministration>  $doses
     */
    private function cancelPending(Builder $doses, string $reason): void
    {
        foreach ($doses->where('status', 'pendiente')->get() as $dose) {
            $dose->update(['status' => 'cancelado']);
            $this->board->closeComplianceAlert('emar:'.$dose->id, $reason, null);
        }
    }

    private function scheduleItem(string $encounterId, PrescriptionItem $item): void
    {
        if (! MedicationFrequency::isSchedulable($item->frequency)) {
            return;
        }

        $interval = MedicationFrequency::intervalHours($item->frequency);
        $lastAt = MedicationAdministration::query()
            ->where('prescription_item_id', $item->id)
            ->where('status', '!=', 'cancelado')
            ->max('scheduled_at');
        $last = $lastAt ? Carbon::parse($lastAt) : null;

        $floor = now()->subMinutes(self::PAST_TOLERANCE_MINUTES);
        $horizon = now()->addHours(self::HORIZON_HOURS);

        if ($interval === null) {
            $first = $item->first_dose_at;
            if (! $last && $first && $first->gte($floor) && $first->lte($horizon)) {
                $this->createDose($encounterId, $item, $first);
            }

            return;
        }

        $anchor = Carbon::parse($item->first_dose_at ?? $last ?? now());
        $cursor = $last && $last->gte($anchor) ? $last->copy()->addHours($interval) : $anchor;

        while ($cursor->lt($floor)) {
            $cursor->addHours($interval);
        }

        for (; $cursor->lte($horizon); $cursor->addHours($interval)) {
            $this->createDose($encounterId, $item, $cursor);
        }
    }

    private function createDose(string $encounterId, PrescriptionItem $item, Carbon $at): void
    {
        MedicationAdministration::query()->create([
            'encounter_id' => $encounterId,
            'prescription_item_id' => $item->id,
            'scheduled_at' => $at->copy(),
            'status' => 'pendiente',
        ]);
    }
}
