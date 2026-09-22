<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\LabResult;
use App\Services\Interoperability\LisClient;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class LabResultsIntegrator
{
    public function __construct(private readonly LisClient $lis)
    {
    }

    /**
     * @return list<array{id: int, externalId: string|null, summary: string, resultedAt: string|null, payload: array<string, mixed>|null}>
     */
    public function sync(string $encounterId): array
    {
        $this->requireEncounter($encounterId);

        $integrated = [];
        foreach ($this->lis->fetchLabResults($encounterId) as $item) {
            $result = LabResult::query()->updateOrCreate(
                [
                    'encounter_id' => $encounterId,
                    'external_id' => $item['externalId'],
                ],
                [
                    'summary' => $item['summary'],
                    'payload' => $item['payload'],
                    'resulted_at' => Carbon::parse($item['resultedAt']),
                ],
            );
            $integrated[] = $this->present($result);
        }

        return $integrated;
    }

    /**
     * @return list<array{id: int, externalId: string|null, summary: string, resultedAt: string|null, payload: array<string, mixed>|null}>
     */
    public function list(string $encounterId): array
    {
        $this->requireEncounter($encounterId);

        return LabResult::query()
            ->where('encounter_id', $encounterId)
            ->orderBy('resulted_at')
            ->get()
            ->map(fn (LabResult $result) => $this->present($result))
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
     * @return array{id: int, externalId: string|null, summary: string, resultedAt: string|null, payload: array<string, mixed>|null}
     */
    private function present(LabResult $result): array
    {
        return [
            'id' => $result->id,
            'externalId' => $result->external_id,
            'summary' => $result->summary,
            'resultedAt' => optional($result->resulted_at)?->toIso8601String(),
            'payload' => $result->payload,
        ];
    }
}
