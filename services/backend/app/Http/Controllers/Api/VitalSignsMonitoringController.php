<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\VitalSignsMonitoring;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class VitalSignsMonitoringController extends Controller
{
    public function __construct(private readonly VitalSignsMonitoring $monitoring)
    {
    }

    public function store(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'respiratoryRate' => ['required', 'numeric'],
            'oxygenSaturation' => ['required', 'numeric'],
            'systolicBloodPressure' => ['required', 'numeric'],
            'pulse' => ['required', 'numeric'],
            'temperature' => ['required', 'numeric'],
            'consciousness' => ['required', 'string'],
            'confusionOnset' => ['nullable', 'in:new,chronic'],
            'supplementalOxygen' => ['sometimes', 'boolean'],
            'spo2Scale' => ['sometimes', 'string'],
        ], [
            'respiratoryRate.required' => 'La frecuencia respiratoria es obligatoria.',
            'oxygenSaturation.required' => 'La saturación de oxígeno es obligatoria.',
            'systolicBloodPressure.required' => 'La presión sistólica es obligatoria.',
            'pulse.required' => 'El pulso es obligatorio.',
            'temperature.required' => 'La temperatura es obligatoria.',
            'consciousness.required' => 'El nivel de consciencia es obligatorio.',
        ]);

        return response()->json(
            $this->monitoring->storeManual($encounterId, $data, $request->user()),
            201,
        );
    }

    public function telemetry(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'samples' => ['required', 'array', 'min:4'],
            'consciousness' => ['sometimes', 'string'],
            'supplementalOxygen' => ['sometimes', 'boolean'],
            'spo2Scale' => ['sometimes', 'string'],
        ]);

        try {
            return response()->json(
                $this->monitoring->storeTelemetry($encounterId, $data, $request->user()),
                201,
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function chart(string $encounterId): JsonResponse
    {
        return response()->json($this->monitoring->chart($encounterId));
    }
}
