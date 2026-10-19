<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BedManagement\BedManagement;
use App\Services\BedManagement\CleaningWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BedManagementController extends Controller
{
    public function __construct(private readonly BedManagement $beds) {}

    public function available(): JsonResponse
    {
        return response()->json($this->beds->available());
    }

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
            'isolationType' => ['nullable', 'in:ninguno,gotas,contacto,respiratorio'],
            'equipment' => ['nullable', 'array'],
            'equipment.*' => ['in:oxigeno_central,monitor'],
            'patientName' => ['required_without:encounterId', 'nullable', 'string', 'max:160'],
            'encounterId' => ['nullable', 'string'],
        ], [
            'source.required' => 'Indique el origen de la solicitud.',
            'priority.required' => 'Indique la prioridad clínica.',
            'patientName.required_without' => 'Seleccione o indique el paciente de la solicitud.',
            'isolationType.in' => 'El tipo de aislamiento no es válido.',
            'equipment.*.in' => 'El equipamiento solicitado no es válido.',
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

    public function completeCleaning(Request $request, int $orderId): JsonResponse
    {
        $rules = ['checklist' => ['required', 'array']];
        $messages = ['checklist.required' => 'Complete el checklist de desinfección.'];
        foreach (CleaningWorkflow::CHECKLIST_ITEMS as $item) {
            $rules["checklist.{$item}"] = ['required', 'accepted'];
            $messages["checklist.{$item}.required"] = 'Complete todo el checklist antes de registrar la desinfección.';
            $messages["checklist.{$item}.accepted"] = 'Complete todo el checklist antes de registrar la desinfección.';
        }
        $data = $request->validate($rules, $messages);

        return response()->json($this->beds->completeCleaning($orderId, $data['checklist'], $request->user()));
    }

    public function equip(Request $request, int $bedId): JsonResponse
    {
        return response()->json($this->beds->markEquipped($bedId, $request->user()), 201);
    }

    public function release(Request $request, int $bedId): JsonResponse
    {
        return response()->json($this->beds->release($bedId, $request->user()));
    }

    public function storeProjection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'projectedAt' => ['required', 'date', 'after:now'],
        ], [
            'encounterId.required' => 'Indique el ingreso proyectado.',
            'projectedAt.required' => 'Indique la hora proyectada de alta.',
            'projectedAt.after' => 'La hora proyectada de alta debe ser futura.',
        ]);

        return response()->json($this->beds->storeProjection($data, $request->user()), 201);
    }

    public function projections(): JsonResponse
    {
        return response()->json($this->beds->listProjections());
    }

    public function patients(Request $request): JsonResponse
    {
        return response()->json($this->beds->patients($request->query('query')));
    }

    public function notifications(): JsonResponse
    {
        return response()->json($this->beds->notifications());
    }

    public function acknowledge(Request $request, int $assignmentId): JsonResponse
    {
        return response()->json($this->beds->acknowledge($assignmentId, $request->user()));
    }

    public function cleaningOrders(): JsonResponse
    {
        return response()->json($this->beds->listCleaning());
    }
}
