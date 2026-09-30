# Módulo 3: Gestión de alertas y respuesta ante alteraciones

Implementa el Proceso 3. Una alerta nace del monitoreo (RF-30) o de una observación imprevista, se enruta al perfil responsable y escala automáticamente cuando nadie responde dentro del plazo.

## Roles (claves técnicas)

| Clave | Actor |
|---|---|
| `enfermera_piso` | Enfermera de piso (primer destinatario) |
| `auxiliar_enfermeria` | Auxiliar de enfermería (registra deterioro) |
| `enfermera_supervisora` | Enfermera supervisora de piso (primer escalamiento) |
| `medico_residente` / `medico_tratante` | Médico de guardia |
| `equipo_respuesta_rapida` | Equipo de Respuesta Rápida (ERR) |

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-39 | Hecho | Alta automática al registrar constantes con NEWS2 ≥ 1; enrutada a `enfermera_piso` |
| RF-40 | Hecho | `/alertas/deterioro?ingreso=` · `POST .../clinical-alerts/observations` |
| RF-41 | Hecho | `POST .../{alert}/reassessment`; si NEWS2 ≥ 1 notifica al médico automáticamente |
| RF-42 | Hecho | `POST .../{alert}/monitoring-schedule` + bandeja `/atencion/controles` · alertas de control vencido (`compliance_key`) |
| RF-43 | Hecho | `POST .../{alert}/medical-request` (nurse's worry sin exigir reevaluación); inbox compartido residente/tratante |
| RF-44–52 | Hecho | Acuses, SLA, ERR, timeline |
| RF-32/42 cumplimiento | Hecho | `alerts:process-slas` abre alertas por control o dosis e-MAR vencida; escalamiento a supervisora |
| RF-51+ | Hecho | Ciclo UCI: orden → autorizaciones → traslado → retorno |
| RF-38 | Hecho | Expediente incluye pestaña **Alertas** con timeline |
| RF-53 | Hecho | Campana, toast e Ir al evento tras confirmar lectura |

## Estados de la alerta

```
abierta ──ack──> en_atencion ──┬── NEWS2 0 + programacion ──> cerrada
   │                            └── NEWS2≥1 / nurse worry ──> medico_notificado
   │                                                          │
   └── SLA ──> escalada_supervisora ── SLA ──> medico_notificado
                                                              │
                              ack médico ──> medico_en_atencion ──┬── evaluación/indicaciones ──> cerrada
                                                              │   └── ERR ──> err_solicitado
                                          SLA 15 min ──> escalada_err ─────┴──┐
                                                                              │
                                    ERR sin UCI ──> cerrada                   │
                                    ERR con UCI ──> orden_uci                 │
                                          │                                   │
                    auth médico + enfermera ──> uci_autorizada                │
                                          │                                   │
                               traslado efectivo ──> en_uci                   │
                                          │                                   │
                               retorno a sala ──> cerrada <───────────────────┘
```

## Ciclo UCI (ERR)

1. ERR registra evaluación con `transferToIcu: true` → estado `orden_uci` (**no cierra**).
2. Médico y enfermera de piso autorizan (`POST .../icu-authorize`).
3. Enfermería/camillero registra traslado efectivo (`POST .../icu-transfer`) y actualiza ubicación del ingreso.
4. Enfermería registra retorno a sala (`POST .../icu-return`) y cierra con trazabilidad completa.
5. Todo el historial queda en `alert_events` y en el expediente clínico.

## Rutas UI

| Ruta | Roles |
|---|---|
| `/alertas` | perfiles del proceso |
| `/alertas/:alertId` | detalle con pestañas enfermería (toma / deterioro) y ciclo UCI |
| `/alertas/deterioro` | auxiliar, enfermera, supervisora |
| `/atencion/controles` | enfermera, auxiliar, supervisora (bandeja RF-42) |
| `/atencion/chart` | pestaña Alertas (RF-38) |

## Plazos

| Clave | Valor por defecto | RF |
|---|---|---|
| `nurse_ack_minutes` | 5 | RF-44, RF-45 |
| `supervisor_ack_minutes` | 5 | RF-45 |
| `nurse_follow_up_minutes` | 15 | RF-53 (post-acuse) |
| `medical_response_minutes` | 15 | RF-48 |
| `routine_control_hours` | 12 | RF-31 |
| `emar_grace_minutes` | 30 | RF-32 cumplimiento |
| `compliance_ack_minutes` | 15 | RF-42/28 recordatorios |

## Cumplimiento de controles y e-MAR

`alerts:process-slas` también:

1. Abre alerta `source=control` / `compliance_key=control:{encounterId}` si `monitoring_schedules.next_due_at` ya venció.
2. Abre alerta `source=emar` / `compliance_key=emar:{doseId}` si una dosis `pendiente` supera la gracia.
3. Asigna a la enfermera del día (`daily_patient_assignments`) o al rol `enfermera_piso`.
4. Campana + sirena (RF-53); sin acuse/atención escala a `enfermera_supervisora`.
5. Se cierra al registrar el control en Controles o al firmar la dosis en e-MAR.

## RF-53

Confirmar lectura calla sirena; la alerta sigue hasta disponer. A los 15 min sin atención vuelve a sonar. Toast arriba a la derecha; al confirmar lectura con éxito el aviso ofrece **Ir al evento** (`/alertas/:id`) y **Cerrar**.

Las solicitudes médicas (`medico_notificado` / `medico_en_atencion`) son visibles para **residente y tratante** (bandeja compartida de guardia). Tras registrar evaluación e indicaciones (RF-49) el evento se **cierra** (continuidad en sala); ERR se solicita antes del cierre.

## Deuda conocida

WebSockets (RNF-01) y resincronización tras caída de red (RNF-12) pendientes.
