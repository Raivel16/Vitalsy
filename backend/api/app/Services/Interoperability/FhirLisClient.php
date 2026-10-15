<?php

namespace App\Services\Interoperability;

/**
 * LIS via FHIR R4. Mapeo asumido: Encounter.identifier.value = encounter_id de Vitalsy;
 * resultados = Observation?encounter=Encounter/{id}&category=laboratory.
 */
class FhirLisClient extends FhirHttpClient implements LisClient
{
    private const ALLOWED = ['id', 'status', 'category', 'code', 'effectiveDateTime', 'issued',
        'valueQuantity', 'valueString', 'valueCodeableConcept', 'interpretation', 'referenceRange', 'note'];

    protected function system(): string
    {
        return 'lis';
    }

    protected function unavailableMessage(): string
    {
        return 'No se pudo consultar el laboratorio. Intente de nuevo.';
    }

    public function fetchLabResults(string $encounterId): array
    {
        $fhirId = $this->resolveEncounterId($encounterId);
        if ($fhirId === null) {
            return [];
        }

        $items = [];
        foreach ($this->searchAll('Observation', ['encounter' => "Encounter/{$fhirId}", 'category' => 'laboratory'], 'Observation') as $resource) {
            $item = $this->map($resource);
            if ($item === null) {
                $this->metrics()->record('lis', 'Observation', false, is_string($resource['id'] ?? null) ? $resource['id'] : null, 'malformed');

                continue;
            }
            $this->metrics()->record('lis', 'Observation', true, $item['externalId']);
            $items[] = $item;
        }

        return $items;
    }

    /** @return array{externalId: string, summary: string, resultedAt: string, payload: array<string, mixed>}|null */
    private function map(array $r): ?array
    {
        $id = $this->firstString($r['id'] ?? null);
        $label = $this->conceptText($r['code'] ?? null);
        $at = $this->isoDate($r['effectiveDateTime'] ?? ($r['issued'] ?? null));
        if ($id === null || $label === null || $at === null) {
            return null;
        }

        $value = null;
        if (is_array($r['valueQuantity'] ?? null) && isset($r['valueQuantity']['value']) && is_numeric($r['valueQuantity']['value'])) {
            $value = trim($r['valueQuantity']['value'].' '.($r['valueQuantity']['unit'] ?? ''));
        } else {
            $value = $this->firstString($r['valueString'] ?? null, $this->conceptText($r['valueCodeableConcept'] ?? null));
        }
        $interp = $this->conceptText($r['interpretation'][0] ?? null);

        $summary = trim($label.($value !== null ? " {$value}" : '').($interp !== null ? " ({$interp})" : ''));

        return [
            'externalId' => $id,
            'summary' => $summary,
            'resultedAt' => $at,
            'payload' => $this->sanitise($r, self::ALLOWED),
        ];
    }
}
