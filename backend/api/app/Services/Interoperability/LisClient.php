<?php

namespace App\Services\Interoperability;

/**
 * Contrato de consumo LIS (HL7/FHIR). La implementación real se sustituirá
 * por un cliente HTTP; el stub permite TDD y demos sin LIS externo.
 */
interface LisClient
{
    /**
     * @return list<array{
     *   externalId: string,
     *   summary: string,
     *   resultedAt: string,
     *   payload: array<string, mixed>
     * }>
     */
    public function fetchLabResults(string $encounterId): array;
}
