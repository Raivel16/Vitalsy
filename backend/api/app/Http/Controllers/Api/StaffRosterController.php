<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Staff\StaffRoster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class StaffRosterController extends Controller
{
    public function __construct(private readonly StaffRoster $roster) {}

    /** Persona activa con rol asistencial (puede recibir pacientes o cubrir un turno). */
    private function careUser(): Exists
    {
        return Rule::exists('users', 'id')
            ->whereIn('role', StaffRoster::CARE_ROLES)
            ->where('is_active', true);
    }

    public function publishPlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'yearMonth' => ['required', 'date_format:Y-m'],
            'shifts' => ['required', 'array', 'min:1'],
            'shifts.*.userId' => ['required', 'integer', Rule::exists('users', 'id')->where('is_active', true)],
            'shifts.*.startsAt' => ['required', 'date'],
            'shifts.*.endsAt' => ['required', 'date', 'after:shifts.*.startsAt'],
            'shifts.*.unit' => ['nullable', 'string', 'max:120'],
        ], [
            'shifts.*.userId.exists' => 'Seleccione personal activo del listado.',
            'shifts.*.endsAt.after' => 'El fin del turno debe ser posterior al inicio.',
        ]);

        return response()->json($this->roster->publishPlan($data, $request->user()), 201);
    }

    public function showPlan(string $yearMonth): JsonResponse
    {
        return response()->json($this->roster->showPlan($yearMonth));
    }

    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shiftDate' => ['required', 'date'],
            'nurseIds' => ['required', 'array', 'min:1'],
            'nurseIds.*' => ['integer', $this->careUser()],
        ], [
            'nurseIds.*.exists' => 'Seleccione enfermeras activas del listado.',
        ]);

        return response()->json($this->roster->suggest($data));
    }

    public function approve(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shiftDate' => ['required', 'date'],
            'assignments' => ['required', 'array'],
            'assignments.*.nurseUserId' => ['required', 'integer', $this->careUser()],
            'assignments.*.encounterId' => ['required', 'string', Rule::exists('admission_encounters', 'encounter_id')],
            'assignments.*.news2Weight' => ['nullable', 'integer'],
        ], [
            'assignments.*.nurseUserId.exists' => 'Cada paciente debe asignarse a una enfermera activa.',
            'assignments.*.encounterId.exists' => 'Uno de los pacientes ya no existe en el censo.',
        ]);

        return response()->json($this->roster->approve($data), 201);
    }

    public function handoverPreview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shiftDate' => ['required', 'date'],
            'fromUserId' => ['nullable', 'integer', $this->careUser()],
        ], [
            'fromUserId.exists' => 'Seleccione la enfermera saliente del listado.',
        ]);

        return response()->json($this->roster->handoverPreview(
            $request->user(),
            $data['shiftDate'],
            isset($data['fromUserId']) ? (int) $data['fromUserId'] : null,
        ));
    }

    public function signHandover(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fromUserId' => ['required', 'integer', $this->careUser()],
            'shiftDate' => ['required', 'date'],
        ], [
            'fromUserId.exists' => 'Seleccione la enfermera saliente del listado.',
        ]);

        return response()->json($this->roster->signHandover($data, $request->user()), 201);
    }

    public function storeAbsence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'userId' => ['required', 'integer', $this->careUser()],
            'shiftDate' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:255'],
        ], [
            'userId.exists' => 'Seleccione al colaborador del listado.',
            'reason.required' => 'Indique el motivo de la inasistencia.',
        ]);

        return response()->json($this->roster->recordAbsence($data, $request->user()), 201);
    }

    public function coverageRequests(): JsonResponse
    {
        return response()->json($this->roster->listCoverage());
    }

    public function approveCoverage(Request $request, int $id): JsonResponse
    {
        return response()->json($this->roster->approveCoverage($id, $request->user()));
    }

    public function authorizeCoverage(Request $request, int $id): JsonResponse
    {
        return response()->json($this->roster->authorizeCoverage($id, $request->user()));
    }

    public function confirmRetainer(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'userId' => ['required', 'integer', $this->careUser()],
        ], [
            'userId.exists' => 'Seleccione al retén del listado de personal activo.',
        ]);

        return response()->json($this->roster->confirmRetainer($id, (int) $data['userId'], $request->user()), 201);
    }
}
