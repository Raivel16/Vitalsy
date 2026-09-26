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
| RF-48 | Hecho | `POST .../discharge/encounters/{id}/order` |
| RF-49 | Hecho | `POST .../epicrisis` |
| RF-50 | Hecho | `POST .../prescriptions` |
| RF-51 | Hecho | El tablero de `trabajo_social` lista altas nuevas |
| RF-52 | Hecho | `POST .../social-assessment` |
| RF-53 | Hecho | `GET .../reconciliation-context` |
| RF-54 | Hecho | `POST .../reconciliation` |
| RF-55 | Hecho | `POST .../nursing-report` incorpora el informe social |
| RF-56 | Hecho | `POST .../indication-receipt` (asistido por enfermería) |
| RF-57 | Hecho | `POST .../account` |
| RF-58–59 | Hecho | `POST .../exit-pass` · `GET .../authorized-exits` |
| RF-60–61 | Hecho | `POST .../exit` dispara `PatientExited` y marca el ingreso `egresado` |

## Rutas UI

| Ruta | Roles |
|---|---|
| `/egreso` | los seis perfiles del proceso |
| `/egreso/:encounterId` | ficha con acciones filtradas por rol |
