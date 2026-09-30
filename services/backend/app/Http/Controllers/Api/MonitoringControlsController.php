<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\MonitoringControlsBoard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonitoringControlsController extends Controller
{
    public function __construct(private readonly MonitoringControlsBoard $board) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->board->board($request->user()));
    }

    public function complete(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'respiratoryRate' => ['required', 'numeric'],
            'oxygenSaturation' => ['required', 'numeric'],
            'systolicBloodPressure' => ['required', 'numeric'],
            'pulse' => ['required', 'numeric'],
            'temperature' => ['required', 'numeric'],
            'consciousness' => ['required', 'string'],
            'confusionOnset' => ['nullable', 'string'],
            'supplementalOxygen' => ['nullable', 'boolean'],
            'spo2Scale' => ['nullable', 'string'],
        ], [
            'respiratoryRate.required' => 'La frecuencia respiratoria es obligatoria.',
            'oxygenSaturation.required' => 'La saturación de oxígeno es obligatoria.',
            'systolicBloodPressure.required' => 'La presión sistólica es obligatoria.',
            'pulse.required' => 'El pulso es obligatorio.',
            'temperature.required' => 'La temperatura es obligatoria.',
            'consciousness.required' => 'El nivel de consciencia es obligatorio.',
        ]);

        return response()->json($this->board->complete($encounterId, $data, $request->user()));
    }
}
