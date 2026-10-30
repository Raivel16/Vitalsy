<?php

use App\Http\Controllers\Api\DischargeController;
use Illuminate\Support\Facades\Route;

// Módulo 4 — Alta y egreso hospitalario (RF-54–61)
Route::prefix('discharge')->group(function () {
    $dischargeRoles = 'medico_residente,medico_tratante,trabajo_social,enfermera_piso,altas_caja,camillero';

    Route::middleware("role:{$dischargeRoles}")->group(function () {
        Route::get('board', [DischargeController::class, 'board']);
        Route::get('encounters/{encounterId}', [DischargeController::class, 'show']);
    });

    Route::middleware('role:medico_residente,medico_tratante')->group(function () {
        Route::post('encounters/{encounterId}/order', [DischargeController::class, 'storeOrder']);
        Route::post('encounters/{encounterId}/epicrisis', [DischargeController::class, 'storeEpicrisis']);
        Route::post('encounters/{encounterId}/prescriptions', [DischargeController::class, 'storePrescriptions']);
    });

    Route::middleware('role:trabajo_social')->group(function () {
        Route::post('encounters/{encounterId}/social-assessment', [DischargeController::class, 'storeSocialAssessment']);
    });

    Route::middleware('role:enfermera_piso')->group(function () {
        Route::get('encounters/{encounterId}/reconciliation-context', [DischargeController::class, 'reconciliationContext']);
        Route::post('encounters/{encounterId}/reconciliation', [DischargeController::class, 'storeReconciliation']);
        Route::post('encounters/{encounterId}/nursing-report', [DischargeController::class, 'storeNursingReport']);
        Route::post('encounters/{encounterId}/indication-receipt', [DischargeController::class, 'storeIndicationReceipt']);
        Route::post('encounters/{encounterId}/exit', [DischargeController::class, 'confirmExit']);
        // RF-96: plan de seguimiento y código para Vitalsy Life.
        Route::post('encounters/{encounterId}/life-plan', [DischargeController::class, 'storeLifePlan']);
    });

    Route::middleware('role:altas_caja')->group(function () {
        Route::post('encounters/{encounterId}/account', [DischargeController::class, 'verifyAccount']);
        Route::post('encounters/{encounterId}/exit-pass', [DischargeController::class, 'issueExitPass']);
    });

    Route::middleware('role:camillero')->group(function () {
        Route::get('authorized-exits', [DischargeController::class, 'authorizedExits']);
    });
});
