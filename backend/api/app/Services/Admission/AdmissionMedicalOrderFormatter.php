<?php

namespace App\Services\Admission;

/** Normalización y vista de las indicaciones médicas de ingreso (RF-26). */
class AdmissionMedicalOrderFormatter
{
    private const PENDING_LABEL = 'Pendiente de firma';

    /**
     * @param  array<int, mixed>  $items
     * @return list<array{title: string, detail: string, category: string}>
     */
    public function normalizeItems(array $items): array
    {
        $normalized = [];
        foreach ($items as $item) {
            if (is_string($item)) {
                $normalized[] = ['title' => trim($item), 'detail' => '', 'category' => ''];
            } elseif (is_array($item)) {
                $normalized[] = [
                    'title' => trim((string) ($item['title'] ?? '')),
                    'detail' => trim((string) ($item['detail'] ?? '')),
                    'category' => trim((string) ($item['category'] ?? '')),
                ];
            }
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $payload  clinical_payload legible del ingreso
     * @return array<string, mixed>
     */
    public function view(array $payload): array
    {
        $orders = $this->section($payload, 'medicalOrders');
        $assessment = $this->section($payload, 'assessment');
        $vitals = $this->section($payload, 'vitals');
        $reconciliation = $this->section($payload, 'reconciliation');
        $risks = $this->section($payload, 'risks');

        return [
            'status' => $orders['status'] ?? 'pendiente',
            'statusLabel' => $orders['statusLabel'] ?? self::PENDING_LABEL,
            'items' => $this->normalizeItems($orders['items'] ?? []),
            'chiefComplaint' => $assessment['chiefComplaint'] ?? null,
            'allergies' => $this->strings($assessment['allergies'] ?? []),
            'history' => $this->text($assessment, 'history'),
            'vitals' => [
                'summary' => $this->text($vitals, 'summary'),
                'news2Label' => $this->text($vitals, 'news2Label'),
            ],
            'reconciliation' => [
                'medications' => $this->medications($reconciliation),
                'noHomeMedications' => (bool) ($reconciliation['noHomeMedications'] ?? false),
                'notes' => $this->text($reconciliation, 'notes'),
                'alerts' => $this->strings($reconciliation['alerts'] ?? []),
            ],
            'risks' => [
                'fallRisk' => $this->text($risks, 'fallRisk'),
                'pressureRisk' => $this->text($risks, 'pressureRisk'),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function section(array $payload, string $key): array
    {
        return is_array($payload[$key] ?? null) ? $payload[$key] : [];
    }

    /** @param  array<string, mixed>  $source */
    private function text(array $source, string $key): ?string
    {
        return is_string($source[$key] ?? null) ? $source[$key] : null;
    }

    /**
     * @param  array<int, mixed>  $list
     * @return list<string>
     */
    private function strings(array $list): array
    {
        return array_values(array_filter($list, fn ($item) => is_string($item) && trim($item) !== ''));
    }

    /**
     * @param  array<string, mixed>  $reconciliation
     * @return list<array{name: string, dose: string, route: string, frequency: string}>
     */
    private function medications(array $reconciliation): array
    {
        $medications = [];
        foreach ($reconciliation['medications'] ?? [] as $item) {
            if (! is_array($item)) {
                continue;
            }
            $medications[] = [
                'name' => trim((string) ($item['name'] ?? '')),
                'dose' => trim((string) ($item['dose'] ?? '')),
                'route' => trim((string) ($item['route'] ?? '')),
                'frequency' => trim((string) ($item['frequency'] ?? '')),
            ];
        }

        return $medications;
    }
}
