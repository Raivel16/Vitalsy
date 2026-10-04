<?php

namespace App\Services\Interoperability;

/**
 * Contrato de consumo PACS (HL7/FHIR DiagnosticReport).
 */
interface PacsClient
{
    /**
     * @return list<array{
     *   externalId: string,
     *   modality: string|null,
     *   summary: string,
     *   reportedAt: string,
     *   payload: array<string, mixed>
     * }>
     */
    public function fetchImagingReports(string $encounterId): array;
}
