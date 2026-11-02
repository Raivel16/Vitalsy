<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CpoeService
{
    public function __construct(private readonly MedicationDoseScheduler $scheduler) {}

    /**
     * @param  list<array{drugName: string, dose: string, route: string, frequency: string, firstDoseAt?: string}>  $items
     * @return array{prescription: array<string, mixed>, kardex: array{medications: list<string>}}
     */
    public function prescribe(string $encounterId, User $prescriber, array $items, bool $continuePlan = false): array
    {
        $this->requireEncounter($encounterId);

        return DB::transaction(function () use ($encounterId, $prescriber, $items, $continuePlan) {
            $merged = $items;
            $active = Prescription::query()
                ->with('items')
                ->where('encounter_id', $encounterId)
                ->where('status', 'activo')
                ->latest('id')
                ->first();

            if ($continuePlan && $active) {
                $merged = array_merge(
                    $active->items->map(fn (PrescriptionItem $item) => [
                        'drugName' => $item->drug_name,
                        'dose' => $item->dose,
                        'route' => $item->route,
                        'frequency' => $item->frequency,
                        'firstDoseAt' => $item->first_dose_at?->toIso8601String(),
                    ])->all(),
                    $items,
                );
            }

            Prescription::query()
                ->where('encounter_id', $encounterId)
                ->where('status', 'activo')
                ->update(['status' => 'reemplazado']);

            $prescription = Prescription::query()->create([
                'encounter_id' => $encounterId,
                'status' => 'activo',
                'prescribed_by' => $prescriber->id,
                'signed_at' => now(),
            ]);

            foreach ($merged as $item) {
                $prescription->items()->create($this->itemColumns($item));
            }

            return $this->finalize($encounterId, $prescription->fresh('items'));
        });
    }

    /**
     * @param  array{drugName: string, dose: string, route: string, frequency: string, firstDoseAt: string}  $item
     * @return array{prescription: array<string, mixed>, kardex: array{medications: list<string>}}
     */
    public function addItem(string $encounterId, array $item): array
    {
        $prescription = $this->requireActive($encounterId);
        $prescription->items()->create($this->itemColumns($item));

        return $this->finalize($encounterId, $prescription->fresh('items'));
    }

    /**
     * @param  array{drugName: string, dose: string, route: string, frequency: string, firstDoseAt: string}  $item
     * @return array{prescription: array<string, mixed>, kardex: array{medications: list<string>}}
     */
    public function updateItem(string $encounterId, int $itemId, array $item): array
    {
        $prescription = $this->requireActive($encounterId);
        $row = $prescription->items()->whereKey($itemId)->first();
        if (! $row) {
            throw new NotFoundHttpException('No se encontró el medicamento en el plan activo.');
        }

        $columns = $this->itemColumns($item);
        if ($this->scheduleChanges($row, $columns)) {
            $this->requireFutureFirstDose($columns['first_dose_at']);
            $this->scheduler->cancelPendingForItem($row->id, 'Dosis cancelada: el médico cambió el horario.');
        }

        $row->update($columns);

        return $this->finalize($encounterId, $prescription->fresh('items'));
    }

    /**
     * @return array{prescription: array<string, mixed>, kardex: array{medications: list<string>}}
     */
    public function deleteItem(string $encounterId, int $itemId): array
    {
        $prescription = $this->requireActive($encounterId);
        $row = $prescription->items()->whereKey($itemId)->first();
        if (! $row) {
            throw new NotFoundHttpException('No se encontró el medicamento en el plan activo.');
        }

        if ($prescription->items()->count() <= 1) {
            throw ValidationException::withMessages([
                'item' => ['No puede eliminar el último medicamento. Agregue otro o reemplace el plan.'],
            ]);
        }

        $this->scheduler->cancelPendingForItem($row->id, 'Dosis cancelada: el medicamento salió del plan.');
        $row->delete();

        return $this->finalize($encounterId, $prescription->fresh('items'));
    }

    /**
     * @return array{prescription: array<string, mixed>|null}
     */
    public function active(string $encounterId): array
    {
        $this->requireEncounter($encounterId);

        $prescription = Prescription::query()
            ->with('items')
            ->where('encounter_id', $encounterId)
            ->where('status', 'activo')
            ->latest('id')
            ->first();

        return [
            'prescription' => $prescription ? $this->present($prescription) : null,
        ];
    }

    /**
     * @return array{medications: list<string>, source: string}
     */
    public function kardex(string $encounterId): array
    {
        $this->requireEncounter($encounterId);

        $prescription = Prescription::query()
            ->with('items')
            ->where('encounter_id', $encounterId)
            ->where('status', 'activo')
            ->latest('id')
            ->first();

        if ($prescription) {
            return $this->kardexFromPrescription($prescription);
        }

        return [
            'medications' => [],
            'source' => 'cpoe',
        ];
    }

    public static function drugBarcodeFor(string $drugName, string $dose): string
    {
        $name = strtoupper(preg_replace('/\s+/', '', $drugName) ?? '');
        $doseCode = strtoupper(preg_replace('/\s+/', '', $dose) ?? '');

        return "DRUG-{$name}-{$doseCode}";
    }

    /**
     * @param  array{drugName: string, dose: string, route: string, frequency: string, firstDoseAt?: string|null}  $item
     * @return array{drug_name: string, dose: string, route: string, frequency: string, first_dose_at: Carbon}
     */
    private function itemColumns(array $item): array
    {
        return [
            'drug_name' => $item['drugName'],
            'dose' => $item['dose'],
            'route' => $item['route'],
            'frequency' => $item['frequency'],
            // El plan basal del BPMH no trae hora: su primera dosis es la de la firma.
            'first_dose_at' => isset($item['firstDoseAt'])
                ? Carbon::parse($item['firstDoseAt'])->setTimezone((string) config('app.timezone'))
                : now(),
        ];
    }

    /**
     * @param  array{frequency: string, first_dose_at: Carbon}  $columns
     */
    private function scheduleChanges(PrescriptionItem $row, array $columns): bool
    {
        return $row->frequency !== $columns['frequency']
            || $row->first_dose_at?->format('Y-m-d H:i') !== $columns['first_dose_at']->format('Y-m-d H:i');
    }

    private function requireFutureFirstDose(Carbon $firstDoseAt): void
    {
        if ($firstDoseAt->lt(now()->subMinutes(MedicationDoseScheduler::PAST_TOLERANCE_MINUTES))) {
            throw ValidationException::withMessages([
                'firstDoseAt' => ['La primera dosis no puede estar en el pasado.'],
            ]);
        }
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }

    private function requireActive(string $encounterId): Prescription
    {
        $this->requireEncounter($encounterId);
        $prescription = Prescription::query()
            ->with('items')
            ->where('encounter_id', $encounterId)
            ->where('status', 'activo')
            ->latest('id')
            ->first();

        if (! $prescription) {
            throw new NotFoundHttpException('No hay prescripción CPOE activa.');
        }

        return $prescription;
    }

    /**
     * @return array{prescription: array<string, mixed>, kardex: array{medications: list<string>}}
     */
    private function finalize(string $encounterId, Prescription $prescription): array
    {
        $kardex = $this->kardexFromPrescription($prescription);

        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->firstOrFail();
        $payload = $encounter->readablePayload();
        $payload['cpoeKardex'] = $kardex;
        $encounter->clinical_payload = $payload;
        $encounter->save();

        $this->scheduler->syncEncounter($encounterId);

        return [
            'prescription' => $this->present($prescription),
            'kardex' => $kardex,
        ];
    }

    /**
     * @return array{medications: list<string>, source: string}
     */
    private function kardexFromPrescription(Prescription $prescription): array
    {
        $medications = $prescription->items->map(
            fn (PrescriptionItem $item) => trim("{$item->drug_name} {$item->dose} {$item->frequency}"),
        )->all();

        return [
            'medications' => $medications,
            'source' => 'cpoe',
        ];
    }

    /**
     * @return array{id: int, status: string, signedAt: string|null, items: list<array{id: int, drugName: string, dose: string, route: string, frequency: string, firstDoseAt: string|null, drugBarcode: string}>}
     */
    private function present(Prescription $prescription): array
    {
        return [
            'id' => $prescription->id,
            'status' => $prescription->status,
            'signedAt' => optional($prescription->signed_at)?->toIso8601String(),
            'items' => $prescription->items->map(fn (PrescriptionItem $item) => [
                'id' => $item->id,
                'drugName' => $item->drug_name,
                'dose' => $item->dose,
                'route' => $item->route,
                'frequency' => $item->frequency,
                'firstDoseAt' => $item->first_dose_at?->toIso8601String(),
                'drugBarcode' => self::drugBarcodeFor($item->drug_name, $item->dose),
            ])->all(),
        ];
    }
}
