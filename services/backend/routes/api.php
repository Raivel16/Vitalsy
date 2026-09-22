<?php

use App\Http\Controllers\Api\AdmissionCensusController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClinicalVisitController;
use App\Http\Controllers\Api\CpoeController;
use App\Http\Controllers\Api\HospitalAdmissionController;
use App\Http\Controllers\Api\ImagingReportsController;
use App\Http\Controllers\Api\LabResultsController;
use App\Http\Controllers\Api\MedicalEvolutionNoteController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::prefix('hospital-admission')->group(function () {
            Route::get('encounters', [AdmissionCensusController::class, 'index']);
            Route::get('encounters/{encounterId}', [AdmissionCensusController::class, 'show']);
            Route::post('encounters/{encounterId}/advance', [AdmissionCensusController::class, 'advance']);

            Route::middleware('role:admision')->group(function () {
                Route::post('encounters', [AdmissionCensusController::class, 'store']);
                Route::post('intake', [AdmissionCensusController::class, 'intake']);
                Route::get('admission-orders/{orderNumber}', [HospitalAdmissionController::class, 'showAdmissionOrder']);
                Route::post('filiation/validate', [HospitalAdmissionController::class, 'validateFiliation']);
                Route::post('coverage/validate', [HospitalAdmissionController::class, 'validateCoverage']);
                Route::post('coverage/referrals', [HospitalAdmissionController::class, 'referCoverage']);
                Route::post('wristbands', [HospitalAdmissionController::class, 'issueWristband']);
                Route::post('clinical-records', [HospitalAdmissionController::class, 'openRecord']);
                Route::post('informed-consents', [HospitalAdmissionController::class, 'storeConsent']);
            });

            Route::middleware('role:camillero')->group(function () {
                Route::get('transfer-orders/{orderNumber}', [HospitalAdmissionController::class, 'showTransferOrder']);
                Route::post('wristbands/verify', [HospitalAdmissionController::class, 'verifyWristband']);
            });

            Route::middleware('role:enfermera_piso')->group(function () {
                Route::post('floor-receptions', [HospitalAdmissionController::class, 'confirmReception']);
                Route::post('relocations', [HospitalAdmissionController::class, 'relocate']);
                Route::post('nursing-assessments', [HospitalAdmissionController::class, 'storeAssessment']);
                Route::post('medication-reconciliations', [HospitalAdmissionController::class, 'storeReconciliation']);
                Route::post('risk-scales', [HospitalAdmissionController::class, 'storeRiskScales']);
                Route::get('kardex/{encounterId}', [HospitalAdmissionController::class, 'showKardex']);
            });

            // RF-12: constantes basales — enfermera de piso o auxiliar de enfermería.
            Route::middleware('role:enfermera_piso,auxiliar_enfermeria')->group(function () {
                Route::post('vital-signs', [HospitalAdmissionController::class, 'storeVitalSigns']);
            });

            Route::middleware('role:medico_residente')->group(function () {
                Route::get('medical-orders/{encounterId}', [HospitalAdmissionController::class, 'showMedicalOrders']);
                Route::post('medical-orders/{encounterId}/sign', [HospitalAdmissionController::class, 'signMedicalOrders']);
            });
        });

        // Módulo 2 — Atención y seguimiento
        Route::prefix('inpatient-care')->group(function () {
            // RF-17: integración LIS (disparo operativo para roles clínicos; actor Sistema vía adaptador).
            Route::middleware('role:medico_residente,medico_tratante,enfermera_piso')->group(function () {
                Route::post('encounters/{encounterId}/lab-results/sync', [LabResultsController::class, 'sync']);
                Route::get('encounters/{encounterId}/lab-results', [LabResultsController::class, 'index']);
                Route::post('encounters/{encounterId}/imaging-reports/sync', [ImagingReportsController::class, 'sync']);
                Route::get('encounters/{encounterId}/imaging-reports', [ImagingReportsController::class, 'index']);
            });

            // RF-19: visita consolidada — solo médicos.
            // RF-20: nota de evolución — solo médico residente.
            Route::middleware('role:medico_residente,medico_tratante')->group(function () {
                Route::get('encounters/{encounterId}/clinical-visit', [ClinicalVisitController::class, 'show']);
            });

            Route::middleware('role:medico_residente')->group(function () {
                Route::get('encounters/{encounterId}/medical-evolution-notes', [MedicalEvolutionNoteController::class, 'index']);
                Route::post('encounters/{encounterId}/medical-evolution-notes', [MedicalEvolutionNoteController::class, 'store']);
            });

            // RF-21: CPOE — médico tratante; kardex CPOE consultable por clínica de piso/médicos.
            Route::middleware('role:medico_tratante')->group(function () {
                Route::post('encounters/{encounterId}/prescriptions', [CpoeController::class, 'store']);
            });

            Route::middleware('role:medico_tratante,medico_residente,enfermera_piso')->group(function () {
                Route::get('encounters/{encounterId}/prescriptions/active', [CpoeController::class, 'active']);
                Route::get('encounters/{encounterId}/kardex', [CpoeController::class, 'kardex']);
            });
        });
    });
});
