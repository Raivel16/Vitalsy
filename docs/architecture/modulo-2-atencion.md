# Módulo 2: Atención y seguimiento

Interfaces del ciclo diario del paciente hospitalizado (Proceso 2). Enfoque UX: **censo / worklist + chart del paciente + acciones por rol** (no stepper lineal de ingreso).

## Roles (claves técnicas)

| Clave | Actor |
|---|---|
| `enfermera_piso` | Enfermera de piso |
| `auxiliar_enfermeria` | Auxiliar de enfermería |
| `medico_residente` | Médico residente |
| `medico_tratante` | Médico tratante |

Cuentas demo: `{rol}@vitalsy.local` / `Vitalsy.2026`.

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-17 | Hecho | `/atencion/laboratorio?ingreso=` · `POST/GET .../lab-results` |
| RF-18 | Hecho | `/atencion/imagenes?ingreso=` · `POST/GET .../imaging-reports` |
| RF-19 | Hecho | `/atencion/visita?ingreso=` · `GET .../clinical-visit` |
| RF-20 | Hecho | `/atencion/evolucion?ingreso=` · `POST/GET .../medical-evolution-notes` |
| RF-21 | Hecho | `/atencion/cpoe?ingreso=` · `POST .../prescriptions` + Kardex CPOE |
| RF-22–27 | Hecho | `/atencion/constantes?ingreso=` · vitals/telemetría + NEWS2 + gráfica + alertas/agenda |
| RF-28–31 | Hecho | `/atencion/emar?ingreso=` · e-MAR, 5 correctos, firma |
| RF-32–33 | Hecho | `/atencion/cuidados?ingreso=` · evolución enfermería + cuidados auxiliares |

## Rutas UI

| Ruta | Roles |
|---|---|
| `/atencion/laboratorio` | residente, tratante, enfermera |
| `/atencion/imagenes` | residente, tratante, enfermera |
| `/atencion/visita` | residente, tratante |
| `/atencion/evolucion` | residente |
| `/atencion/cpoe` | tratante |
| `/atencion/constantes` | enfermera, auxiliar |
| `/atencion/emar` | enfermera |
| `/atencion/cuidados` | enfermera, auxiliar |

Todas requieren `?ingreso=<encounterId>` de un ingreso existente (idealmente `current_step=cerrado`).
