# Módulo 3: Gestión de alertas y respuesta ante alteraciones

Implementa el Proceso 3. Una alerta nace del monitoreo (RF-26) o de una observación imprevista, se enruta al perfil responsable y escala automáticamente cuando nadie responde dentro del plazo.

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
| RF-34 | Hecho | Alta automática al registrar constantes con NEWS2 ≥ 1; enrutada a `enfermera_piso` |
| RF-35 | Hecho | `/alertas/deterioro?ingreso=` · `POST .../clinical-alerts/observations` |
| RF-36 | Hecho | `POST .../{alert}/reassessment` recalcula NEWS2 sobre la misma alerta |
| RF-37 | Hecho | `POST .../{alert}/monitoring-schedule` programa el control y cierra la alerta |
| RF-38 | Hecho | `POST .../{alert}/medical-request` |
| RF-39 | Hecho | `POST .../{alert}/acknowledge` registra hora y responsable |
| RF-40 | Hecho | `alerts:process-slas` escala a `enfermera_supervisora` |
| RF-41 | Hecho | La solicitud médica asigna la alerta al médico con plazo de 15 minutos |
| RF-42 | Hecho | `POST .../{alert}/acknowledge` con rol médico |
| RF-43 | Hecho | `alerts:process-slas` escala a supervisora y ERR al vencer los 15 minutos |
| RF-44 | Hecho | `POST .../{alert}/medical-assessment` |
| RF-45 | Hecho | `POST .../{alert}/rapid-response-request` |
| RF-46 | Hecho | `POST .../{alert}/err-assessment` con `transferToIcu` |
| RF-47 | Hecho | `GET .../{alert}/timeline` · `alert_events` append-only |

## Estados de la alerta

```
abierta ──ack──> en_atencion ──┬── programacion ──> cerrada
   │                            └── solicitud_medica ──> medico_notificado
   │                                                          │
   └── SLA ──> escalada_supervisora ── SLA ──> medico_notificado
                                                              │
                              ack médico ──> medico_en_atencion ──> err_solicitado
                                                              │            │
                                          SLA 15 min ──> escalada_err ─────┴──> cerrada
```

## Rutas UI

| Ruta | Roles |
|---|---|
| `/alertas` | los seis perfiles del proceso |
| `/alertas/:alertId` | los seis perfiles; las acciones se filtran por rol |
| `/alertas/deterioro` | auxiliar, enfermera de piso y supervisora |

## Plazos

Configurables en `config/vitalsy.php` (`vitalsy.alerts`):

| Clave | Valor por defecto | RF |
|---|---|---|
| `nurse_ack_minutes` | 5 | RF-39, RF-40 |
| `supervisor_ack_minutes` | 5 | RF-40 |
| `medical_response_minutes` | 15 | RF-43 (fijado por el requisito) |
| `routine_control_hours` | 12 | RF-27 |

El escalamiento depende del scheduler: `Schedule::command('alerts:process-slas')->everyMinute()` en `routes/console.php`.

## Modelo de datos

Sobre las tablas ya existentes del módulo 3 se agregaron columnas de enrutamiento a `clinical_alerts` (`assigned_role`, `assigned_user_id`, `created_by`, `acknowledge_due_at`, `medical_notified_at`, `medical_due_at`, `closed_at`, `closure_note`) y la tabla `alert_events`.

`alert_events` es append-only: el modelo bloquea `updating` y `deleting` para cumplir RNF-07.

## Deuda conocida

La bandeja se refresca por consulta al abrir la pantalla. El despacho en menos de 2 segundos por WebSockets (RNF-01) y la resincronización tras caída de red (RNF-11) quedan pendientes en una rama propia.
