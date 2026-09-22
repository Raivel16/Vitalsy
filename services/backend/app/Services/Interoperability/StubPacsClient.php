<?php

namespace App\Services\Interoperability;

class StubPacsClient implements PacsClient
{
    public function fetchImagingReports(string $encounterId): array
    {
        return [
            [
                'externalId' => 'PACS-DR-2001',
                'modality' => 'RX',
                'summary' => 'Radiografía de tórax: sin consolidaciones',
                'reportedAt' => '2026-09-21T09:00:00+00:00',
                'payload' => [
                    'resourceType' => 'fhir.DiagnosticReport',
                    'id' => 'PACS-DR-2001',
                    'status' => 'final',
                    'code' => ['text' => 'Radiografía de tórax'],
                    'subject' => ['reference' => "Encounter/{$encounterId}"],
                    'conclusion' => 'Sin consolidaciones',
                ],
            ],
            [
                'externalId' => 'PACS-DR-2002',
                'modality' => 'ECO',
                'summary' => 'Ecografía abdominal: sin líquido libre',
                'reportedAt' => '2026-09-21T09:30:00+00:00',
                'payload' => [
                    'resourceType' => 'fhir.DiagnosticReport',
                    'id' => 'PACS-DR-2002',
                    'status' => 'final',
                    'code' => ['text' => 'Ecografía abdominal'],
                    'subject' => ['reference' => "Encounter/{$encounterId}"],
                    'conclusion' => 'Sin líquido libre',
                ],
            ],
        ];
    }
}
