<?php

namespace App\Services\BedManagement;

use App\Models\AdmissionEncounter;
use App\Models\BedAssignment;
use App\Models\BedRequest;

/** Ocupante vigente de cada cama y nombre del paciente de una asignación. */
class BedOccupancy
{
    /** Las asignaciones sin ingreso usan `REQ-{id}` como identificador de la solicitud. */
    private const REQUEST_PREFIX = 'REQ-';

    /**
     * Ocupante vigente por cama (una sola consulta por tabla, sin N+1).
     *
     * @return array<int, array{encounterId: string, patientName: ?string, since: ?string}>
     */
    public function byBed(): array
    {
        $assignments = BedAssignment::query()->whereNull('released_at')->orderBy('id')->get();
        if ($assignments->isEmpty()) {
            return [];
        }

        $encounterIds = $assignments->pluck('encounter_id');
        $encounterNames = AdmissionEncounter::query()
            ->whereIn('encounter_id', $encounterIds->all())
            ->pluck('patient_name', 'encounter_id');
        $requestIds = $encounterIds
            ->filter(fn (string $id) => $this->isRequestKey($id))
            ->map(fn (string $id) => $this->requestIdOf($id))
            ->all();
        $requestNames = $requestIds === []
            ? collect()
            : BedRequest::query()->whereIn('id', $requestIds)->pluck('patient_name', 'id');

        $occupants = [];
        foreach ($assignments as $assignment) {
            $key = $assignment->encounter_id;
            $name = $encounterNames[$key] ?? ($this->isRequestKey($key) ? ($requestNames[$this->requestIdOf($key)] ?? null) : null);
            $occupants[$assignment->bed_id] = [
                'encounterId' => $key,
                'patientName' => $name,
                'since' => optional($assignment->assigned_at)?->toIso8601String(),
            ];
        }

        return $occupants;
    }

    public function patientNameFor(string $encounterId): ?string
    {
        if ($this->isRequestKey($encounterId)) {
            return BedRequest::query()->find($this->requestIdOf($encounterId))?->patient_name;
        }

        return AdmissionEncounter::query()->where('encounter_id', $encounterId)->value('patient_name');
    }

    private function isRequestKey(string $id): bool
    {
        return str_starts_with($id, self::REQUEST_PREFIX);
    }

    private function requestIdOf(string $id): int
    {
        return (int) substr($id, strlen(self::REQUEST_PREFIX));
    }
}
