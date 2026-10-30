<?php

use App\Http\Controllers\Api\ClinicalVisitController;
use App\Http\Controllers\Api\CpoeController;
use App\Http\Controllers\Api\EmarCareController;
use App\Http\Controllers\Api\ImagingReportsController;
use App\Http\Controllers\Api\LabResultsController;
use App\Http\Controllers\Api\MedicalEvolutionNoteController;
use App\Http\Controllers\Api\MonitoringControlsController;
use App\Http\Controllers\Api\PatientClinicalChartController;
use App\Http\Controllers\Api\VitalSignsMonitoringController;
use Illuminate\Support\Facades\Route;

// Módulo 2 — Atención y seguimiento
Route::prefix('inpatient-care')->group(function () {
    // RF-21: integración LIS (disparo operativo para roles clínicos; actor Sistema vía adaptador).
    Route::middleware('role:medico_residente,medico_tratante,enfermera_piso')->group(function () {
        Route::post('encounters/{encounterId}/lab-results/sync', [LabResultsController::class, 'sync']);
        Route::get('encounters/{encounterId}/lab-results', [LabResultsController::class, 'index']);
        Route::post('encounters/{encounterId}/imaging-reports/sync', [ImagingReportsController::class, 'sync']);
        Route::get('encounters/{encounterId}/imaging-reports', [ImagingReportsController::class, 'index']);
    });

    // RF-23: visita consolidada — médicos.
    // RF-24: nota de evolución — médico residente y médico tratante.
    Route::middleware('role:medico_residente,medico_tratante')->group(function () {
        Route::get('encounters/{encounterId}/clinical-visit', [ClinicalVisitController::class, 'show']);
        Route::get('encounters/{encounterId}/medical-evolution-notes', [MedicalEvolutionNoteController::class, 'index']);
        Route::post('encounters/{encounterId}/medical-evolution-notes', [MedicalEvolutionNoteController::class, 'store']);
    });

    // RF-25: CPOE — médico tratante; kardex CPOE consultable por clínica de piso/médicos.
    Route::middleware('role:medico_tratante')->group(function () {
        Route::post('encounters/{encounterId}/prescriptions', [CpoeController::class, 'store']);
        Route::post('encounters/{encounterId}/prescriptions/active/items', [CpoeController::class, 'storeItem']);
        Route::put('encounters/{encounterId}/prescriptions/active/items/{itemId}', [CpoeController::class, 'updateItem']);
        Route::delete('encounters/{encounterId}/prescriptions/active/items/{itemId}', [CpoeController::class, 'destroyItem']);
    });

    Route::middleware('role:medico_tratante,medico_residente,enfermera_piso')->group(function () {
        Route::get('encounters/{encounterId}/prescriptions/active', [CpoeController::class, 'active']);
        Route::get('encounters/{encounterId}/kardex', [CpoeController::class, 'kardex']);
    });

    Route::middleware('role:enfermera_piso,auxiliar_enfermeria,enfermera_supervisora')->group(function () {
        Route::get('monitoring-controls', [MonitoringControlsController::class, 'index']);
        Route::post('encounters/{encounterId}/monitoring-controls/complete', [MonitoringControlsController::class, 'complete']);
    });

    // RF-26–27: monitoreo fisiológico, NEWS2, gráfica, alertas y programación.
    Route::middleware('role:enfermera_piso,auxiliar_enfermeria')->group(function () {
        Route::post('encounters/{encounterId}/vital-signs', [VitalSignsMonitoringController::class, 'store']);
        Route::post('encounters/{encounterId}/vital-signs/telemetry', [VitalSignsMonitoringController::class, 'telemetry']);
    });

    Route::middleware('role:enfermera_piso,auxiliar_enfermeria,medico_residente,medico_tratante')->group(function () {
        Route::get('encounters/{encounterId}/vital-signs/chart', [VitalSignsMonitoringController::class, 'chart']);
        Route::get('encounters/{encounterId}/clinical-chart', [PatientClinicalChartController::class, 'show']);
    });

    // RF-32–35: e-MAR; RF-36 evolución enfermería; RF-37 cuidados.
    Route::middleware('role:enfermera_piso')->group(function () {
        Route::get('encounters/{encounterId}/emar', [EmarCareController::class, 'emar']);
        Route::post('encounters/{encounterId}/emar/{doseId}/administer', [EmarCareController::class, 'administer']);
    });

    Route::middleware('role:enfermera_piso,auxiliar_enfermeria')->group(function () {
        Route::get('encounters/{encounterId}/nursing-evolution-notes', [EmarCareController::class, 'listNursingNotes']);
        Route::post('encounters/{encounterId}/nursing-evolution-notes', [EmarCareController::class, 'storeNursingNote']);
        Route::get('encounters/{encounterId}/care-activities', [EmarCareController::class, 'listCareActivities']);
        Route::post('encounters/{encounterId}/care-activities', [EmarCareController::class, 'storeCareActivity']);
    });
});
