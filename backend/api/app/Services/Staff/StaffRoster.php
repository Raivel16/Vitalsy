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
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StaffRoster
{
    /** @param array<string, mixed> $data */
    public function publishPlan(array $data, User $user): array
    {
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
        DailyPatientAssignment::query()->where('shift_date', $data['shiftDate'])->delete();
        foreach ($data['assignments'] as $item) {
            DailyPatientAssignment::query()->create([
                'shift_date' => $data['shiftDate'],
                'nurse_user_id' => $item['nurseUserId'],
                'encounter_id' => $item['encounterId'],
                'news2_weight' => $item['news2Weight'] ?? null,
            ]);
        }

        return ['approved' => true];
    }

    public function handoverPreview(User $user, string $shiftDate): array
    {
        $ids = DailyPatientAssignment::query()
            ->whereDate('shift_date', $shiftDate)
            ->where('nurse_user_id', $user->id)
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

        return ['handover' => ['shiftDate' => $shiftDate, 'patients' => $patients->values()]];
    }

    /** @param array<string, mixed> $data */
    public function signHandover(array $data, User $incoming): array
    {
        $preview = $this->handoverPreview(User::query()->findOrFail($data['fromUserId']), $data['shiftDate']);

        $handover = Handover::query()->create([
            'from_user_id' => $data['fromUserId'],
            'to_user_id' => $incoming->id,
            'encounter_id' => null,
            'payload' => $preview['handover'],
            'signed_at' => now(),
        ]);

        DailyPatientAssignment::query()
            ->whereDate('shift_date', $data['shiftDate'])
            ->where('nurse_user_id', $data['fromUserId'])
            ->update(['nurse_user_id' => $incoming->id]);

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
        $absence = StaffAbsence::query()->create([
            'user_id' => $data['userId'],
            'shift_date' => $data['shiftDate'],
            'reason' => $data['reason'] ?? null,
            'recorded_by' => $supervisor->id,
        ]);

        $critical = DailyPatientAssignment::query()
            ->whereDate('shift_date', $data['shiftDate'])
            ->where('nurse_user_id', $data['userId'])
            ->where('news2_weight', '>=', 7)
            ->exists();

        $coverage = null;
        if ($critical) {
            $coverage = CoverageRequest::query()->create([
                'absence_id' => $absence->id,
                'status' => 'solicitada',
            ]);
        } else {
            $this->rebalance($data['shiftDate'], (int) $data['userId']);
        }

        return [
            'absence' => ['id' => $absence->id],
            'coverage' => [
                'required' => (bool) $coverage,
                'requestId' => $coverage?->id,
            ],
        ];
    }

    public function listCoverage(): array
    {
        $requests = CoverageRequest::query()->orderByDesc('id')->get()->map(fn (CoverageRequest $request) => [
            'id' => $request->id,
            'absenceId' => $request->absence_id,
            'status' => $request->status,
        ]);

        return ['requests' => $requests->values()];
    }

    public function approveCoverage(int $id, User $user): array
    {
        $request = $this->requireCoverage($id);
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
            throw new ClinicalRuleException('Recursos humanos aún no autorizó la cobertura.');
        }

        $confirmation = RetainerConfirmation::query()->create([
            'coverage_request_id' => $request->id,
            'user_id' => $userId,
            'confirmed_at' => now(),
        ]);
        $request->update(['status' => 'confirmada']);

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

    private function rebalance(string $shiftDate, int $absentId): void
    {
        $orphans = DailyPatientAssignment::query()
            ->where('shift_date', $shiftDate)
            ->where('nurse_user_id', $absentId)
            ->get();
        $active = DailyPatientAssignment::query()
            ->where('shift_date', $shiftDate)
            ->where('nurse_user_id', '!=', $absentId)
            ->pluck('nurse_user_id')
            ->unique()
            ->values();
        if ($active->isEmpty()) {
            return;
        }

        foreach ($orphans as $index => $row) {
            $row->update(['nurse_user_id' => $active[$index % $active->count()]]);
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
