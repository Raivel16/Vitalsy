<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\ImagingReport;
use App\Services\Interoperability\PacsClient;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ImagingReportsIntegrator
{
    public function __construct(private readonly PacsClient $pacs) {}

    /**
     * @return list<array{id: int, externalId: string|null, modality: string|null, summary: string, reportedAt: string|null, payload: array<string, mixed>|null}>
     */
    public function sync(string $encounterId): array
    {
        $this->requireEncounter($encounterId);

        $integrated = [];
        foreach ($this->pacs->fetchImagingReports($encounterId) as $item) {
            $report = ImagingReport::query()->updateOrCreate(
                [
                    'encounter_id' => $encounterId,
                    'external_id' => $item['externalId'],
                ],
                [
                    'modality' => $item['modality'],
                    'summary' => $item['summary'],
                    'payload' => $item['payload'],
                    'reported_at' => Carbon::parse($item['reportedAt']),
                ],
            );
            $integrated[] = $this->present($report);
        }

        return $integrated;
    }

    /**
     * @return list<array{id: int, externalId: string|null, modality: string|null, summary: string, reportedAt: string|null, payload: array<string, mixed>|null}>
     */
    public function list(string $encounterId): array
    {
        $this->requireEncounter($encounterId);

        return ImagingReport::query()
            ->where('encounter_id', $encounterId)
            ->orderBy('reported_at')
            ->get()
            ->map(fn (ImagingReport $report) => $this->present($report))
            ->all();
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }

    /**
     * @return array{id: int, externalId: string|null, modality: string|null, summary: string, reportedAt: string|null, payload: array<string, mixed>|null}
     */
    private function present(ImagingReport $report): array
    {
        return [
            'id' => $report->id,
            'externalId' => $report->external_id,
            'modality' => $report->modality,
            'summary' => $report->summary,
            'reportedAt' => optional($report->reported_at)?->toIso8601String(),
            'payload' => $report->payload,
        ];
    }
}
