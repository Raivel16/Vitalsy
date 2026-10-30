<?php

namespace App\Services\Admission;

use App\Models\AdmissionEncounter;

/**
 * RF-16: indicaciones médicas del ingreso (consulta, edición y firma).
 */
class AdmissionMedicalOrders
{
    public function __construct(
        private readonly AdmissionDemoData $demo,
        private readonly AdmissionMedicalOrderFormatter $orderFormatter,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function view(string $encounterId): array
    {
        $this->demo->seed();
        $encounter = $this->locate($encounterId);

        return $this->orderFormatter->view($encounter->readablePayload());
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<string, mixed>
     */
    public function save(string $encounterId, array $items): array
    {
        $this->demo->seed();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $existing = is_array($payload['medicalOrders'] ?? null) ? $payload['medicalOrders'] : [];
        if (($existing['status'] ?? '') === 'firmado') {
            throw new AdmissionBoardException('Las indicaciones ya fueron firmadas.', 422);
        }

        $payload['medicalOrders'] = [
            'status' => $existing['status'] ?? 'pendiente',
            'statusLabel' => $existing['statusLabel'] ?? 'Pendiente de firma',
            'items' => $this->orderFormatter->normalizeItems($items),
        ];
        $encounter->clinical_payload = $payload;
        $encounter->save();

        return $this->view($encounterId);
    }

    /**
     * @param  array<string, mixed>  $signature
     * @return array<string, mixed>
     */
    public function sign(string $encounterId, array $signature): array
    {
        $this->demo->seed();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $existing = is_array($payload['medicalOrders'] ?? null) ? $payload['medicalOrders'] : [];
        $rawItems = $signature['items'] ?? null;
        $items = $this->orderFormatter->normalizeItems(is_array($rawItems) ? $rawItems : ($existing['items'] ?? []));
        $filled = array_values(array_filter($items, fn (array $item) => trim($item['title']) !== ''));
        if ($filled === []) {
            throw new AdmissionBoardException('Debe registrar al menos una indicación.', 422);
        }

        $payload['medicalOrders'] = [
            'status' => 'firmado',
            'statusLabel' => 'Firmado',
            'items' => $filled,
            'signature' => [
                'physicianName' => $signature['physicianName'],
                'credential' => $signature['credential'],
            ],
        ];
        $encounter->clinical_payload = $payload;
        $encounter->save();

        return [
            'status' => 'firmado',
            'physicianName' => $signature['physicianName'],
            'credential' => $signature['credential'],
        ];
    }

    private function locate(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new AdmissionBoardException('No se encontró el ingreso.', 404);
        }

        return $encounter;
    }
}
