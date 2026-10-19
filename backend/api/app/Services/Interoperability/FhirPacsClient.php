<?php

namespace App\Services\Interoperability;

/**
 * PACS via FHIR R4: DiagnosticReport?encounter=Encounter/{id}&category=RAD
 * (CodeSystem v2-0074). Modalidad = primer coding del sistema DICOM (DCM) en category.
 */
class FhirPacsClient extends FhirHttpClient implements PacsClient
{
    private const ALLOWED = ['id', 'status', 'category', 'code', 'effectiveDateTime', 'issued',
        'conclusion', 'conclusionCode'];

    protected function system(): string
    {
        return 'pacs';
    }

    protected function unavailableMessage(): string
    {
        return 'No se pudo consultar el PACS. Intente de nuevo.';
    }

    public function fetchImagingReports(string $encounterId): array
    {
        $fhirId = $this->resolveEncounterId($encounterId);
        if ($fhirId === null) {
            return [];
        }

        $items = [];
        foreach ($this->searchAll('DiagnosticReport', ['encounter' => "Encounter/{$fhirId}", 'category' => 'RAD'], 'DiagnosticReport') as $r) {
            $item = $this->map($r);
            if ($item === null) {
                $this->metrics()->record('pacs', 'DiagnosticReport', false, is_string($r['id'] ?? null) ? $r['id'] : null, 'malformed');

                continue;
            }
            $this->metrics()->record('pacs', 'DiagnosticReport', true, $item['externalId']);
            $items[] = $item;
        }

        return $items;
    }

    /** @return array{externalId: string, modality: string|null, summary: string, reportedAt: string, payload: array<string, mixed>}|null */
    private function map(array $r): ?array
    {
        $id = $this->firstString($r['id'] ?? null);
        $label = $this->conceptText($r['code'] ?? null);
        $at = $this->isoDate($r['issued'] ?? ($r['effectiveDateTime'] ?? null));
        if ($id === null || $label === null || $at === null) {
            return null;
        }

        $modality = null;
        foreach ((array) ($r['category'] ?? []) as $cat) {
            foreach ((array) (is_array($cat) ? ($cat['coding'] ?? []) : []) as $coding) {
                if (is_array($coding) && str_contains((string) ($coding['system'] ?? ''), 'dicom') && is_string($coding['code'] ?? null)) {
                    $modality = $coding['code'];
                    break 2;
                }
            }
        }
        $conclusion = $this->firstString($r['conclusion'] ?? null);

        return [
            'externalId' => $id,
            'modality' => $modality,
            'summary' => $label.($conclusion !== null ? ": {$conclusion}" : ''),
            'reportedAt' => $at,
            'payload' => $this->sanitise($r, self::ALLOWED),
        ];
    }
}
