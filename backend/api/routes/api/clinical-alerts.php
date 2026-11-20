<?php

use App\Http\Controllers\Api\ClinicalAlertReportsController;
use App\Http\Controllers\Api\ClinicalAlertsController;
use Illuminate\Support\Facades\Route;

// Módulo 3 — Gestión de alertas y respuesta ante alteraciones (RF-39–47)
Route::prefix('clinical-alerts')->group(function () {
    $alertRoles = 'enfermera_piso,auxiliar_enfermeria,enfermera_supervisora,medico_residente,medico_tratante,equipo_respuesta_rapida';

    Route::middleware("role:{$alertRoles}")->group(function () {
        Route::get('inbox', [ClinicalAlertsController::class, 'inbox']);
        Route::get('{alert}/timeline', [ClinicalAlertsController::class, 'timeline']);
        Route::post('{alert}/acknowledge', [ClinicalAlertsController::class, 'acknowledge']);
    });

    // RF-114: reportes de monitoreo y respuesta a alertas (supervisión de enfermería).
    Route::middleware('role:enfermera_supervisora,jefatura_enfermeria')->group(function () {
        Route::get('reports', [ClinicalAlertReportsController::class, 'show']);
    });

    // RF-40: el auxiliar registra el deterioro observado; la enfermera también.
    Route::middleware('role:auxiliar_enfermeria,enfermera_piso,enfermera_supervisora')->group(function () {
        Route::post('observations', [ClinicalAlertsController::class, 'storeObservation']);
    });

    // RF-41–43: verificación, programación y confirmación de atención médica.
    Route::middleware('role:enfermera_piso,enfermera_supervisora')->group(function () {
        Route::post('{alert}/reassessment', [ClinicalAlertsController::class, 'reassess']);
        Route::post('{alert}/monitoring-schedule', [ClinicalAlertsController::class, 'scheduleMonitoring']);
        Route::post('{alert}/medical-request', [ClinicalAlertsController::class, 'requestMedical']);
    });

    // RF-49–50: atención médica de urgencia y solicitud del ERR.
    Route::middleware('role:medico_residente,medico_tratante')->group(function () {
        Route::post('{alert}/medical-assessment', [ClinicalAlertsController::class, 'storeMedicalAssessment']);
        Route::post('{alert}/rapid-response-request', [ClinicalAlertsController::class, 'requestRapidResponse']);
    });

    // RF-51: evaluación del ERR y orden de traslado a UCI.
    Route::middleware('role:equipo_respuesta_rapida')->group(function () {
        Route::post('{alert}/err-assessment', [ClinicalAlertsController::class, 'storeRapidResponseAssessment']);
    });

    // Ciclo UCI: autorización médica/enfermería, traslado efectivo y retorno.
    Route::middleware('role:medico_residente,medico_tratante,enfermera_piso')->group(function () {
        Route::post('{alert}/icu-authorize', [ClinicalAlertsController::class, 'authorizeIcu']);
    });
    Route::middleware('role:enfermera_piso,enfermera_supervisora,camillero')->group(function () {
        Route::post('{alert}/icu-transfer', [ClinicalAlertsController::class, 'transferIcu']);
    });
    Route::middleware('role:enfermera_piso,enfermera_supervisora')->group(function () {
        Route::post('{alert}/icu-return', [ClinicalAlertsController::class, 'returnFromIcu']);
    });
});
