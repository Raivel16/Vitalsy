# Módulo 5: Gestión y asignación de camas

Implementa el Proceso 5. El censo vive en `wards`/`beds` (CatalogSeeder). Las solicitudes sin lecho compatible entran a lista de espera ordenada por gravedad. El egreso (`PatientExited`) despacha la limpieza terminal.

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-68 | Hecho | `POST /api/v1/beds/requests` |
| RF-69 | Hecho | `GET /api/v1/beds/census` · `/camas` |
| RF-70 | Hecho | solicitudes `en_espera` ordenadas por prioridad |
| RF-71 | Hecho | `POST /api/v1/beds/projections` |
| RF-72–73 | Hecho | `GET .../suggestions` · `POST .../assign` |
| RF-74–77 | Hecho | listener `DispatchCleaningOnPatientExit` · `/camas/limpieza` |

## Rutas UI

| Ruta | Roles |
|---|---|
| `/camas` | `gestion_camas`, `enfermera_supervisora` |
| `/camas/limpieza` | limpieza, auxiliar, supervisora |
