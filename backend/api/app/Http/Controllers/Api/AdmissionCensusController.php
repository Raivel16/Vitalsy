<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Admission\AdmissionBoard;
use App\Services\Admission\AdmissionBoardException;
use App\Support\Security\DegradedRead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdmissionCensusController extends Controller
{
    public function __construct(private readonly AdmissionBoard $board) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        return DegradedRead::json(fn () => $this->board->list(
            $data['q'] ?? null,
            (int) ($data['page'] ?? 1),
            (int) ($data['per_page'] ?? 10),
        ));
    }

    public function show(string $encounterId): JsonResponse
    {
        return $this->guard(fn () => response()->json(['encounter' => $this->board->find($encounterId)]));
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->filled('patientName')) {
            $data = $request->validate([
                'orderNumber' => ['required', 'string', 'max:40'],
                'patientName' => ['required', 'string', 'max:120'],
                'documentType' => ['nullable', 'string', 'max:20'],
                'documentNumber' => ['required', 'string', 'max:30', 'regex:/^[0-9]+$/'],
                'originService' => ['required', 'string', 'max:120'],
                'coveragePayer' => ['required', 'string', 'max:80'],
                'coverageStatus' => ['required', 'in:aprobada,pendiente,rechazada'],
                'coveragePlan' => ['required', 'string', 'max:120'],
                'requestingPhysician' => ['nullable', 'string', 'max:120'],
                'reason' => ['nullable', 'string', 'max:255'],
                'room' => ['nullable', 'string', 'max:20'],
                'bed' => ['nullable', 'string', 'max:10'],
                'service' => ['nullable', 'string', 'max:120'],
                'source' => ['nullable', 'in:manual,external'],
            ]);

            $source = $data['source'] ?? 'manual';

            return $this->guard(function () use ($data, $source) {
                $encounter = $this->board->registerIntake($data, $source);

                return response()->json(['encounter' => $encounter], 201);
            });
        }

        $data = $request->validate([
            'orderNumber' => ['required', 'string'],
        ]);

        return $this->guard(function () use ($data) {
            $encounter = $this->board->openFromOrder($data['orderNumber']);

            return response()->json(['encounter' => $encounter], $encounter['currentStep'] === 'filiacion' ? 201 : 200);
        });
    }

    public function intake(Request $request): JsonResponse
    {
        $data = $request->validate([
            'orderNumber' => ['required', 'string', 'max:40'],
            'patientName' => ['required', 'string', 'max:120'],
            'documentType' => ['nullable', 'string', 'max:20'],
            'documentNumber' => ['required', 'string', 'max:30', 'regex:/^[0-9]+$/'],
            'originService' => ['required', 'string', 'max:120'],
            'coveragePayer' => ['required', 'string', 'max:80'],
            'coverageStatus' => ['required', 'in:aprobada,pendiente,rechazada'],
            'coveragePlan' => ['required', 'string', 'max:120'],
            'requestingPhysician' => ['nullable', 'string', 'max:120'],
            'reason' => ['nullable', 'string', 'max:255'],
            'room' => ['nullable', 'string', 'max:20'],
            'bed' => ['nullable', 'string', 'max:10'],
            'service' => ['nullable', 'string', 'max:120'],
        ]);

        return $this->guard(function () use ($data) {
            $encounter = $this->board->registerIntake($data, 'external');

            return response()->json(['encounter' => $encounter], 201);
        });
    }

    public function advance(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'step' => ['required', 'string'],
            'coverageStatus' => ['nullable', 'in:aprobada,pendiente,rechazada'],
        ]);

        return $this->guard(fn () => response()->json([
            'encounter' => $this->board->advance(
                $encounterId,
                $data['step'],
                (string) $request->user()->role,
                $data['coverageStatus'] ?? null,
            ),
        ]));
    }

    private function guard(callable $action): JsonResponse
    {
        try {
            return $action();
        } catch (AdmissionBoardException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->status);
        }
    }
}
