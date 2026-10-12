# Contrato Clinical ↔ Life (RF-89 a RF-98)

Fuente de verdad para la integración entre Vitalsy Clinical (Laravel + React) y Vitalsy Life (Expo). El backend, la web y la app implementan esta interfaz; si cambia, se cambia aquí primero.

## Reglas generales

- Todo el namespace ciudadano de Life es `/api/v1/life/*`. La app hoy llama `/api/life/*`; ese prefijo se abandona y la app pasa a `/api/v1/life/*`.
- Los endpoints clínicos viven bajo `/api/v1/hospital-admission/*` y `/api/v1/discharge/*` y se protegen con `auth:sanctum` + `role:<rol>`.
- Dos tipos de actor, tokens Sanctum separados: personal (`User`, con `role`) y ciudadano (`LifeAccount`, habilidad `life`, sin `role`). Un ciudadano recibe 403 en rutas clínicas y el personal recibe 403 en rutas Life.
- Life es software de bienestar: no calcula NEWS2 ni diagnostica. Clinical solo muestra la línea de base importada como contexto de ingreso.

## Endpoints

| Endpoint | Actor | Entrada | Salida |
|---|---|---|---|
| `POST /api/v1/life/auth/register` | ciudadano | `{name,email,password}` | `{token, account}` |
| `POST /api/v1/life/auth/login` | ciudadano | `{email,password}` | `{token, account}` |
| `POST /api/v1/life/sync` | ciudadano | `{items:[{id,kind,body,status}]}` | `{accepted:[id], rejected:[{id,reason}]}` |
| `PUT /api/v1/life/consent` | ciudadano | `{sharingEnabled}` | `{sharingEnabled, revokedAt}` |
| `POST /api/v1/life/link-codes` | ciudadano | — | `{code, expiresAt}` (409 si compartición cerrada) |
| `POST /api/v1/hospital-admission/life-links` | admision | `{encounterId, code}` | `{link:{status, importedAt, baselineSummary}}` |
| `GET /api/v1/hospital-admission/encounters/{id}/life-baseline` | enfermera_piso, médicos | — | `{baseline: null \| {importedAt, metrics:[{kind,low,high,days}]}}` |
| `POST /api/v1/discharge/encounters/{id}/life-plan` | enfermera_piso | `{mode: 'usuario'\|'invitacion'\|'rechaza'}` | `{lifePlan:{mode, code, invitationCode, payload}}` |
| `GET /api/v1/life/discharge-plans/{code}` | ciudadano | — | JSON del plan (`medications`, `comfortSigns`, `homeCare`, `validUntil`) |

`account` es `{id, name, email}`. Los tokens de registro y login llevan la habilidad `life`.

## Código de vinculación (RF-94)

- Formato `VL-XXXX-XXXX` (alfanumérico en mayúsculas), único.
- TTL de 30 minutos y de un solo uso: `expiresAt = emisión + 30 min`; al consumirse queda `consumed_at` y el `encounterId` consumidor.
- Solo se emite con la compartición activa (RF-93). Con la compartición cerrada, `POST /life/link-codes` responde `409 sharing_closed`.
- Revocar el consentimiento invalida los códigos pendientes.

## `baselineSummary` (RF-95)

```json
{
  "metrics": [
    { "kind": "heart_rate", "low": 58, "high": 92, "days": 21 }
  ]
}
```

- `kind` usa los mismos identificadores de `BiometricKind` de la app (`heart_rate`, `spo2`, …).
- `low` y `high` son el rango personal (percentil 10–90, sin las 3 lecturas más recientes) y `days` los días de historia útil usados.
- `GET .../life-baseline` devuelve `{baseline: null}` si no hubo importación, o `{importedAt, metrics:[…]}` (el mismo arreglo `metrics`).
- `link.status` es `importado` cuando se consumió el código y se guardó la línea de base.

## Plan de alta (RF-96, RF-97, RF-98)

Modos de `life-plan`: `usuario` (el paciente ya tiene cuenta Life, el plan queda con `code`), `invitacion` (se emite `invitationCode` de onboarding patrocinado) y `rechaza` (no se genera plan activo; se registra la decisión).

`payload` del plan (lo que sirve `GET /life/discharge-plans/{code}` y lo que el QR puede incluir en JSON):

```json
{
  "id": "PLAN-ABC123",
  "medications": [{ "name": "Paracetamol", "dose": "500 mg", "schedule": "08:00" }],
  "comfortSigns": ["Fiebre mayor a 38 C"],
  "homeCare": ["Reposo relativo"],
  "validUntil": "2026-10-25"
}
```

- `id` es estable e igual al código del plan.
- `schedule` es `HH:mm`; `validUntil` es `YYYY-MM-DD`.
- Si la frecuencia de la receta no trae una hora explícita `HH:mm`, el horario de la dosis cae a `08:00` (decisión de producto pendiente: la enfermera debería revisarlo en la web antes de emitir).
- `code`, `invitationCode` y `payload` son secretos al portador: `GET discharge/encounters/{id}` y el tablero solo los devuelven a `enfermera_piso`; el resto de roles de alta ve únicamente `mode`, `status` y `validUntil`.

### Diferencias verificadas con la app (`movil/src/modules/plan/domain/plan.ts`)

`asPlan`/`RawPlan` acepta la forma anterior, con estas diferencias que la tarea de la app debe resolver:

1. `RawPlan` no lee `id`: la app genera `plan-${timestamp}`. Debe adoptar el `id` del servidor para que reclamar dos veces sea idempotente.
2. `RawPlan` acepta además un envoltorio `{plan: {...}}`; el servidor puede responder así o plano.
3. `validUntil` ausente se rellena con hoy + 14 días en ISO completo; el servidor siempre envía `YYYY-MM-DD`.
4. `schedule` ausente o inválido cae a `08:00`; el servidor garantiza `HH:mm`.
5. Se descartan medicamentos sin `name` o `dose`.
6. Con medicación, signos y cuidados vacíos la app rechaza el plan; el servidor no debe emitir planes vacíos.
7. `fetchDischargeBody` solo usa la respuesta si `response.ok`; cualquier error (404, 409) hoy se muestra como «sin plan». La app debe distinguir `plan_not_found` y `plan_claimed`.

## Errores

| HTTP | `code` | Cuándo |
|---|---|---|
| 422 | `code_expired` | El código de vinculación venció (más de 30 min). |
| 422 | `code_consumed` | El código ya se usó. |
| 409 | `sharing_closed` | Compartición cerrada: no se emite código ni se importa. |
| 422 | `batch_too_large` | La solicitud de sync excede 2000 muestras en total o 1 000 000 de caracteres de cuerpo; se rechaza completa y no se guarda nada. |
| 503 | `code_unavailable` | No se pudo generar un código de vinculación único; reintentar. |
| 404 | `plan_not_found` | El código de plan no existe. |
| 409 | `plan_claimed` | El plan ya fue reclamado por otra cuenta. |

Cuerpo de error: `{message, code}`. Otros errores de validación siguen el formato 422 estándar de Laravel.

## Sync (RF-92)

`POST /life/sync` es idempotente por `id` de ítem (`life_biometric_samples` único por cuenta + `client_id`). `accepted` lista los ids guardados (incluidos los repetidos) y `rejected` los inválidos con su `reason`. La app marca «Sincronizado» solo con los ids aceptados.

Topes: por ítem, 500 muestras y 200 000 caracteres; por solicitud, 200 ítems. Topes agregados: 2000 muestras en total y 1 000 000 de caracteres de cuerpo; al excederlos responde `422 batch_too_large`, se rechaza toda la solicitud y no se guarda nada.
