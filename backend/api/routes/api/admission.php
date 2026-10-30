<?php

use App\Http\Controllers\Api\AdmissionCensusController;
use App\Http\Controllers\Api\AdmissionNursingController;
use App\Http\Controllers\Api\HospitalAdmissionController;
use App\Support\RoleCatalog;
use Illuminate\Support\Facades\Route;

Route::prefix('hospital-admission')->group(function () {
    // N-17: el censo de ingresos lo consulta el personal clínico completo y operativo, no la administración de accesos.
    Route::middleware('role:'.implode(',', array_diff(RoleCatalog::all(), ['administrador_accesos'])))->group(function () {
        Route::get('encounters', [AdmissionCensusController::class, 'index']);
        Route::get('encounters/{encounterId}', [AdmissionCensusController::class, 'show']);
    });
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
        // RF-95: importa la línea de base de Vitalsy Life; el código tiene ~41 bits, de ahí el tope de intentos.
        Route::post('life-links', [HospitalAdmissionController::class, 'linkLife'])->middleware('throttle:20,1');
    });

    // RF-95: lectura de la línea de base importada de Vitalsy Life.
    Route::middleware('role:admision,enfermera_piso,medico_residente,medico_tratante')->group(function () {
        Route::get('encounters/{encounterId}/life-baseline', [HospitalAdmissionController::class, 'showLifeBaseline']);
    });

    Route::middleware('role:camillero')->group(function () {
        Route::get('transfer-orders/{orderNumber}', [HospitalAdmissionController::class, 'showTransferOrder']);
        Route::post('wristbands/verify', [HospitalAdmissionController::class, 'verifyWristband']);
    });

    Route::middleware('role:enfermera_piso')->group(function () {
        Route::post('floor-receptions', [HospitalAdmissionController::class, 'confirmReception']);
        Route::post('relocations', [HospitalAdmissionController::class, 'relocate']);
        Route::post('nursing-assessments', [AdmissionNursingController::class, 'storeAssessment']);
        Route::post('medication-reconciliations', [AdmissionNursingController::class, 'storeReconciliation']);
        Route::post('risk-scales', [AdmissionNursingController::class, 'storeRiskScales']);
        Route::get('kardex/{encounterId}', [AdmissionNursingController::class, 'showKardex']);
    });

    // RF-12: constantes basales — enfermera de piso o auxiliar de enfermería.
    Route::middleware('role:enfermera_piso,auxiliar_enfermeria')->group(function () {
        Route::post('vital-signs', [AdmissionNursingController::class, 'storeVitalSigns']);
    });

    Route::middleware('role:medico_residente,medico_tratante')->group(function () {
        Route::get('medical-orders/{encounterId}', [HospitalAdmissionController::class, 'showMedicalOrders']);
        Route::put('medical-orders/{encounterId}', [HospitalAdmissionController::class, 'saveMedicalOrders']);
        Route::post('medical-orders/{encounterId}/sign', [HospitalAdmissionController::class, 'signMedicalOrders']);
    });
});
