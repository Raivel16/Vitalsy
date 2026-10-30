<?php

use App\Http\Controllers\Api\StaffRosterController;
use App\Http\Controllers\Api\UserAdminController;
use Illuminate\Support\Facades\Route;

// Módulo 6 — Gestión del personal asistencial (RF-78–82)
// RF-101–104: administración de cuentas (solo administrador de accesos).
Route::middleware('role:administrador_accesos')->prefix('users')->group(function () {
    Route::get('/', [UserAdminController::class, 'index']);
    Route::post('/', [UserAdminController::class, 'store']);
    Route::patch('{id}', [UserAdminController::class, 'update']);
    Route::post('{id}/deactivate', [UserAdminController::class, 'deactivate']);
});

Route::prefix('staff')->group(function () {
    // Apoyo a /personal: selectores de personal asistencial activo.
    Route::get('members', [UserAdminController::class, 'members'])
        ->middleware('role:jefatura_enfermeria,enfermera_supervisora,enfermera_piso,recursos_humanos');
    Route::middleware('role:jefatura_enfermeria,enfermera_supervisora,enfermera_piso,recursos_humanos')->group(function () {
        Route::get('shift-plans', [StaffRosterController::class, 'listPlans']);
        Route::get('shift-plans/{yearMonth}', [StaffRosterController::class, 'showPlan']);
    });

    Route::middleware('role:jefatura_enfermeria')->group(function () {
        Route::post('shift-plans', [StaffRosterController::class, 'publishPlan']);
        Route::post('coverage-requests/{id}/approve', [StaffRosterController::class, 'approveCoverage']);
    });

    Route::middleware('role:enfermera_supervisora')->group(function () {
        Route::post('assignments/suggest', [StaffRosterController::class, 'suggest']);
        Route::post('assignments/approve', [StaffRosterController::class, 'approve']);
        Route::post('absences', [StaffRosterController::class, 'storeAbsence']);
        Route::post('coverage-requests/{id}/confirm', [StaffRosterController::class, 'confirmRetainer']);
    });

    Route::middleware('role:enfermera_supervisora,jefatura_enfermeria,recursos_humanos')->group(function () {
        Route::get('coverage-requests', [StaffRosterController::class, 'coverageRequests']);
    });

    Route::middleware('role:enfermera_piso')->group(function () {
        Route::get('handover/candidates', [StaffRosterController::class, 'handoverCandidates']);
        Route::get('handover', [StaffRosterController::class, 'handoverPreview']);
        Route::post('handover', [StaffRosterController::class, 'signHandover']);
    });

    Route::middleware('role:recursos_humanos')->group(function () {
        Route::post('coverage-requests/{id}/authorize', [StaffRosterController::class, 'authorizeCoverage']);
    });
});
