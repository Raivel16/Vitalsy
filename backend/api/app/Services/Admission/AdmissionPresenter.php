<?php

namespace App\Services\Admission;

use App\Models\AdmissionEncounter;

/** Representación de un ingreso para el tablero de admisión (pasos, entregables, resumen clínico). */
class AdmissionPresenter
{
    /** Orden de presentación: por paso vigente y luego por nombre del paciente. */
    public function sortKey(AdmissionEncounter $encounter): string
    {
        $index = array_search($encounter->current_step, array_keys(AdmissionBoard::STEPS), true);

        return str_pad((string) $index, 2, '0', STR_PAD_LEFT).$encounter->patient_name;
    }

    /**
     * @return array<string, mixed>
     */
    public function present(AdmissionEncounter $encounter): array
    {
        $step = AdmissionBoard::STEPS[$encounter->current_step] ?? [
            'role' => null,
            'subprocess' => '1.3',
            'label' => 'Egresado',
            'status' => 'Egresado',
        ];
        $waiting = $encounter->waiting_reason !== null;
        // RNF-06: un payload ilegible (lectura degradada) jamas se presenta como "sin datos".
        $unreadable = $encounter->payloadUnreadable();
        $payload = $unreadable ? [] : $encounter->readablePayload();

        return [
            'encounterId' => $encounter->encounter_id,
            'orderNumber' => $encounter->order_number,
            'source' => $encounter->source,
            'transferOrderNumber' => $encounter->transfer_order_number,
            'patientName' => $encounter->patient_name,
            'documentType' => $encounter->document_type,
            'documentNumber' => $encounter->document_number,
            'originService' => $encounter->origin_service,
            'coverage' => [
                'payer' => $encounter->coverage_payer,
                'status' => $encounter->coverage_status,
                'plan' => $encounter->coverage_plan,
            ],
            'location' => [
                'room' => $encounter->room,
                'bed' => $encounter->bed,
                'service' => $encounter->service,
            ],
            'wristbandCode' => $encounter->wristband_code,
            'recordId' => $encounter->record_id,
            'subprocess' => $step['subprocess'],
            'subprocessLabel' => AdmissionBoard::SUBPROCESS[$step['subprocess']],
            'currentStep' => $encounter->current_step,
            'currentStepLabel' => $waiting ? 'Esperar regularización de cobertura' : $step['label'],
            'nextRole' => $waiting || $encounter->current_step === 'cerrado' ? null : $step['role'],
            'statusLabel' => $waiting ? 'En trámite de cobertura' : $step['status'],
            'unreadable' => $unreadable,
            'clinical' => $this->clinical($payload, $unreadable),
            'coverageReferral' => $this->coverageReferral($this->asArray($payload['referral'] ?? null)),
            'deliverables' => $this->deliverables($encounter),
            'progress' => $this->progress($encounter, $waiting),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function clinical(array $payload, bool $unreadable): array
    {
        $assessment = $this->asArray($payload['assessment'] ?? null);
        $reconciliation = $this->asArray($payload['reconciliation'] ?? null);

        return [
            'unreadable' => $unreadable,
            'allergies' => $this->allergies($assessment, $unreadable),
            'medications' => $this->medications($reconciliation, $unreadable),
            'filiation' => $this->asArray($payload['filiation'] ?? null),
            'consent' => $this->asArray($payload['consent'] ?? null),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $assessment
     * @return list<string>|null
     */
    private function allergies(?array $assessment, bool $unreadable): ?array
    {
        if ($unreadable || $assessment === null || ! is_array($assessment['allergies'] ?? null)) {
            return null;
        }

        return array_values(array_filter($assessment['allergies'], fn ($item) => is_string($item) && trim($item) !== ''));
    }

    /**
     * @param  array<string, mixed>|null  $reconciliation
     * @return list<string>|null
     */
    private function medications(?array $reconciliation, bool $unreadable): ?array
    {
        if ($unreadable || $reconciliation === null) {
            return null;
        }

        $medications = [];
        foreach ($reconciliation['medications'] ?? [] as $item) {
            if (is_array($item) && trim((string) ($item['name'] ?? '')) !== '') {
                $medications[] = trim($item['name'].' '.($item['dose'] ?? '').' '.($item['frequency'] ?? ''));
            }
        }

        return $medications;
    }

    /**
     * @param  array<string, mixed>|null  $referral
     * @return array<string, mixed>|null
     */
    private function coverageReferral(?array $referral): ?array
    {
        if (! $referral) {
            return null;
        }

        $isCashier = ($referral['destination'] ?? '') === 'caja';

        return [
            'destination' => $referral['destination'],
            'destinationLabel' => $isCashier ? 'Caja' : 'Trabajo social',
            'status' => $referral['status'] ?? 'derivado',
            'relativeName' => $referral['relativeName'] ?? '',
            'relativePhone' => $referral['relativePhone'] ?? null,
            'note' => $referral['note'] ?? null,
            'registeredAt' => $referral['registeredAt'] ?? null,
        ];
    }

    /**
     * @return list<array{id: string, label: string, done: bool}>
     */
    private function deliverables(AdmissionEncounter $encounter): array
    {
        $flags = $encounter->deliverables;
        $deliverables = [];
        foreach (AdmissionBoard::DELIVERABLES as $id => $label) {
            $deliverables[] = ['id' => $id, 'label' => $label, 'done' => (bool) ($flags[$id] ?? false)];
        }

        return $deliverables;
    }

    /**
     * @return list<array{id: string, label: string, state: string}>
     */
    private function progress(AdmissionEncounter $encounter, bool $waiting): array
    {
        $current = $encounter->current_step === 'derivacion' ? 'cobertura' : $encounter->current_step;
        $currentIndex = array_search($current, AdmissionBoard::FLOW_STEPS, true);
        if ($currentIndex === false) {
            $currentIndex = count(AdmissionBoard::FLOW_STEPS);
        }

        $progress = [];
        foreach (AdmissionBoard::FLOW_STEPS as $index => $stepId) {
            $progress[] = [
                'id' => $stepId,
                'label' => AdmissionBoard::STEPS[$stepId]['label'],
                'state' => $this->stepState($index, $stepId, $currentIndex, $waiting),
            ];
        }

        return $progress;
    }

    private function stepState(int $index, string $stepId, int $currentIndex, bool $waiting): string
    {
        if (($waiting && $stepId === 'cobertura') || $index === $currentIndex) {
            return 'current';
        }

        return $index < $currentIndex ? 'done' : 'pending';
    }

    /** @return array<string, mixed>|null */
    private function asArray(mixed $value): ?array
    {
        return is_array($value) ? $value : null;
    }
}
