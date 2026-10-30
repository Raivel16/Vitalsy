<?php

use App\Http\Controllers\Api\BedInfrastructureController;
use App\Http\Controllers\Api\BedManagementController;
use Illuminate\Support\Facades\Route;

// Módulo 5 — Gestión y asignación de camas (RF-68–71)
Route::prefix('beds')->group(function () {
    Route::middleware('role:enfermera_piso,gestion_camas,enfermera_supervisora')->group(function () {
        Route::get('available', [BedManagementController::class, 'available']);
    });

    Route::middleware('role:gestion_camas,enfermera_supervisora')->group(function () {
        Route::get('census', [BedManagementController::class, 'census']);
        Route::get('requests', [BedManagementController::class, 'requests']);
        Route::get('requests/{requestId}/suggestions', [BedManagementController::class, 'suggestions']);
        Route::get('projections', [BedManagementController::class, 'projections']);
    });

    Route::middleware('role:gestion_camas')->group(function () {
        Route::get('patients', [BedManagementController::class, 'patients']);
        Route::post('requests', [BedManagementController::class, 'storeRequest']);
        Route::post('requests/{requestId}/assign', [BedManagementController::class, 'assign']);
    });

    Route::middleware('role:enfermera_supervisora')->group(function () {
        Route::post('projections', [BedManagementController::class, 'storeProjection']);
        Route::post('{bedId}/release', [BedManagementController::class, 'release']);
        Route::get('assignments/notifications', [BedManagementController::class, 'notifications']);
        Route::post('assignments/{assignmentId}/acknowledge', [BedManagementController::class, 'acknowledge']);
    });

    Route::middleware('role:servicios_generales,enfermera_supervisora,auxiliar_enfermeria')->group(function () {
        Route::get('cleaning-orders', [BedManagementController::class, 'cleaningOrders']);
    });

    Route::middleware('role:servicios_generales')->group(function () {
        Route::post('cleaning-orders/{orderId}/complete', [BedManagementController::class, 'completeCleaning']);
    });

    Route::middleware('role:auxiliar_enfermeria')->group(function () {
        Route::post('{bedId}/equip', [BedManagementController::class, 'equip']);
    });
});

// RF-110–112: configuración de pabellones, habitaciones y camas (solo administrador de accesos).
Route::middleware('role:administrador_accesos')->prefix('bed-infrastructure')->group(function () {
    Route::get('wards', [BedInfrastructureController::class, 'wards']);
    Route::post('wards', [BedInfrastructureController::class, 'storeWard']);
    Route::patch('wards/{id}', [BedInfrastructureController::class, 'updateWard']);
    Route::delete('wards/{id}', [BedInfrastructureController::class, 'destroyWard']);
    Route::post('beds', [BedInfrastructureController::class, 'storeBed']);
    Route::post('beds/bulk/preview', [BedInfrastructureController::class, 'previewBulk']);
    Route::post('beds/bulk', [BedInfrastructureController::class, 'storeBulk']);
    Route::patch('beds/{id}', [BedInfrastructureController::class, 'updateBed']);
    Route::delete('beds/{id}', [BedInfrastructureController::class, 'destroyBed']);
});
