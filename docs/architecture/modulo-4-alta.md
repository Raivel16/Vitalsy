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
| RF-66–67 | Hecho | `POST .../exit` dispara `PatientExited` y marca el ingreso `egresado` |

## Rutas UI

| Ruta | Roles |
|---|---|
| `/egreso` | los seis perfiles del proceso |
| `/egreso/:encounterId` | ficha con acciones filtradas por rol |
