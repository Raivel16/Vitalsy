# Reportes hospitalarios (RF-114 y RF-115)

Los reportes no guardan datos propios: se calculan al consultar con los registros reales de los procesos 1 a 5. No existen tablas ni cachés de indicadores.

## RF-115: indicadores hospitalarios

- **API:** `GET /api/v1/reports/hospital?from=YYYY-MM-DD&to=YYYY-MM-DD&ward=<código>` (`HospitalReportsController` → `App\Services\Reports\HospitalIndicatorsService`).
- **Roles:** `jefatura_enfermeria`, `enfermera_supervisora` y `gestion_camas` (`routes/api/reports.php`). El resto recibe 403.
- **Validación:** fechas `Y-m-d`, `to ≥ from`, período máximo de 90 días (se comprueba sobre los datos ya validados) y `ward` debe existir en `wards.code`. Sin fechas usa los últimos 7 días.
- **Pantalla:** `/reportes/hospital` (`frontend/web/src/modules/hospital-reports/`), con validación previa al envío y aviso de éxito o error.

| Indicador | Fuente | Regla de cálculo |
|---|---|---|
| Ocupación de camas | `beds` activas (`status`) | `occupied / total`, también por sala y por estado (ocupada, disponible, limpieza, bloqueada). Es una foto del momento de la consulta. |
| Ingresos | `admission_encounters.created_at` | Ingresos creados dentro del período. |
| Altas efectivas | `patient_exits.exited_at` | Salidas registradas por la enfermera de piso dentro del período. |
| Estancia promedio | `patient_exits` + `admission_encounters` | Horas entre la creación del ingreso y la salida efectiva, promedio de las salidas del período. |
| Recambio de cama | `cleaning_orders` | Minutos desde `dispatched_at` hasta `enabled_at` (o `completed_at` si aún no hay habilitación). Las órdenes sin cierre se cuentan como pendientes. |
| Plazo de acuse de alertas | `clinical_alerts` + `alert_acknowledgements` | Reutiliza `AlertReportService` (RF-114): porcentaje de acuses de enfermería dentro de `vitalsy.alerts.nurse_ack_minutes`. |

### Filtro por sala

`beds`, `flow` y `turnover` se limitan a la sala. El flujo usa las asignaciones de cama (`bed_assignments`): un ingreso pertenece a la sala si alguna vez tuvo cama en ella. Las alertas **no** se filtran por sala porque `clinical_alerts` no guarda la cama; el tablero lo trata como indicador de todo el hospital.

### Límites conocidos

- La ocupación es instantánea; no hay historial de camas por día.
- La estancia solo cuenta pacientes con salida efectiva en el período; los internados no entran.
- Si una cama se libera sin pasar por limpieza, no genera recambio.

## RF-114: reportes de alertas

Ver `modulo-3-alertas.md`. Endpoint `GET /api/v1/clinical-alerts/reports`, pantalla `/alertas/reportes`.

## Pruebas

- Backend: `backend/api/tests/Feature/HospitalIndicatorsApiTest.php` (escenario con 2 salas, 5 camas, 4 ingresos, 4 órdenes de limpieza y 2 alertas).
- Frontend: `frontend/web/src/modules/hospital-reports/hospital-reports.test.tsx`.
- E2E: `frontend/web/cypress/e2e/reportes/` (ver `docs/operacion/pruebas-cypress-alertas.md`).
