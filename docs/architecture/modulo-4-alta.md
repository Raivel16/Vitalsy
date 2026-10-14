# Módulo 4: Alta y egreso hospitalario

Implementa el Proceso 4. La orden de alta abre en paralelo la valoración social y la conciliación de enfermería; el pase de salida cierra el trámite administrativo y la salida efectiva libera la cama.

## Roles

| Clave | Actor |
|---|---|
| `medico_tratante` / `medico_residente` | Orden, epicrisis y recetas |
| `trabajo_social` | Valoración social pre-egreso |
| `enfermera_piso` | Conciliación, informe, acuse y salida efectiva |
| `altas_caja` | Cuenta y pase de salida |
| `camillero` | Consulta de autorización |

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-54 | Hecho | `POST .../discharge/encounters/{id}/order` |
| RF-55 | Hecho | `POST .../epicrisis` |
| RF-56 | Hecho | `POST .../prescriptions` |
| RF-57 | Hecho | El tablero de `trabajo_social` lista altas nuevas |
| RF-58 | Hecho | `POST .../social-assessment` |
| RF-59 | Hecho | `GET .../reconciliation-context` |
| RF-60 | Hecho | `POST .../reconciliation` |
| RF-61 | Hecho | `POST .../nursing-report` incorpora el informe social |
| RF-62 | Hecho | `POST .../indication-receipt` (asistido por enfermería) |
| RF-63 | Hecho | `POST .../account` |
| RF-64–65 | Hecho | `POST .../exit-pass` · `GET .../authorized-exits` |
| RF-66–67 | Hecho | `POST .../exit` solo para `enfermera_piso`. Dispara `PatientExited` y marca el ingreso `egresado`. El censo y el tablero dejan de listarlo |

## Rutas UI

| Ruta | Roles |
|---|---|
| `/egreso` | los seis perfiles del proceso. El médico inicia el alta desde hospitalizados (`cerrado`) o escaneando el brazalete |
| `/egreso/:encounterId` | ficha con acciones filtradas por rol. El informe de enfermería puede registrar Vitalsy Life dentro de cuidados domiciliarios |


## Plan post-alta para Vitalsy Life (RF-96–98)

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-96 | Hecho | `POST .../discharge/encounters/{id}/life-plan` (`enfermera_piso`, `mode`: `usuario` / `invitacion` / `rechaza`). Requiere orden de alta, receta y conciliación; construye el plan desde la receta y el informe de enfermería, con vigencia de 30 días y códigos `VLA-` / `VLI-` |
| RF-97 | Hecho | `GET /api/v1/life/discharge-plans/{code}` (ciudadano): reclamo de un solo uso por cuenta, idempotente para la misma cuenta; 409 `plan_claimed` si lo tiene otra |
| RF-98 | Hecho | La salida efectiva (`PatientExited`) transfiere la custodia (`custody_transferred_at`) y activa el plan; un plan ya reclamado conserva `reclamado`. Tras el egreso no puede reemitirse |

Los demás roles ven el modo y el estado del plan, no los códigos ni el contenido. Contrato: [contrato-clinical-life.md](contrato-clinical-life.md).
