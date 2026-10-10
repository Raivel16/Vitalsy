# Módulo 6: Gestión del personal asistencial

Implementa el Proceso 6: rol mensual, balanceo por NEWS2, handover y coberturas.

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-78 | Hecho | `POST /api/v1/staff/shift-plans` (reemplaza el mes); `GET .../shift-plans` lista los roles publicados de los últimos 12 meses; `GET .../shift-plans/{mes}` devuelve nombres, publicador y retenes (estos solo para jefatura, supervisora y RRHH). UI: matriz colaborador × día (D/N/L/R), navegador de meses y buscador de personas por nombre/correo |
| RF-79–80 | Hecho | `POST .../assignments/suggest` · `POST .../approve` (propuesta editable). **RF-80 parcial:** no hay notificación persistente a la enfermera; la UI ya no afirma que se notificó |
| RF-81–83 | Hecho | `GET /api/v1/staff/handover?fromUserId=` consolida a la saliente (alertas y dosis); `POST` firma y solo reasigna lo mostrado. Exige turnos consecutivos del mismo servicio en el rol publicado (el de la saliente termina el día indicado y cuando empieza el de la entrante) y solo en el cambio de turno (de 1 h antes a 2 h después); falla cerrado. **RF-82 parcial:** el reporte se guarda en `payload`, sin validación aparte |
| RF-84–85 | Hecho | `POST .../absences` (motivo obligatorio, sin duplicados, transaccional); rebalanceo ponderado por NEWS2 y respuesta con reasignaciones y pacientes sin cubrir |
| RF-86–88 | Hecho | cobertura `solicitada → aprobada_jefatura → autorizada → confirmada`; cada transición valida el estado previo (422); la supervisora confirma al retén (RF-88) desde `/personal` |
| apoyo | Hecho | `GET /api/v1/staff/members` (buscador de personas; `email` solo para jefatura y supervisora) |
| RF-39 enlace | Hecho | `AlertRecorder` asigna a la enfermera de `daily_patient_assignments` |

## Rutas UI

`/personal` — jefatura, supervisora, enfermera de piso y RRHH.

## Trazabilidad RF → prueba

| RF | Pruebas |
|---|---|
| RF-78 | `StaffRosterApiTest::test_leadership_publishes_monthly_shift_plan`, `staff-roster.test.tsx` «la jefatura arma el rol…» |
| RF-79–80 | `test_suggests_fewer_patients…`, `test_approve_rejects_unknown_nurse`, «la supervisora sugiere con nombres…» |
| RF-81–83 | `test_handover_preview_lists_the_outgoing_nurse_patients…`, `test_handover_is_refused_between_nurses_published_in_different_units`, «la enfermera de piso consolida…» |
| RF-84–85 | `test_absence_*` (validación, duplicado, rebalanceo ponderado, sin receptoras) y «muestra el resultado de la inasistencia…» |
| RF-86–88 | `test_coverage_transitions_reject_wrong_state_and_repeats`, `test_coverage_list_exposes_names…`, «la supervisora confirma el ingreso del retén…» |
