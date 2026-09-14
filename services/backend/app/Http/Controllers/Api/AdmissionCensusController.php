<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Admission\AdmissionBoard;
use App\Services\Admission\AdmissionBoardException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdmissionCensusController extends Controller
{
    public function __construct(private readonly AdmissionBoard $board) {}

    public function index(): JsonResponse
    {
        return response()->json(['encounters' => $this->board->list()]);
    }

    public function show(string $encounterId): JsonResponse
    {
        return $this->guard(fn () => response()->json(['encounter' => $this->board->find($encounterId)]));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'orderNumber' => ['required', 'string'],
        ]);

        return $this->guard(function () use ($data) {
            $encounter = $this->board->openFromOrder($data['orderNumber']);

            return response()->json(['encounter' => $encounter], $encounter['currentStep'] === 'filiacion' ? 201 : 200);
        });
    }

    public function advance(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'step' => ['required', 'string'],
        ]);

        return $this->guard(fn () => response()->json([
            'encounter' => $this->board->advance($encounterId, $data['step'], (string) $request->user()->role),
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
