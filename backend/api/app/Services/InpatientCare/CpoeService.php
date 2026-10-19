<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CpoeService
{
    /**
     * @param  list<array{drugName: string, dose: string, route: string, frequency: string}>  $items
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
                $prescription->items()->create([
                    'drug_name' => $item['drugName'],
                    'dose' => $item['dose'],
                    'route' => $item['route'],
                    'frequency' => $item['frequency'],
                ]);
            }

            return $this->finalize($encounterId, $prescription->fresh('items'));
        });
    }

    /**
     * @param  array{drugName: string, dose: string, route: string, frequency: string}  $item
     * @return array{prescription: array<string, mixed>, kardex: array{medications: list<string>}}
     */
    public function addItem(string $encounterId, array $item): array
    {
        $prescription = $this->requireActive($encounterId);
        $prescription->items()->create([
            'drug_name' => $item['drugName'],
            'dose' => $item['dose'],
            'route' => $item['route'],
            'frequency' => $item['frequency'],
        ]);

        return $this->finalize($encounterId, $prescription->fresh('items'));
    }

    /**
     * @param  array{drugName: string, dose: string, route: string, frequency: string}  $item
     * @return array{prescription: array<string, mixed>, kardex: array{medications: list<string>}}
     */
    public function updateItem(string $encounterId, int $itemId, array $item): array
    {
        $prescription = $this->requireActive($encounterId);
        $row = $prescription->items()->whereKey($itemId)->first();
        if (! $row) {
            throw new NotFoundHttpException('No se encontró el medicamento en el plan activo.');
        }

        $row->update([
            'drug_name' => $item['drugName'],
            'dose' => $item['dose'],
            'route' => $item['route'],
            'frequency' => $item['frequency'],
        ]);

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
     * @return array{id: int, status: string, signedAt: string|null, items: list<array{id: int, drugName: string, dose: string, route: string, frequency: string, drugBarcode: string}>}
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
                'drugBarcode' => self::drugBarcodeFor($item->drug_name, $item->dose),
            ])->all(),
        ];
    }
}
