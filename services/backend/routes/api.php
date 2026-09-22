<?php

use App\Http\Controllers\Api\AdmissionCensusController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HospitalAdmissionController;
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
    });
});
