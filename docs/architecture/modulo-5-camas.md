# Módulo 5: Gestión y asignación de camas

Implementa el Proceso 5. El censo vive en `wards`/`beds` (CatalogSeeder). Las solicitudes sin lecho compatible entran a lista de espera ordenada por gravedad. El egreso (`PatientExited`) despacha la limpieza terminal.

## Circuito y máquinas de estado

```
Solicitud:  pendiente | en_espera ──assign──▶ asignada
Cama:       available ──assign──▶ occupied ──egreso──▶ cleaning ──habilitar──▶ available
Orden:      pendiente ──desinfectar──▶ completada ──equipar──▶ equipada ──habilitar──▶ habilitada
```

Cada transición valida el estado previo dentro de una transacción con la fila bloqueada y responde `422` (`ClinicalRuleException`) si no corresponde. Quedan registrados quién y cuándo (`disinfected_by`, `equipped_by`, `enabled_by`, `acknowledged_by`).

| Paso | Rol | Endpoint |
|---|---|---|
| Registrar solicitud | `gestion_camas` | `POST /beds/requests` |
| Asignar lecho (valida compatibilidad, notifica) | `gestion_camas` | `POST /beds/requests/{id}/assign` |
| Confirmar recepción de la asignación | `enfermera_supervisora` | `POST /beds/assignments/{id}/acknowledge` |
| Egreso → orden de limpieza | sistema | listener `DispatchCleaningOnPatientExit` |
| Registrar desinfección (checklist de 4 ítems) | `servicios_generales` | `POST /beds/cleaning-orders/{id}/complete` |
| Marcar unidad equipada | `auxiliar_enfermeria` | `POST /beds/{bedId}/equip` |
| Habilitar en el censo | `enfermera_supervisora` | `POST /beds/{bedId}/release` |

## Avance por RF

| RF | Estado | Interfaz / API | Pruebas |
|---|---|---|---|
| RF-68 | Hecho | Formulario con selector de pacientes y perfil explícito · `POST /beds/requests`, `GET /beds/patients` | `BedAssignmentFlowTest`, `bed-census.test.tsx`, `requests.test.ts` |
| RF-69 | Hecho | Censo con KPI, ocupante y filtros · `GET /beds/census` | `BedManagementApiTest`, `census.test.ts` |
| RF-70 | Hecho | Lista de espera priorizada · `GET /beds/requests?status=pendiente,en_espera` | `BedAssignmentFlowTest`, `bed-census.test.tsx` |
| RF-71 | Hecho | Panel «Proyección de altas» · `POST/GET /beds/projections` | `BedAssignmentFlowTest`, `bed-census.test.tsx` |
| RF-72 | Hecho | Cama sugerida real · `GET .../suggestions`; `BedCompatibility` valida también al asignar | `BedAssignmentFlowTest`, `census.test.ts` |
| RF-73 | Hecho | Confirmación explícita y bandeja de la supervisora · `GET /beds/assignments/notifications` | `BedAssignmentFlowTest`, `bed-census.test.tsx` |
| RF-74 | Hecho | Listener `DispatchCleaningOnPatientExit` | `BedManagementApiTest` |
| RF-75 | Hecho | Checklist obligatorio · `POST .../complete` | `BedCleaningWorkflowTest`, `cleaning-orders.test.tsx` |
| RF-76 | Hecho | `POST /beds/{bedId}/equip` (exige desinfección completa; chequeo ligado a la orden) | `BedCleaningWorkflowTest` |
| RF-77 | Hecho | `POST /beds/{bedId}/release` (exige la orden `equipada` del ciclo actual) | `BedCleaningWorkflowTest` |

## Compatibilidad lecho ↔ paciente (RF-72)

Fuente única en `App\Services\BedManagement\BedCompatibility`. Un lecho es compatible si:

- **Aislamiento:** solicitud con aislamiento → lecho de aislamiento; sin aislamiento → lecho convencional (los de aislamiento se reservan).
- **Especialidad:** la del pabellón coincide con la solicitada.
- **Género:** política del lecho `mixed` o igual al género del paciente.

`frontend/.../domain/census.ts#compatibleRequests` replica la regla solo para habilitar o deshabilitar el botón; el servidor decide.

## Rutas UI

| Ruta | Roles | Diseño de referencia |
|---|---|---|
| `/camas` | `gestion_camas`, `enfermera_supervisora` | `screen_3_censo_hospitalario_corregido` |
| `/camas/limpieza` | `servicios_generales`, `auxiliar_enfermeria`, `enfermera_supervisora` | `screen_4_limpieza_habilitaci_n_de_unidades` |

Las pantallas no muestran guía de pasos informativos. En `/camas` el panel lateral (lista de espera priorizada, notificaciones y proyecciones) queda fijo al hacer scroll y «Nueva solicitud» abre el registro en un cajón lateral. Cada tarjeta expone solo la acción que corresponde al rol y a la etapa; en cualquier otro caso indica a quién se espera.

## Fuera de alcance (sin RF en `requerimientos.md`)

Bloques del diseño que no se implementaron por no tener requisito: personal operativo en turno, tiempo de rotación, inventario de insumos, impresión de bitácora y reporte de avería.
