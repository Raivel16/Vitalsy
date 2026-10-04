<?php

namespace App\Services\Interoperability;

class StubLisClient implements LisClient
{
    public function fetchLabResults(string $encounterId): array
    {
        return [
            [
                'externalId' => 'LIS-OBS-1001',
                'summary' => 'Hemoglobina 11.2 g/dL',
                'resultedAt' => '2026-09-21T08:15:00+00:00',
                'payload' => [
                    'resourceType' => 'fhir.Observation',
                    'id' => 'LIS-OBS-1001',
                    'status' => 'final',
                    'code' => ['text' => 'Hemoglobina'],
                    'subject' => ['reference' => "Encounter/{$encounterId}"],
                    'valueQuantity' => ['value' => 11.2, 'unit' => 'g/dL'],
                ],
            ],
            [
                'externalId' => 'LIS-OBS-1002',
                'summary' => 'Creatinina 0.9 mg/dL',
                'resultedAt' => '2026-09-21T08:20:00+00:00',
                'payload' => [
                    'resourceType' => 'fhir.Observation',
                    'id' => 'LIS-OBS-1002',
                    'status' => 'final',
                    'code' => ['text' => 'Creatinina'],
                    'subject' => ['reference' => "Encounter/{$encounterId}"],
                    'valueQuantity' => ['value' => 0.9, 'unit' => 'mg/dL'],
                ],
            ],
        ];
    }
}
