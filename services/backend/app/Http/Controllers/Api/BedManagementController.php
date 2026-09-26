<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BedManagement\BedManagement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BedManagementController extends Controller
{
    public function __construct(private readonly BedManagement $beds) {}

    public function census(): JsonResponse
    {
        return response()->json($this->beds->census());
    }

    public function storeRequest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source' => ['required', 'in:urgencias,quirofano,admisiones'],
            'priority' => ['required', 'in:critica,alta,media,baja'],
            'specialty' => ['nullable', 'string'],
            'gender' => ['nullable', 'in:female,male'],
            'isolation' => ['nullable', 'boolean'],
            'patientName' => ['nullable', 'string'],
            'encounterId' => ['nullable', 'string'],
        ], [
            'source.required' => 'Indique el origen de la solicitud.',
            'priority.required' => 'Indique la prioridad clínica.',
        ]);

        return response()->json($this->beds->storeRequest($data), 201);
    }

    public function requests(Request $request): JsonResponse
    {
        return response()->json($this->beds->listRequests($request->query('status')));
    }

    public function suggestions(int $requestId): JsonResponse
    {
        return response()->json($this->beds->suggestions($requestId));
    }

    public function assign(Request $request, int $requestId): JsonResponse
    {
        $data = $request->validate([
            'bedId' => ['required', 'integer'],
        ], [
            'bedId.required' => 'Seleccione el lecho a asignar.',
        ]);

        return response()->json($this->beds->assign($requestId, (int) $data['bedId']), 201);
    }

    public function completeCleaning(int $orderId): JsonResponse
    {
        return response()->json($this->beds->completeCleaning($orderId));
    }

    public function equip(Request $request, int $bedId): JsonResponse
    {
        return response()->json($this->beds->markEquipped($bedId, $request->user()), 201);
    }

    public function release(int $bedId): JsonResponse
    {
        return response()->json($this->beds->release($bedId));
    }

    public function storeProjection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'projectedAt' => ['required', 'date'],
        ], [
            'encounterId.required' => 'Indique el ingreso proyectado.',
            'projectedAt.required' => 'Indique la hora proyectada de alta.',
        ]);

        return response()->json($this->beds->storeProjection($data, $request->user()), 201);
    }

    public function cleaningOrders(): JsonResponse
    {
        return response()->json($this->beds->listCleaning());
    }
}
