# Módulo 6: Gestión del personal asistencial

Implementa el Proceso 6: rol mensual, balanceo por NEWS2, handover y coberturas.

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-72 | Hecho | `POST /api/v1/staff/shift-plans` |
| RF-73–74 | Hecho | `POST .../assignments/suggest` · `POST .../approve` |
| RF-75–77 | Hecho | `GET/POST /api/v1/staff/handover` |
| RF-78–82 | Hecho | ausencias, retén, autorización RRHH y confirmación |
| RF-34 enlace | Hecho | `AlertRecorder` asigna a la enfermera de `daily_patient_assignments` |

## Rutas UI

`/personal` — jefatura, supervisora, enfermera de piso y RRHH.
