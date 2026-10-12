<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Discharge\DischargeService;
use App\Services\Life\DischargeLifePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DischargeController extends Controller
{
    public function __construct(private readonly DischargeService $discharge) {}

    public function board(Request $request): JsonResponse
    {
        return response()->json($this->discharge->boardFor($request->user()));
    }

    public function authorizedExits(): JsonResponse
    {
        return response()->json($this->discharge->authorizedExits());
    }

    public function show(string $encounterId): JsonResponse
    {
        return response()->json($this->discharge->show($encounterId));
    }

    public function storeOrder(Request $request, string $encounterId): JsonResponse
    {
        return response()->json($this->discharge->registerOrder($encounterId, $request->user()), 201);
    }

    public function storeEpicrisis(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'diagnoses' => ['required', 'string', 'min:3'],
            'procedures' => ['nullable', 'string'],
            'evolution' => ['nullable', 'string'],
        ], [
            'diagnoses.required' => 'Registre los diagnósticos de la epicrisis.',
            'diagnoses.min' => 'Registre los diagnósticos de la epicrisis.',
        ]);

        return response()->json($this->discharge->storeEpicrisis($encounterId, $data, $request->user()), 201);
    }

    public function storePrescriptions(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.drug' => ['required', 'string'],
            'items.*.dose' => ['required', 'string'],
            'items.*.route' => ['required', 'string'],
            'items.*.frequency' => ['required', 'string'],
            'items.*.days' => ['required', 'integer', 'min:1'],
        ], [
            'items.required' => 'Agregue al menos un medicamento ambulatorio.',
            'items.min' => 'Agregue al menos un medicamento ambulatorio.',
        ]);

        return response()->json($this->discharge->storePrescriptions($encounterId, $data), 201);
    }

    public function storeSocialAssessment(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'report' => ['required', 'string', 'min:5'],
            'validated' => ['nullable', 'boolean'],
        ], [
            'report.required' => 'Registre el informe de valoración social.',
            'report.min' => 'Registre el informe de valoración social.',
        ]);

        return response()->json($this->discharge->storeSocialAssessment($encounterId, $data, $request->user()), 201);
    }

    public function reconciliationContext(string $encounterId): JsonResponse
    {
        return response()->json($this->discharge->reconciliationContext($encounterId));
    }

    public function storeReconciliation(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['required', 'string', 'min:5'],
        ], [
            'notes.required' => 'Documente el resultado de la conciliación.',
            'notes.min' => 'Documente el resultado de la conciliación.',
        ]);

        return response()->json($this->discharge->storeReconciliation($encounterId, $data), 201);
    }

    public function storeNursingReport(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'instructions' => ['required', 'string', 'min:5'],
            'alarmSigns' => ['nullable', 'string'],
            'homeCare' => ['nullable', 'string'],
        ], [
            'instructions.required' => 'Registre las indicaciones de medicamentos y cuidados.',
            'instructions.min' => 'Registre las indicaciones de medicamentos y cuidados.',
        ]);

        return response()->json($this->discharge->storeNursingReport($encounterId, $data), 201);
    }

    public function storeIndicationReceipt(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'receivedByName' => ['required', 'string', 'min:3'],
        ], [
            'receivedByName.required' => 'Indique quién recibe las indicaciones de alta.',
            'receivedByName.min' => 'Indique quién recibe las indicaciones de alta.',
        ]);

        return response()->json($this->discharge->storeIndicationReceipt($encounterId, $data), 201);
    }

    public function verifyAccount(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:conforme,pendiente'],
        ], [
            'status.required' => 'Indique si la liquidación está conforme.',
            'status.in' => 'El estado de cuenta debe ser conforme o pendiente.',
        ]);

        return response()->json($this->discharge->verifyAccount($encounterId, $data), 201);
    }

    public function issueExitPass(string $encounterId): JsonResponse
    {
        return response()->json($this->discharge->issueExitPass($encounterId), 201);
    }

    public function confirmExit(Request $request, string $encounterId): JsonResponse
    {
        return response()->json($this->discharge->confirmExit($encounterId, $request->user()), 201);
    }

    /** RF-96: emite el plan estructurado para Vitalsy Life; «rechaza» no crea plan ni códigos. */
    public function storeLifePlan(Request $request, string $encounterId, DischargeLifePlan $lifePlans): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', 'string', Rule::in(DischargeLifePlan::MODES)],
        ], [
            'mode.required' => 'Indique si el paciente usa Vitalsy Life, recibe invitación o rechaza.',
            'mode.in' => 'Indique si el paciente usa Vitalsy Life, recibe invitación o rechaza.',
        ]);

        $plan = $lifePlans->issue($encounterId, $data['mode'], $request->user());
        if (! $plan) {
            return response()->json(['lifePlan' => ['mode' => 'rechaza']]);
        }

        return response()->json(['lifePlan' => $lifePlans->present($plan)], 201);
    }
}
