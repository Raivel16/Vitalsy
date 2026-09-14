<?php

use App\Http\Controllers\Api\HospitalAdmissionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/hospital-admission')->group(function () {
    Route::get('admission-orders/{orderNumber}', [HospitalAdmissionController::class, 'showAdmissionOrder']);
    Route::post('filiation/validate', [HospitalAdmissionController::class, 'validateFiliation']);
    Route::post('coverage/validate', [HospitalAdmissionController::class, 'validateCoverage']);
    Route::post('coverage/referrals', [HospitalAdmissionController::class, 'referCoverage']);
    Route::post('wristbands', [HospitalAdmissionController::class, 'issueWristband']);
    Route::post('clinical-records', [HospitalAdmissionController::class, 'openRecord']);
    Route::post('informed-consents', [HospitalAdmissionController::class, 'storeConsent']);
    Route::get('transfer-orders/{orderNumber}', [HospitalAdmissionController::class, 'showTransferOrder']);
    Route::post('wristbands/verify', [HospitalAdmissionController::class, 'verifyWristband']);
    Route::post('floor-receptions', [HospitalAdmissionController::class, 'confirmReception']);
    Route::post('relocations', [HospitalAdmissionController::class, 'relocate']);
    Route::post('nursing-assessments', [HospitalAdmissionController::class, 'storeAssessment']);
    Route::post('vital-signs', [HospitalAdmissionController::class, 'storeVitalSigns']);
    Route::post('medication-reconciliations', [HospitalAdmissionController::class, 'storeReconciliation']);
    Route::post('risk-scales', [HospitalAdmissionController::class, 'storeRiskScales']);
    Route::get('kardex/{encounterId}', [HospitalAdmissionController::class, 'showKardex']);
    Route::get('medical-orders/{encounterId}', [HospitalAdmissionController::class, 'showMedicalOrders']);
    Route::post('medical-orders/{encounterId}/sign', [HospitalAdmissionController::class, 'signMedicalOrders']);
});
