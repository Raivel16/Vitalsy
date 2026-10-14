<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\AlertEvent;
use App\Models\CareActivityCompletion;
use App\Models\ClinicalAlert;
use App\Models\ImagingReport;
use App\Models\LabResult;
use App\Models\LifeBaselineImport;
use App\Models\MedicalEvolutionNote;
use App\Models\MedicationAdministration;
use App\Models\NursingEvolutionNote;
use App\Models\Prescription;
use App\Models\VitalSignReading;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PatientClinicalChart
{
    /**
     * Expediente clínico de lectura del ingreso (RF-38).
     *
     * @return array<string, mixed>
     */
    public function forEncounter(string $encounterId, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        $prescription = Prescription::query()
            ->with('items')
            ->where('encounter_id', $encounterId)
            ->where('status', 'activo')
            ->latest('id')
            ->first();

        $vitals = VitalSignReading::query()
            ->where('encounter_id', $encounterId)
            ->tap(fn (Builder $q) => $this->applyDateRange($q, 'recorded_at', $from, $to))
            ->orderByDesc('recorded_at')
            ->limit(100)
            ->get()
            ->map(fn (VitalSignReading $row) => [
                'recordedAt' => optional($row->recorded_at)?->toIso8601String(),
                'pulse' => $row->pulse,
                'respiratoryRate' => $row->rr,
                'oxygenSaturation' => $row->spo2,
                'systolicBloodPressure' => $row->sbp,
                'temperature' => $row->temperature,
                'news2' => $row->news2_total,
            ])
            ->all();

        $labs = LabResult::query()
            ->where('encounter_id', $encounterId)
            ->tap(fn (Builder $q) => $this->applyDateRange($q, 'resulted_at', $from, $to))
            ->orderByDesc('resulted_at')
            ->limit(100)
            ->get()
            ->map(fn (LabResult $row) => [
                'id' => $row->id,
                'summary' => $row->summary,
                'resultedAt' => optional($row->resulted_at)?->toIso8601String(),
            ])
            ->all();

        $imaging = ImagingReport::query()
            ->where('encounter_id', $encounterId)
            ->tap(fn (Builder $q) => $this->applyDateRange($q, 'reported_at', $from, $to))
            ->orderByDesc('reported_at')
            ->limit(100)
            ->get()
            ->map(fn (ImagingReport $row) => [
                'id' => $row->id,
                'modality' => $row->modality,
                'summary' => $row->summary,
                'reportedAt' => optional($row->reported_at)?->toIso8601String(),
            ])
            ->all();

        $medicalNotes = MedicalEvolutionNote::query()
            ->with('author')
            ->where('encounter_id', $encounterId)
            ->tap(fn (Builder $q) => $this->applyDateRange($q, 'signed_at', $from, $to))
            ->orderByDesc('signed_at')
            ->limit(100)
            ->get()
            ->map(fn (MedicalEvolutionNote $row) => [
                'id' => $row->id,
                'body' => $row->body,
                'authoredAt' => optional($row->signed_at ?? $row->created_at)?->toIso8601String(),
                'authorName' => $row->author?->name,
            ])
            ->all();

        $nursingNotes = NursingEvolutionNote::query()
            ->with('author')
            ->where('encounter_id', $encounterId)
            ->tap(fn (Builder $q) => $this->applyDateRange($q, 'created_at', $from, $to))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (NursingEvolutionNote $row) => [
                'id' => $row->id,
                'body' => $row->body,
                'authoredAt' => optional($row->created_at)?->toIso8601String(),
                'authorName' => $row->author?->name,
            ])
            ->all();

        $careActivities = CareActivityCompletion::query()
            ->with('completer')
            ->where('encounter_id', $encounterId)
            ->tap(fn (Builder $q) => $this->applyDateRange($q, 'completed_at', $from, $to))
            ->orderByDesc('completed_at')
            ->limit(100)
            ->get()
            ->map(fn (CareActivityCompletion $row) => [
                'id' => $row->id,
                'activityLabel' => $row->activity_label,
                'completedAt' => optional($row->completed_at)?->toIso8601String(),
                'completedByName' => $row->completer?->name,
            ])
            ->all();

        $emar = MedicationAdministration::query()
            ->with('prescriptionItem')
            ->where('encounter_id', $encounterId)
            ->tap(fn (Builder $q) => $this->applyDateRange($q, 'scheduled_at', $from, $to))
            ->orderByDesc('scheduled_at')
            ->limit(100)
            ->get()
            ->map(fn (MedicationAdministration $dose) => [
                'id' => $dose->id,
                'drugName' => $dose->prescriptionItem?->drug_name,
                'dose' => $dose->prescriptionItem?->dose,
                'route' => $dose->prescriptionItem?->route,
                'status' => $dose->status,
                'scheduledAt' => optional($dose->scheduled_at)?->toIso8601String(),
                'administeredAt' => optional($dose->administered_at)?->toIso8601String(),
            ])
            ->all();

        $clinicalAlerts = ClinicalAlert::query()
            ->with(['events' => fn ($q) => $q->with('user')->orderBy('occurred_at')->orderBy('id')])
            ->where('encounter_id', $encounterId)
            ->orderByDesc('generated_at')
            ->limit(50)
            ->get()
            ->map(fn (ClinicalAlert $alert) => [
                'id' => $alert->id,
                'status' => $alert->status,
                'severity' => $alert->severity,
                'news2Total' => $alert->news2_total,
                'message' => $alert->message,
                'source' => $alert->source,
                'generatedAt' => optional($alert->generated_at)?->toIso8601String(),
                'closedAt' => optional($alert->closed_at)?->toIso8601String(),
                'events' => $alert->events->map(fn (AlertEvent $event) => [
                    'id' => $event->id,
                    'type' => $event->type,
                    'detail' => $event->detail,
                    'role' => $event->role,
                    'userName' => $event->user?->name,
                    'occurredAt' => optional($event->occurred_at)?->toIso8601String(),
                ])->all(),
            ])
            ->all();

        $unreadable = $encounter->payloadUnreadable();
        $payload = $unreadable ? [] : (is_array($encounter->clinical_payload) ? $encounter->clinical_payload : []);
        $assessment = is_array($payload['assessment'] ?? null) ? $payload['assessment'] : null;
        $vitalsBasal = is_array($payload['vitals'] ?? null) ? $payload['vitals'] : null;
        $reconciliation = is_array($payload['reconciliation'] ?? null) ? $payload['reconciliation'] : null;
        $risks = is_array($payload['risks'] ?? null) ? $payload['risks'] : null;
        $medicalOrders = is_array($payload['medicalOrders'] ?? null) ? $payload['medicalOrders'] : null;
        $consent = is_array($payload['consent'] ?? null) ? $payload['consent'] : null;
        $admissionMeds = [];
        foreach ($reconciliation['medications'] ?? [] as $item) {
            if (! is_array($item)) {
                continue;
            }
            $admissionMeds[] = trim(($item['name'] ?? '').' '.($item['dose'] ?? '').' '.($item['frequency'] ?? ''));
        }

        return [
            'encounter' => [
                'encounterId' => $encounter->encounter_id,
                'patientName' => $encounter->patient_name,
                'documentType' => $encounter->document_type,
                'documentNumber' => $encounter->document_number,
                'recordId' => $encounter->record_id,
                'wristbandCode' => $encounter->wristband_code,
                'originService' => $encounter->origin_service,
                'room' => $encounter->room,
                'bed' => $encounter->bed,
                'service' => $encounter->service,
                'coveragePayer' => $encounter->coverage_payer,
                'coverageStatus' => $encounter->coverage_status,
                'currentStep' => $encounter->current_step,
                'createdAt' => optional($encounter->created_at)?->toIso8601String(),
            ],
            'admission' => [
                'unreadable' => $unreadable,
                'deliverables' => $encounter->deliverables ?? [],
                'assessment' => $assessment,
                'vitalsBasal' => $vitalsBasal,
                'reconciliation' => $reconciliation,
                'risks' => $risks,
                'medicalOrders' => $medicalOrders,
                'consent' => $consent,
                'kardexMedications' => array_values(array_filter($admissionMeds)),
            ],
            'lifeBaseline' => LifeBaselineImport::presentFor($encounterId),
            'activePrescription' => $prescription ? [
                'id' => $prescription->id,
                'status' => $prescription->status,
                'signedAt' => optional($prescription->signed_at)?->toIso8601String(),
                'items' => $prescription->items->map(fn ($item) => [
                    'drugName' => $item->drug_name,
                    'dose' => $item->dose,
                    'route' => $item->route,
                    'frequency' => $item->frequency,
                    'drugBarcode' => CpoeService::drugBarcodeFor($item->drug_name, $item->dose),
                ])->all(),
            ] : null,
            'vitalSigns' => $vitals,
            'labResults' => $labs,
            'imagingReports' => $imaging,
            'medicalEvolutionNotes' => $medicalNotes,
            'nursingEvolutionNotes' => $nursingNotes,
            'careActivities' => $careActivities,
            'medicationAdministrations' => $emar,
            'clinicalAlerts' => $clinicalAlerts,
            'filters' => [
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
            ],
        ];
    }

    private function applyDateRange(Builder $query, string $column, ?Carbon $from, ?Carbon $to): void
    {
        if ($from) {
            $query->where($column, '>=', $from);
        }
        if ($to) {
            $query->where($column, '<=', $to);
        }
    }
}
