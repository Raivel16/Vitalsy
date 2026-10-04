<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicalAlert;
use App\Services\ClinicalAlerts\AlertWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicalAlertsController extends Controller
{
    public function __construct(private readonly AlertWorkflow $alerts) {}

    public function inbox(Request $request): JsonResponse
    {
        return response()->json($this->alerts->inboxFor($request->user()));
    }

    /** RF-40: deterioro observado de forma imprevista. */
    public function storeObservation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'note' => ['required', 'string', 'min:5'],
            'severity' => ['nullable', 'in:media,alta'],
        ], [
            'encounterId.required' => 'Indique el ingreso del paciente.',
            'note.required' => 'Describa el deterioro observado.',
            'note.min' => 'Describa el deterioro observado.',
            'severity.in' => 'La severidad debe ser media o alta.',
        ]);

        $alert = $this->alerts->observe($data['encounterId'], $data, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())], 201);
    }

    /** RF-44 y RF-47: confirmación de recepción. */
    public function acknowledge(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $alert = $this->alerts->acknowledge($alert, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())]);
    }

    /** RF-41: nueva toma de constantes durante la verificación. */
    public function reassess(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'respiratoryRate' => ['required', 'numeric'],
            'oxygenSaturation' => ['required', 'numeric'],
            'systolicBloodPressure' => ['required', 'numeric'],
            'diastolicBloodPressure' => ['required', 'numeric'],
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
            'diastolicBloodPressure.required' => 'La presión diastólica es obligatoria.',
            'pulse.required' => 'El pulso es obligatorio.',
            'temperature.required' => 'La temperatura es obligatoria.',
            'consciousness.required' => 'El nivel de consciencia es obligatorio.',
        ]);

        return response()->json($this->alerts->reassess($alert, $data, $request->user()));
    }

    /** RF-42: nueva frecuencia de monitoreo. */
    public function scheduleMonitoring(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'frequencyMinutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'note' => ['nullable', 'string'],
        ], [
            'frequencyMinutes.required' => 'Indique cada cuántos minutos se repetirá el control.',
            'frequencyMinutes.min' => 'El control no puede repetirse antes de 15 minutos.',
            'frequencyMinutes.max' => 'El control no puede espaciarse más de 24 horas.',
        ]);

        return response()->json($this->alerts->scheduleMonitoring($alert, $data, $request->user()));
    }

    /** RF-43 y RF-46: confirmación de necesidad de atención médica. */
    public function requestMedical(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5'],
        ], [
            'reason.required' => 'Indique por qué el caso requiere atención médica.',
            'reason.min' => 'Indique por qué el caso requiere atención médica.',
        ]);

        $alert = $this->alerts->requestMedicalAttention($alert, $data, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())]);
    }

    /** RF-49: evaluación e indicaciones médicas de urgencia. */
    public function storeMedicalAssessment(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'assessment' => ['required', 'string', 'min:5'],
            'orders' => ['required', 'string', 'min:5'],
        ], [
            'assessment.required' => 'Registre la evaluación del paciente.',
            'assessment.min' => 'Registre la evaluación del paciente.',
            'orders.required' => 'Registre las indicaciones médicas de urgencia.',
            'orders.min' => 'Registre las indicaciones médicas de urgencia.',
        ]);

        $alert = $this->alerts->recordMedicalAssessment($alert, $data, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())], 201);
    }

    /** RF-50: solicitud de intervención del Equipo de Respuesta Rápida. */
    public function requestRapidResponse(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5'],
        ], [
            'reason.required' => 'Indique por qué se requiere el Equipo de Respuesta Rápida.',
            'reason.min' => 'Indique por qué se requiere el Equipo de Respuesta Rápida.',
        ]);

        $alert = $this->alerts->requestRapidResponse($alert, $data, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())]);
    }

    /** RF-51: evaluación del ERR y orden de traslado a UCI. */
    public function storeRapidResponseAssessment(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'assessment' => ['required', 'string', 'min:5'],
            'transferToIcu' => ['required', 'boolean'],
        ], [
            'assessment.required' => 'Registre la evaluación del Equipo de Respuesta Rápida.',
            'assessment.min' => 'Registre la evaluación del Equipo de Respuesta Rápida.',
            'transferToIcu.required' => 'Indique si el paciente requiere traslado a cuidados intensivos.',
        ]);

        $alert = $this->alerts->recordRapidResponseAssessment($alert, $data, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())], 201);
    }

    /** Autorización de orden UCI (médico o enfermera). */
    public function authorizeIcu(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $alert = $this->alerts->authorizeIcuTransfer($alert, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())]);
    }

    /** Traslado físico a UCI. */
    public function transferIcu(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'service' => ['nullable', 'string', 'max:80'],
            'room' => ['nullable', 'string', 'max:40'],
            'bed' => ['nullable', 'string', 'max:20'],
        ]);

        $alert = $this->alerts->recordIcuTransfer($alert, $data, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())]);
    }

    /** Retorno a sala general. */
    public function returnFromIcu(Request $request, ClinicalAlert $alert): JsonResponse
    {
        $data = $request->validate([
            'service' => ['required', 'string', 'max:80'],
            'room' => ['required', 'string', 'max:40'],
            'bed' => ['nullable', 'string', 'max:20'],
            'note' => ['nullable', 'string', 'max:500'],
        ], [
            'service.required' => 'Indique el servicio de retorno.',
            'room.required' => 'Indique la habitación de retorno.',
        ]);

        $alert = $this->alerts->recordIcuReturn($alert, $data, $request->user());

        return response()->json(['alert' => $this->alerts->present($alert, $request->user())]);
    }

    /** RF-52: historial consolidado del evento. */
    public function timeline(Request $request, ClinicalAlert $alert): JsonResponse
    {
        return response()->json($this->alerts->timeline($alert, $request->user()));
    }
}
