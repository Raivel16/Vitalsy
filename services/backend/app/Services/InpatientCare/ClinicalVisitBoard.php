<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\ImagingReport;
use App\Models\LabResult;
use App\Models\NursingEvolutionNote;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ClinicalVisitBoard
{
    /**
     * @return array{
     *   day: string,
     *   labResults: list<array{id: int, externalId: string|null, summary: string, resultedAt: string|null}>,
     *   imagingReports: list<array{id: int, externalId: string|null, modality: string|null, summary: string, reportedAt: string|null}>,
     *   nursingNotes: list<array{id: int, body: string, authoredAt: string|null, authorName: string|null}>
     * }
     */
    public function forEncounter(string $encounterId, ?Carbon $day = null): array
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        $day = ($day ?? now())->copy()->startOfDay();
        $end = $day->copy()->endOfDay();

        $labs = LabResult::query()
            ->where('encounter_id', $encounterId)
            ->whereBetween('resulted_at', [$day, $end])
            ->orderBy('resulted_at')
            ->get()
            ->map(fn (LabResult $row) => [
                'id' => $row->id,
                'externalId' => $row->external_id,
                'summary' => $row->summary,
                'resultedAt' => optional($row->resulted_at)?->toIso8601String(),
            ])
            ->all();

        $imaging = ImagingReport::query()
            ->where('encounter_id', $encounterId)
            ->whereBetween('reported_at', [$day, $end])
            ->orderBy('reported_at')
            ->get()
            ->map(fn (ImagingReport $row) => [
                'id' => $row->id,
                'externalId' => $row->external_id,
                'modality' => $row->modality,
                'summary' => $row->summary,
                'reportedAt' => optional($row->reported_at)?->toIso8601String(),
            ])
            ->all();

        $notes = NursingEvolutionNote::query()
            ->with('author')
            ->where('encounter_id', $encounterId)
            ->whereBetween('created_at', [$day, $end])
            ->orderBy('created_at')
            ->get()
            ->map(fn (NursingEvolutionNote $row) => [
                'id' => $row->id,
                'body' => $row->body,
                'authoredAt' => optional($row->created_at)?->toIso8601String(),
                'authorName' => $row->author?->name,
            ])
            ->all();

        return [
            'day' => $day->toDateString(),
            'labResults' => $labs,
            'imagingReports' => $imaging,
            'nursingNotes' => $notes,
        ];
    }
}
