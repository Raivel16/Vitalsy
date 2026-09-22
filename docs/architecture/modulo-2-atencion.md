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
| RF-17 | Hecho | `/atencion/laboratorio?ingreso=` · `POST/GET .../lab-results` (stub LIS FHIR) |
| RF-18 | Hecho | `/atencion/imagenes?ingreso=` · `POST/GET .../imaging-reports` (stub PACS FHIR) |
| RF-19 | Hecho | `/atencion/visita?ingreso=` · `GET .../clinical-visit` (labs + imágenes + notas del día) |
| RF-20 | Hecho | `/atencion/evolucion?ingreso=` · `POST/GET .../medical-evolution-notes` (médico residente) |
| RF-21 | Hecho | `/atencion/cpoe?ingreso=` · `POST .../prescriptions` + Kardex CPOE (médico tratante) |
| RF-22–27 | Hecho | `/atencion/constantes?ingreso=` · vitals/telemetría + NEWS2 + gráfica + alertas/agenda |
| RF-28–RF-33 | Pendiente | Siguiente incremento |

## Cómo comprobar RF-17

1. Iniciar sesión como `medico_residente@vitalsy.local` (u otro rol clínico autorizado).
2. Abrir `/atencion/laboratorio?ingreso=<encounterId>` de un ingreso existente.
3. Pulsar **Integrar desde LIS**: deben aparecer Hemoglobina y Creatinina (stub) y persistir en `lab_results`.

## Cómo comprobar RF-18

1. Con el mismo ingreso, abrir `/atencion/imagenes?ingreso=<encounterId>`.
2. Pulsar **Integrar desde PACS**: deben aparecer RX de tórax y ECO abdominal (stub) en `imaging_reports`.

## Cómo comprobar RF-19

1. Como `medico_tratante` o `medico_residente`, abrir `/atencion/visita?ingreso=<encounterId>`.
2. Debe mostrar en una sola pantalla labs, imágenes y notas de enfermería **del día**.

## Cómo comprobar RF-20

1. Como `medico_residente@vitalsy.local`, abrir `/atencion/evolucion?ingreso=<encounterId>`.
2. Escribir la nota, marcar firma y registrar: debe aparecer en el listado como firmada.

## API Yaak

Colección importable: [`docs/api/yaak-modulo-2.postman_collection.json`](../api/yaak-modulo-2.postman_collection.json). Guía: [`docs/api/README.md`](../api/README.md).
