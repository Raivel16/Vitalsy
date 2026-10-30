<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Life\LifeAuthController;
use App\Http\Controllers\Api\Life\LifeConsentController;
use App\Http\Controllers\Api\Life\LifeDischargePlanController;
use App\Http\Controllers\Api\Life\LifeLinkCodeController;
use App\Http\Controllers\Api\Life\LifeNoticesController;
use App\Http\Controllers\Api\Life\LifeSyncController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// RNF-11: sonda de salud para balanceador/monitoreo; sin autenticacion ni datos clinicos.
Route::get('health', function () {
    try {
        DB::select('select 1');
    } catch (Throwable) {
        return response()->json(['status' => 'degraded', 'db' => 'fail'], 503);
    }

    return response()->json(['status' => 'ok', 'db' => 'ok']);
});

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    // Vitalsy Life: cuentas ciudadanas (RF-89); el middleware `life` excluye al personal clínico.
    Route::prefix('life')->group(function () {
        Route::post('auth/register', [LifeAuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('auth/login', [LifeAuthController::class, 'login'])->middleware('throttle:10,1');

        Route::middleware(['auth:sanctum', 'life', 'abilities:life'])->group(function () {
            Route::post('auth/logout', [LifeAuthController::class, 'logout']);
            Route::post('sync', [LifeSyncController::class, 'store']);
            Route::put('consent', [LifeConsentController::class, 'update']);
            Route::post('link-codes', [LifeLinkCodeController::class, 'store']);
            Route::get('notices', [LifeNoticesController::class, 'index']);
            Route::get('discharge-plans/{code}', [LifeDischargePlanController::class, 'show'])
                ->middleware('throttle:30,1');
        });
    });

    // Rutas permitidas aun con contraseña temporal (RF-102).
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:10,1');
    });

    Route::middleware(['auth:sanctum', 'active', 'password.rotated'])->group(function () {
        // RNF-01: autorización de canales privados (POST /api/v1/broadcasting/auth). Se registra
        // dentro de este grupo para heredar la pila del grupo `api` (stateful, sesión, origen) y la
        // misma autenticación por cookie + XSRF que el resto de la API.
        Broadcast::routes(['middleware' => []]);
        require base_path('routes/channels.php');

        require base_path('routes/api/admission.php');

        require base_path('routes/api/inpatient-care.php');

        require base_path('routes/api/clinical-alerts.php');

        require base_path('routes/api/discharge.php');

        require base_path('routes/api/beds.php');

        require base_path('routes/api/staff.php');
    });
});
