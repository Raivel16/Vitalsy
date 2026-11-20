<?php

use App\Http\Controllers\Api\HospitalReportsController;
use Illuminate\Support\Facades\Route;

// RF-115: indicadores hospitalarios (ocupación, flujo, recambio de camas y plazo de acuse de alertas).
Route::prefix('reports')->middleware('role:jefatura_enfermeria,enfermera_supervisora,gestion_camas')->group(function () {
    Route::get('hospital', [HospitalReportsController::class, 'show']);
});
