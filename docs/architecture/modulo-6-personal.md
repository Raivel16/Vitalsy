# Módulo 6: Gestión del personal asistencial

Implementa el Proceso 6: rol mensual, balanceo por NEWS2, handover y coberturas.

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-78 | Hecho | `POST /api/v1/staff/shift-plans` |
| RF-79–80 | Hecho | `POST .../assignments/suggest` · `POST .../approve` |
| RF-81–83 | Hecho | `GET/POST /api/v1/staff/handover` |
| RF-84–88 | Hecho | ausencias, retén, autorización RRHH y confirmación |
| RF-39 enlace | Hecho | `AlertRecorder` asigna a la enfermera de `daily_patient_assignments` |

## Rutas UI

`/personal` — jefatura, supervisora, enfermera de piso y RRHH.
