<?php

use App\Http\Controllers\Api\AdmissionCensusController;
use App\Http\Controllers\Api\AdmissionNursingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BedManagementController;
use App\Http\Controllers\Api\ClinicalAlertsController;
use App\Http\Controllers\Api\ClinicalVisitController;
use App\Http\Controllers\Api\CpoeController;
use App\Http\Controllers\Api\DischargeController;
use App\Http\Controllers\Api\EmarCareController;
use App\Http\Controllers\Api\HospitalAdmissionController;
use App\Http\Controllers\Api\ImagingReportsController;
use App\Http\Controllers\Api\LabResultsController;
use App\Http\Controllers\Api\Life\LifeAuthController;
use App\Http\Controllers\Api\Life\LifeConsentController;
use App\Http\Controllers\Api\Life\LifeDischargePlanController;
use App\Http\Controllers\Api\Life\LifeLinkCodeController;
use App\Http\Controllers\Api\Life\LifeNoticesController;
use App\Http\Controllers\Api\Life\LifeSyncController;
use App\Http\Controllers\Api\MedicalEvolutionNoteController;
use App\Http\Controllers\Api\MonitoringControlsController;
use App\Http\Controllers\Api\PatientClinicalChartController;
use App\Http\Controllers\Api\StaffRosterController;
use App\Http\Controllers\Api\UserAdminController;
use App\Http\Controllers\Api\VitalSignsMonitoringController;
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

        // Módulo 3 — Gestión de alertas y respuesta ante alteraciones (RF-39–47)
        Route::prefix('clinical-alerts')->group(function () {
            $alertRoles = 'enfermera_piso,auxiliar_enfermeria,enfermera_supervisora,medico_residente,medico_tratante,equipo_respuesta_rapida';

            Route::middleware("role:{$alertRoles}")->group(function () {
                Route::get('inbox', [ClinicalAlertsController::class, 'inbox']);
                Route::get('{alert}/timeline', [ClinicalAlertsController::class, 'timeline']);
                Route::post('{alert}/acknowledge', [ClinicalAlertsController::class, 'acknowledge']);
            });

            // RF-40: el auxiliar registra el deterioro observado; la enfermera también.
            Route::middleware('role:auxiliar_enfermeria,enfermera_piso,enfermera_supervisora')->group(function () {
                Route::post('observations', [ClinicalAlertsController::class, 'storeObservation']);
            });

            // RF-41–43: verificación, programación y confirmación de atención médica.
            Route::middleware('role:enfermera_piso,enfermera_supervisora')->group(function () {
                Route::post('{alert}/reassessment', [ClinicalAlertsController::class, 'reassess']);
                Route::post('{alert}/monitoring-schedule', [ClinicalAlertsController::class, 'scheduleMonitoring']);
                Route::post('{alert}/medical-request', [ClinicalAlertsController::class, 'requestMedical']);
            });

            // RF-49–50: atención médica de urgencia y solicitud del ERR.
            Route::middleware('role:medico_residente,medico_tratante')->group(function () {
                Route::post('{alert}/medical-assessment', [ClinicalAlertsController::class, 'storeMedicalAssessment']);
                Route::post('{alert}/rapid-response-request', [ClinicalAlertsController::class, 'requestRapidResponse']);
            });

            // RF-51: evaluación del ERR y orden de traslado a UCI.
            Route::middleware('role:equipo_respuesta_rapida')->group(function () {
                Route::post('{alert}/err-assessment', [ClinicalAlertsController::class, 'storeRapidResponseAssessment']);
            });

            // Ciclo UCI: autorización médica/enfermería, traslado efectivo y retorno.
            Route::middleware('role:medico_residente,medico_tratante,enfermera_piso')->group(function () {
                Route::post('{alert}/icu-authorize', [ClinicalAlertsController::class, 'authorizeIcu']);
            });
            Route::middleware('role:enfermera_piso,enfermera_supervisora,camillero')->group(function () {
                Route::post('{alert}/icu-transfer', [ClinicalAlertsController::class, 'transferIcu']);
            });
            Route::middleware('role:enfermera_piso,enfermera_supervisora')->group(function () {
                Route::post('{alert}/icu-return', [ClinicalAlertsController::class, 'returnFromIcu']);
            });
        });

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
    });
});
