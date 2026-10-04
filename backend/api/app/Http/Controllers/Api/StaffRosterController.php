<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Staff\StaffRoster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffRosterController extends Controller
{
    public function __construct(private readonly StaffRoster $roster) {}

    public function publishPlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'yearMonth' => ['required', 'date_format:Y-m'],
            'shifts' => ['required', 'array', 'min:1'],
            'shifts.*.userId' => ['required', 'integer'],
            'shifts.*.startsAt' => ['required', 'date'],
            'shifts.*.endsAt' => ['required', 'date'],
            'shifts.*.unit' => ['nullable', 'string'],
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
            'nurseIds.*' => ['integer'],
        ]);

        return response()->json($this->roster->suggest($data));
    }

    public function approve(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shiftDate' => ['required', 'date'],
            'assignments' => ['required', 'array'],
            'assignments.*.nurseUserId' => ['required', 'integer'],
            'assignments.*.encounterId' => ['required', 'string'],
            'assignments.*.news2Weight' => ['nullable', 'integer'],
        ]);

        return response()->json($this->roster->approve($data), 201);
    }

    public function handoverPreview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shiftDate' => ['required', 'date'],
        ]);

        return response()->json($this->roster->handoverPreview($request->user(), $data['shiftDate']));
    }

    public function signHandover(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fromUserId' => ['required', 'integer'],
            'shiftDate' => ['required', 'date'],
        ]);

        return response()->json($this->roster->signHandover($data, $request->user()), 201);
    }

    public function storeAbsence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'userId' => ['required', 'integer'],
            'shiftDate' => ['required', 'date'],
            'reason' => ['nullable', 'string'],
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
            'userId' => ['required', 'integer'],
        ]);

        return response()->json($this->roster->confirmRetainer($id, (int) $data['userId'], $request->user()), 201);
    }
}
