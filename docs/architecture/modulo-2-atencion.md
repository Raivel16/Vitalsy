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
| RF-17 | Hecho | `/atencion/laboratorio?ingreso=` · `POST/GET .../inpatient-care/encounters/{id}/lab-results` (stub LIS FHIR) |
| RF-18–RF-33 | Pendiente | Siguiente incremento |

## Cómo comprobar RF-17

1. Iniciar sesión como `medico_residente@vitalsy.local` (u otro rol clínico autorizado).
2. Abrir `/atencion/laboratorio?ingreso=<encounterId>` de un ingreso existente.
3. Pulsar **Integrar desde LIS**: deben aparecer Hemoglobina y Creatinina (stub) y persistir en `lab_results`.
