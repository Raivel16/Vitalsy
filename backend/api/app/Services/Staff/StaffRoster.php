<?php

namespace App\Services\Staff;

use App\Exceptions\ClinicalRuleException;
use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\CoverageRequest;
use App\Models\DailyPatientAssignment;
use App\Models\Handover;
use App\Models\MedicationAdministration;
use App\Models\RetainerConfirmation;
use App\Models\StaffAbsence;
use App\Models\StaffShift;
use App\Models\StaffShiftPlan;
use App\Models\User;
use App\Models\VitalSignReading;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StaffRoster
{
    /** Roles que pueden recibir pacientes o cubrir un turno. */
    public const CARE_ROLES = ['enfermera_piso', 'auxiliar_enfermeria'];

    /** @param array<string, mixed> $data */
    public function publishPlan(array $data, User $user): array
    {
        $plan = DB::transaction(function () use ($data, $user) {
            $plan = StaffShiftPlan::query()->updateOrCreate(
                ['year_month' => $data['yearMonth']],
                [
                    'published_at' => now(),
                    'published_by' => $user->id,
                ],
            );

            StaffShift::query()->where('plan_id', $plan->id)->delete();
            foreach ($data['shifts'] as $shift) {
                StaffShift::query()->create([
                    'plan_id' => $plan->id,
                    'user_id' => $shift['userId'],
                    'starts_at' => $shift['startsAt'],
                    'ends_at' => $shift['endsAt'],
                    'unit' => $shift['unit'] ?? null,
                ]);
            }

            return $plan;
        });

        return ['plan' => $this->presentPlan($plan->fresh())];
    }

    public function showPlan(string $yearMonth): array
    {
        $plan = StaffShiftPlan::query()->where('year_month', $yearMonth)->first();
        if (! $plan) {
            throw new NotFoundHttpException('No hay un rol publicado para ese mes.');
        }

        return ['plan' => $this->presentPlan($plan)];
    }

    /** @param array<string, mixed> $data */
    public function suggest(array $data): array
    {
        $nurses = User::query()->whereIn('id', $data['nurseIds'])->get();
        if ($nurses->isEmpty()) {
            throw new ClinicalRuleException('Indique las enfermeras del turno.');
        }

        $encounters = AdmissionEncounter::query()
            ->where('current_step', 'cerrado')
            ->get();

        $scored = $encounters->map(function (AdmissionEncounter $encounter) {
            $news2 = (int) (VitalSignReading::query()
                ->where('encounter_id', $encounter->encounter_id)
                ->latest('recorded_at')
                ->value('news2_total') ?? 0);

            return [
                'encounterId' => $encounter->encounter_id,
                'patientName' => $encounter->patient_name,
                'news2' => $news2,
                'weight' => $news2 >= 7 ? 3 : ($news2 >= 1 ? 2 : 1),
            ];
        })->sortByDesc('weight')->values();

        $loads = [];
        foreach ($nurses as $nurse) {
            $loads[$nurse->id] = ['nurseId' => $nurse->id, 'name' => $nurse->name, 'weight' => 0, 'patients' => 0];
        }
        $assignments = [];

        foreach ($scored as $patient) {
            uasort($loads, fn (array $left, array $right) => [$left['weight'], $left['patients']] <=> [$right['weight'], $right['patients']]);
            $targetId = array_key_first($loads);
            $loads[$targetId]['weight'] += $patient['weight'];
            $loads[$targetId]['patients']++;
            $assignments[] = [
                'nurseUserId' => $targetId,
                'encounterId' => $patient['encounterId'],
                'patientName' => $patient['patientName'],
                'news2Weight' => $patient['news2'],
            ];
        }

        return [
            'suggestion' => [
                'shiftDate' => $data['shiftDate'],
                'assignments' => $assignments,
                'loads' => array_values($loads),
            ],
        ];
    }

    /** @param array<string, mixed> $data */
    public function approve(array $data): array
    {
        DB::transaction(function () use ($data) {
            DailyPatientAssignment::query()->whereDate('shift_date', $data['shiftDate'])->delete();
            foreach ($data['assignments'] as $item) {
                DailyPatientAssignment::query()->create([
                    'shift_date' => $data['shiftDate'],
                    'nurse_user_id' => $item['nurseUserId'],
                    'encounter_id' => $item['encounterId'],
                    'news2_weight' => $item['news2Weight'] ?? null,
                ]);
            }
        });

        return ['approved' => true];
    }

    /** Consolida los pacientes de la enfermera saliente (por defecto, quien consulta). */
    public function handoverPreview(User $viewer, string $shiftDate, ?int $fromUserId = null): array
    {
        $from = $fromUserId !== null && $fromUserId !== $viewer->id
            ? User::query()->findOrFail($fromUserId)
            : $viewer;
        if (! $from->is($viewer)) {
            $this->assertSameUnit($viewer, $from, $shiftDate);
        }

        $ids = DailyPatientAssignment::query()
            ->whereDate('shift_date', $shiftDate)
            ->where('nurse_user_id', $from->id)
            ->pluck('encounter_id');

        $patients = $ids->map(function (string $encounterId) {
            $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
            $vitals = VitalSignReading::query()->where('encounter_id', $encounterId)->latest('recorded_at')->first();
            $alerts = ClinicalAlert::query()->where('encounter_id', $encounterId)->where('status', '!=', 'cerrada')->get();
            $pendingDoses = class_exists(MedicationAdministration::class)
                ? MedicationAdministration::query()->where('encounter_id', $encounterId)->whereNull('administered_at')->count()
                : 0;

            return [
                'encounterId' => $encounterId,
                'patientName' => $encounter?->patient_name,
                'news2' => $vitals?->news2_total,
                'alerts' => $alerts->map(fn (ClinicalAlert $alert) => [
                    'id' => $alert->id,
                    'message' => $alert->message,
                    'status' => $alert->status,
                ])->values(),
                'pendingDoses' => $pendingDoses,
            ];
        });

        return ['handover' => [
            'shiftDate' => $shiftDate,
            'fromUserId' => $from->id,
            'fromName' => $from->name,
            'patients' => $patients->values(),
        ]];
    }

    /** @param array<string, mixed> $data */
    public function signHandover(array $data, User $incoming): array
    {
        $preview = $this->handoverPreview($incoming, $data['shiftDate'], (int) $data['fromUserId']);
        $shown = collect($preview['handover']['patients'])->pluck('encounterId')->all();

        $handover = DB::transaction(function () use ($data, $incoming, $preview, $shown) {
            $handover = Handover::query()->create([
                'from_user_id' => $data['fromUserId'],
                'to_user_id' => $incoming->id,
                'encounter_id' => null,
                'payload' => $preview['handover'] + ['encounterIds' => $shown],
                'signed_at' => now(),
            ]);

            DailyPatientAssignment::query()
                ->whereDate('shift_date', $data['shiftDate'])
                ->where('nurse_user_id', $data['fromUserId'])
                ->whereIn('encounter_id', $shown)
                ->update(['nurse_user_id' => $incoming->id]);

            return $handover;
        });

        return [
            'handover' => [
                'id' => $handover->id,
                'signed' => true,
                'signedAt' => optional($handover->signed_at)?->toIso8601String(),
            ],
        ];
    }

    /** @param array<string, mixed> $data */
    public function recordAbsence(array $data, User $supervisor): array
    {
        return DB::transaction(function () use ($data, $supervisor) {
            $duplicate = StaffAbsence::query()
                ->where('user_id', $data['userId'])
                ->whereDate('shift_date', $data['shiftDate'])
                ->exists();
            if ($duplicate) {
                throw new ClinicalRuleException('La inasistencia de esa persona ya fue registrada para el día indicado.');
            }

            $absence = StaffAbsence::query()->create([
                'user_id' => $data['userId'],
                'shift_date' => $data['shiftDate'],
                'reason' => $data['reason'],
                'recorded_by' => $supervisor->id,
            ]);

            $orphans = DailyPatientAssignment::query()
                ->whereDate('shift_date', $data['shiftDate'])
                ->where('nurse_user_id', $data['userId'])
                ->get();
            $critical = $orphans->contains(fn (DailyPatientAssignment $row) => (int) $row->news2_weight >= 7);

            $reassignments = [];
            $unassigned = 0;
            if (! $critical && $orphans->isNotEmpty()) {
                [$reassignments, $unassigned] = $this->rebalance($orphans, $data['shiftDate'], (int) $data['userId']);
            }

            $coverage = null;
            if ($critical || $unassigned > 0) {
                $coverage = CoverageRequest::query()->create([
                    'absence_id' => $absence->id,
                    'status' => 'solicitada',
                ]);
            }

            return [
                'absence' => ['id' => $absence->id],
                'coverage' => [
                    'required' => (bool) $coverage,
                    'requestId' => $coverage?->id,
                ],
                'reassignments' => $reassignments,
                'unassigned' => $unassigned,
            ];
        });
    }

    public function listCoverage(): array
    {
        $names = User::query()->pluck('name', 'id');
        $retainers = RetainerConfirmation::query()->pluck('user_id', 'coverage_request_id');

        $requests = CoverageRequest::query()->orderByDesc('id')->get()->map(function (CoverageRequest $request) use ($names, $retainers) {
            $absence = $request->absence_id ? StaffAbsence::query()->find($request->absence_id) : null;

            return [
                'id' => $request->id,
                'absenceId' => $request->absence_id,
                'status' => $request->status,
                'absentUserId' => $absence?->user_id,
                'absentName' => $absence ? ($names[$absence->user_id] ?? null) : null,
                'shiftDate' => $absence?->shift_date?->toDateString(),
                'reason' => $absence?->reason,
                'approvedByName' => $request->approved_by ? ($names[$request->approved_by] ?? null) : null,
                'authorizedByName' => $request->authorized_by_hr ? ($names[$request->authorized_by_hr] ?? null) : null,
                'retainerName' => isset($retainers[$request->id]) ? ($names[$retainers[$request->id]] ?? null) : null,
            ];
        });

        return ['requests' => $requests->values()];
    }

    public function approveCoverage(int $id, User $user): array
    {
        $request = $this->requireCoverage($id);
        if ($request->status !== 'solicitada') {
            throw new ClinicalRuleException('Esta convocatoria ya fue gestionada por la jefatura.');
        }
        $request->update([
            'status' => 'aprobada_jefatura',
            'approved_by' => $user->id,
        ]);

        return ['request' => ['id' => $request->id, 'status' => $request->status]];
    }

    public function authorizeCoverage(int $id, User $user): array
    {
        $request = $this->requireCoverage($id);
        if ($request->status !== 'aprobada_jefatura') {
            throw new ClinicalRuleException('La jefatura debe aprobar la convocatoria antes que recursos humanos.');
        }
        $request->update([
            'status' => 'autorizada',
            'authorized_by_hr' => $user->id,
        ]);

        return ['request' => ['id' => $request->id, 'status' => $request->status]];
    }

    public function confirmRetainer(int $id, int $userId, User $supervisor): array
    {
        $request = $this->requireCoverage($id);
        if ($request->status !== 'autorizada') {
            throw new ClinicalRuleException('Recursos humanos aún no autorizó la cobertura o el retén ya fue confirmado.');
        }

        $confirmation = DB::transaction(function () use ($request, $userId) {
            $confirmation = RetainerConfirmation::query()->create([
                'coverage_request_id' => $request->id,
                'user_id' => $userId,
                'confirmed_at' => now(),
            ]);
            $request->update(['status' => 'confirmada']);

            return $confirmation;
        });

        return [
            'confirmation' => [
                'id' => $confirmation->id,
                'userId' => $userId,
                'confirmedBy' => $supervisor->id,
            ],
        ];
    }

    public function assignedNurseId(string $encounterId): ?int
    {
        return DailyPatientAssignment::query()
            ->where('encounter_id', $encounterId)
            ->whereDate('shift_date', now()->toDateString())
            ->value('nurse_user_id');
    }

    /**
     * Reparte los pacientes de la ausente entre las enfermeras con asignación ese día,
     * del más al menos grave, siempre a la de menor carga NEWS2 acumulada.
     *
     * @param  Collection<int, DailyPatientAssignment>  $orphans
     * @return array{0: list<array{nurseUserId: int, nurseName: string, patients: int}>, 1: int}
     */
    private function rebalance(Collection $orphans, string $shiftDate, int $absentId): array
    {
        $absentToday = StaffAbsence::query()->whereDate('shift_date', $shiftDate)->pluck('user_id')->all();
        $receivers = User::query()
            ->where('is_active', true)
            ->whereIn('role', self::CARE_ROLES)
            ->whereNotIn('id', array_merge($absentToday, [$absentId]))
            ->whereIn('id', DailyPatientAssignment::query()
                ->whereDate('shift_date', $shiftDate)
                ->pluck('nurse_user_id'))
            ->get()
            ->keyBy('id');
        if ($receivers->isEmpty()) {
            return [[], $orphans->count()];
        }

        $loads = [];
        foreach ($receivers as $id => $nurse) {
            $own = DailyPatientAssignment::query()->whereDate('shift_date', $shiftDate)->where('nurse_user_id', $id);
            $loads[$id] = [
                'weight' => (int) (clone $own)->sum('news2_weight'),
                'patients' => (clone $own)->count(),
                'moved' => 0,
            ];
        }

        foreach ($orphans->sortByDesc(fn ($row) => (int) $row->news2_weight) as $row) {
            uasort($loads, fn (array $l, array $r) => [$l['weight'], $l['patients']] <=> [$r['weight'], $r['patients']]);
            $targetId = array_key_first($loads);
            $row->update(['nurse_user_id' => $targetId]);
            $loads[$targetId]['weight'] += (int) $row->news2_weight;
            $loads[$targetId]['patients']++;
            $loads[$targetId]['moved']++;
        }

        $reassignments = [];
        foreach ($loads as $id => $load) {
            if ($load['moved'] > 0) {
                $reassignments[] = [
                    'nurseUserId' => $id,
                    'nurseName' => $receivers[$id]->name,
                    'patients' => $load['moved'],
                ];
            }
        }

        return [$reassignments, 0];
    }

    /**
     * Control de objeto del handover: si el rol publicado ubica a ambas enfermeras ese día,
     * deben compartir servicio; así no se consultan ni reasignan pacientes de otra unidad.
     */
    private function assertSameUnit(User $incoming, User $outgoing, string $shiftDate): void
    {
        $unitsOf = fn (User $user) => StaffShift::query()
            ->where('user_id', $user->id)
            ->whereDate('starts_at', $shiftDate)
            ->pluck('unit')
            ->filter()
            ->unique()
            ->values();

        $incomingUnits = $unitsOf($incoming);
        $outgoingUnits = $unitsOf($outgoing);
        if ($incomingUnits->isNotEmpty() && $outgoingUnits->isNotEmpty() && $incomingUnits->intersect($outgoingUnits)->isEmpty()) {
            throw new ClinicalRuleException('La enfermera saliente pertenece a otro servicio en el rol publicado.');
        }
    }

    private function presentPlan(StaffShiftPlan $plan): array
    {
        $shifts = StaffShift::query()->where('plan_id', $plan->id)->get()->map(fn (StaffShift $shift) => [
            'userId' => $shift->user_id,
            'startsAt' => optional($shift->starts_at)?->toIso8601String(),
            'endsAt' => optional($shift->ends_at)?->toIso8601String(),
            'unit' => $shift->unit,
        ]);

        return [
            'yearMonth' => $plan->year_month,
            'published' => (bool) $plan->published_at,
            'shifts' => $shifts->values(),
        ];
    }

    private function requireCoverage(int $id): CoverageRequest
    {
        $request = CoverageRequest::query()->find($id);
        if (! $request) {
            throw new NotFoundHttpException('No se encontró la solicitud de cobertura.');
        }

        return $request;
    }
}
