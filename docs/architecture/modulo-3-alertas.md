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

## Tiempo real

RNF-01 (empuje ≤ 2 s), RNF-12 (reconexión ≤ 5 s y resincronización) y RF-53 (campana, avisos y sirena continua hasta confirmar lectura).

**Transporte.** Laravel Reverb (protocolo Pusher) con `laravel-echo` + `pusher-js` en la web. Los navegadores entran por Nginx en `/app/{clave}` (`ws`/`wss` con cabeceras `Upgrade`); el backend publica a Reverb por la red interna (`reverb:8080`).

**Canal y autorización.** Canal privado `alerts.{userId}`; la autorización es `POST /api/v1/broadcasting/auth` (`auth:sanctum` + `active`, misma sesión/cookie que el resto de la API). Solo se autoriza si el principal es un `User` de personal activo y `id == userId`; una `LifeAccount` (RF-89) o un usuario inactivo reciben 403. Callback en `routes/channels.php`.

**Eventos** (`ShouldBroadcastNow`, no pasan por cola):

| Evento (`broadcastAs`) | Cuándo | Destinatarios |
|---|---|---|
| `alert.raised` (`ClinicalAlertRaised`) | Alerta creada (NEWS2, observación, cumplimiento) o escalada hacia un perfil que antes no la veía | Usuarios activos que la ven en su bandeja |
| `alert.updated` (`ClinicalAlertUpdated`) | Cambio de estado/asignación/severidad/plazos o cierre | Quienes la veían antes y quienes la ven ahora |

El despacho está en un único punto, `ClinicalAlertObserver` (sobre el modelo `ClinicalAlert`), por lo que cubre todos los caminos que persisten alertas. Los destinatarios salen de `AlertAudience`, que replica las reglas de `AlertWorkflow::inboxFor` (hay una prueba de paridad por estado y rol). Un fallo del transporte se registra y no interrumpe el flujo clínico.

**Carga mínima** (un evento por usuario): `alertId`, `severity`, `news2Total`, `encounterId`, `location` (habitación/lecho), `status`, `createdAt`, `needsSiren` (calculado para ese destinatario). Sin nombre del paciente ni texto libre clínico.

**Cliente web** (`useAlertInbox`).
- Evento: refresca la bandeja de inmediato; la API sigue siendo la fuente de verdad (la carga nunca enciende ni apaga la sirena por sí sola).
- Conectado: sondeo de respaldo cada 60 s. Desconectado o sin canal: sondeo cada 15 s (comportamiento previo).
- Caída: reintenta conectar cada 2 s y al disparar `online`; al (re)conectar hace un refresh completo de la bandeja (RNF-12).
- Sirena: continua hasta confirmar lectura; `ALERT_ACKNOWLEDGED_EVENT` se comporta como antes. Se cancelan suscripción y temporizadores al desmontar/cerrar sesión.
- El id propio llega en `GET /api/v1/auth/me` (`id`).

**Variables de entorno.** Backend: `BROADCAST_CONNECTION` (`reverb` en despliegue; `log`/`null` sin servidor WebSocket y en pruebas), `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME`, `REVERB_SERVER_HOST`, `REVERB_SERVER_PORT`, `REVERB_ALLOWED_ORIGINS`. Frontend: `VITE_REVERB_APP_KEY` (obligatoria), `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, `VITE_REVERB_SCHEME` (opcionales; por defecto el host/puerto/esquema de la página). En producción usar claves aleatorias, `https`/`wss` detrás del proxy TLS (RNF-05) y acotar `REVERB_ALLOWED_ORIGINS` al dominio público.

**Cómo ejecutarlo.** `docker compose up --build` levanta el servicio `reverb` (`php artisan reverb:start --host=0.0.0.0 --port=8080`, puerto interno) y Nginx enruta `/app/`. Sin Docker: `php artisan reverb:start` y `BROADCAST_CONNECTION=reverb`.

**Medición.** `php artisan alerts:measure-latency --count=50` genera alertas sintéticas (en una transacción que se revierte) y reporta p50/p95/máx del tiempo de servidor entre la decisión y la entrega al broadcaster configurado. Alcance honesto: mide el despacho del servidor, no la recepción en el navegador.

**Autenticación del canal.** La web usa sesión Sanctum por cookie + XSRF (no bearer). La ruta `POST /api/v1/broadcasting/auth` está registrada en `routes/api.php` dentro del grupo `auth:sanctum` + `active` + `password.rotated`, por lo que hereda la pila del grupo `api` (stateful, sesión, `EnsureRequestOrigin`); una prueba hace el flujo real login -> auth de canal sin `actingAs` y compara la pila de middleware con la de las demás rutas autenticadas.

**Emisión tras commit.** El observador difunde con `DB::afterCommit`: una transacción revertida no emite y el refresh del cliente siempre ve la alerta. Los nombres de evento (`alert.raised`, `alert.updated`) están en `realtime/alertEvents.ts` y una prueba de backend los compara con `broadcastAs()`.

**Reconexión.** Espera creciente determinista 1 s, 2 s, 4 s y fija en 5 s; se reinicia al conectar o al disparar `online`.

**Producción.** `docker-compose.prod.yml` exige `REVERB_APP_ID/KEY/SECRET` y `REVERB_ALLOWED_ORIGINS` (sin valores por defecto); `reverb.php` es restrictivo si `APP_ENV=production`. La clave pública entra al build web por `VITE_REVERB_APP_KEY` (build arg del Dockerfile). `docker/nginx/prod.conf` (servicio `proxy`, solo TLS 1.3) incluye `/app/` (Upgrade/Connection, lectura larga); el navegador usa `wss://<dominio>/app` y Reverb no publica puertos (ver `https-produccion.md`, RNF-05).

**Riesgo residual.** Un usuario desactivado conserva la conexión WebSocket ya autorizada hasta que cae; el corte inmediato del lado del servidor queda fuera de alcance.

**Qué está verificado y qué no.** Verificado por pruebas automáticas: destinatarios por camino (NEWS2, observación, escalamiento, acuse), autorización de canal, carga mínima, y en la web suscripción, refresh por evento, respaldo por sondeo, reintento ≤ 5 s (con temporizadores simulados), refresh completo al reconectar y limpieza. **No verificado de extremo a extremo:** la latencia real ≤ 2 s hasta el navegador (RNF-01) y la reconexión real tras perder señal (RNF-12) requieren una corrida en staging con Reverb y un cliente real; hasta entonces no se declaran cumplidos.

## Deuda conocida

Corrida de aceptación en staging de RNF-01 (latencia extremo a extremo) y RNF-12 (reconexión real) pendiente.
