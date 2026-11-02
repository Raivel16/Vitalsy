<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\MedicationAdministration;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmarService
{
    public function __construct(private readonly MedicationDoseScheduler $scheduler) {}

    /**
     * @return array{doses: list<array<string, mixed>>, shiftStart: string, shiftEnd: string, hasActivePrescription: bool}
     */
    public function listShift(string $encounterId): array
    {
        $this->requireEncounter($encounterId);
        $this->scheduler->syncEncounter($encounterId);

        [$start, $end] = $this->shiftWindow();

        $hasActive = Prescription::query()
            ->where('encounter_id', $encounterId)
            ->where('status', 'activo')
            ->exists();

        $doses = MedicationAdministration::query()
            ->with('prescriptionItem')
            ->where('encounter_id', $encounterId)
            // Una dosis vencida de otro turno sigue visible: su alerta solo se cierra al administrarla.
            ->where(fn ($query) => $query
                ->whereBetween('scheduled_at', [$start, $end])
                ->orWhere(fn ($overdue) => $overdue->where('status', 'pendiente')->where('scheduled_at', '<', $start)))
            ->orderBy('scheduled_at')
            ->get()
            ->map(fn (MedicationAdministration $dose) => $this->present($dose))
            ->all();

        return [
            'doses' => $doses,
            'shiftStart' => $start->toIso8601String(),
            'shiftEnd' => $end->toIso8601String(),
            'hasActivePrescription' => $hasActive,
        ];
    }

    /**
     * @param  array{patientBarcode: string, drugBarcode: string, sign?: bool}  $payload
     * @return array{dose: array<string, mixed>}
     */
    public function administer(string $encounterId, int $doseId, array $payload, User $nurse): array
    {
        $encounter = $this->requireEncounter($encounterId);
        $dose = MedicationAdministration::query()
            ->with('prescriptionItem')
            ->where('encounter_id', $encounterId)
            ->whereKey($doseId)
            ->first();

        if (! $dose) {
            throw new NotFoundHttpException('No se encontró la dosis programada.');
        }

        if ($dose->status === 'administrado') {
            throw ValidationException::withMessages([
                'dose' => ['La dosis ya fue administrada.'],
            ]);
        }

        $item = $dose->prescriptionItem;
        $expectedDrug = $this->drugBarcode($item);
        $patientOk = hash_equals((string) $encounter->wristband_code, trim($payload['patientBarcode']));
        $drugOk = hash_equals($expectedDrug, strtoupper(trim($payload['drugBarcode'])));

        if (! $patientOk || ! $drugOk) {
            $dose->barcode_ok = false;
            $dose->save();
            throw ValidationException::withMessages([
                'barcode' => ['Los cinco correctos no coinciden. Administración bloqueada.'],
            ]);
        }

        if (! ($payload['sign'] ?? false)) {
            throw ValidationException::withMessages([
                'sign' => ['Debe firmar digitalmente la dosis administrada.'],
            ]);
        }

        $dose->status = 'administrado';
        $dose->administered_at = now();
        $dose->nurse_user_id = $nurse->id;
        $dose->barcode_ok = true;
        $dose->save();

        app(MonitoringControlsBoard::class)
            ->closeComplianceAlert('emar:'.$dose->id, 'Dosis administrada en e-MAR.', $nurse);

        return ['dose' => $this->present($dose->fresh('prescriptionItem'))];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function shiftWindow(): array
    {
        $now = now();
        // Turno diurno 07–19 / nocturno 19–07.
        if ((int) $now->format('H') >= 7 && (int) $now->format('H') < 19) {
            $start = $now->copy()->setTime(7, 0);
            $end = $now->copy()->setTime(19, 0);
        } else {
            $start = (int) $now->format('H') >= 19
                ? $now->copy()->setTime(19, 0)
                : $now->copy()->subDay()->setTime(19, 0);
            $end = $start->copy()->addHours(12);
        }

        return [$start, $end];
    }

    private function drugBarcode(?PrescriptionItem $item): string
    {
        if (! $item) {
            return '';
        }

        return CpoeService::drugBarcodeFor($item->drug_name, $item->dose);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(MedicationAdministration $dose): array
    {
        $item = $dose->prescriptionItem;

        return [
            'id' => $dose->id,
            'drugName' => $item?->drug_name,
            'dose' => $item?->dose,
            'route' => $item?->route,
            'frequency' => $item?->frequency,
            'scheduledAt' => optional($dose->scheduled_at)?->toIso8601String(),
            'administeredAt' => optional($dose->administered_at)?->toIso8601String(),
            'status' => $dose->status,
            'barcodeOk' => $dose->barcode_ok,
        ];
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }
}
