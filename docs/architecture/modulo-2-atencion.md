# Módulo 2: Atención y seguimiento

Interfaces del ciclo diario del paciente hospitalizado (Proceso 2). Enfoque UX: **censo / worklist + chart del paciente + acciones por rol** (no stepper lineal de ingreso).

## Roles (claves técnicas)

| Clave | Actor |
|---|---|
| `enfermera_piso` | Enfermera de piso |
| `auxiliar_enfermeria` | Auxiliar de enfermería |
| `medico_residente` | Médico residente |
| `medico_tratante` | Médico tratante |

Cuentas demo: `{rol}@vitalsy.local`. La contraseña es `DEMO_PASSWORD` del `.env` local.

## Avance por RF

| RF | Estado | Interfaz / API |
|---|---|---|
| RF-21 | Hecho | `/atencion/laboratorio?ingreso=` · `POST/GET .../lab-results` |
| RF-22 | Hecho | `/atencion/imagenes?ingreso=` · `POST/GET .../imaging-reports` |
| RF-23 | Hecho | `/atencion/visita?ingreso=` · `GET .../clinical-visit` |
| RF-24 | Hecho | `/atencion/evolucion?ingreso=` · `POST/GET .../medical-evolution-notes` |
| RF-25 | Hecho | `/atencion/cpoe?ingreso=` · `POST .../prescriptions` + `GET .../prescriptions/active` + Kardex · frecuencia de lista y primera dosis |
| RF-26–31 | Hecho | `/atencion/constantes?ingreso=` · vitals/NEWS2 completo + gráfica SVG + alertas/agenda |
| RF-32–35 | Hecho | `/atencion/emar?ingreso=` · dosis del turno y vencidas pendientes · alertas de dosis vencida |
| RF-36–37 | Hecho | `/atencion/cuidados?ingreso=` · tabs Notas/Actividades · trazabilidad de quien registró · filtro por fecha |
| RF-38 | Hecho | `/atencion/chart?ingreso=` · expediente con pestañas · timeline por fecha · `GET .../clinical-chart?from=&to=` |
| RF-42 | Hecho | `/atencion/controles` · bandeja de controles programados (listar / registrar / reprogramar) |

## Rutas UI

| Ruta | Roles |
|---|---|
| `/atencion/chart` | residente, tratante, enfermera, auxiliar |
| `/atencion/laboratorio` | residente, tratante, enfermera |
| `/atencion/imagenes` | residente, tratante, enfermera |
| `/atencion/visita` | residente, tratante |
| `/atencion/evolucion` | residente, tratante |
| `/atencion/cpoe` | tratante |
| `/atencion/constantes` | enfermera, auxiliar |
| `/atencion/controles` | enfermera, auxiliar, supervisora |
| `/atencion/emar` | enfermera |
| `/atencion/cuidados` | enfermera, auxiliar |

Todas requieren `?ingreso=<encounterId>` de un ingreso existente (idealmente `current_step=cerrado`).

## Navegación UI

El menú lateral incluye el grupo **Atención en piso**, filtrado por rol.

Flujo recomendado:

1. Iniciar sesión con cuenta clínica (`medico_tratante@vitalsy.local`, etc.).
2. Abrir **Pacientes** y, en un ingreso cerrado/hospitalizado, pulsar **Atención**.
3. Usar **Expediente clínico** (pestañas Admisión / Constantes / Tratamiento / Paraclínicos / Evoluciones); el menú lateral conserva el `ingreso`.
4. CPOE (médico tratante) → e-MAR (enfermera) para administrar dosis del turno.
5. Controles programados en **Controles** (bandeja del turno); al vencer generan alerta con sirena.
6. En **Cuidados**, enfermera de piso y auxiliar pueden registrar notas y actividades (pestañas); las actividades muestran quién las registró.
7. En el expediente, el historial temporal se agrupa por fecha y admite filtro (Hoy / 7 días / 30 días / Todo / rango).

En `/atencion/*` no se muestra el stepper de admisión del Módulo 1.

## Horarios de medicación (RF-25, RF-32)

- **Quién y dónde:** el médico tratante, en CPOE. Por cada medicamento elige la frecuencia (`cada 4/6/8/12/24 horas` o `dosis única`) y la fecha y hora de la primera dosis, que no puede estar en el pasado (margen de 5 minutos). La lista vive en `MedicationFrequency` y en `cpoe/domain/schedule.ts`.
- **Cálculo:** `MedicationDoseScheduler` crea las dosis desde la primera dosis, sumando el intervalo. El turno ya no interviene: solo decide qué muestra el e-MAR.
- **Cuándo:** al firmar se crean las dosis de las próximas 24 horas. `emar:extend-doses` mantiene ese adelanto cada hora, aunque nadie abra el e-MAR. Si el sistema estuvo detenido, no se crean dosis atrasadas.
- **Cambios del plan:** cambiar la frecuencia o la primera dosis, quitar el medicamento o reemplazar el plan cancela sus dosis pendientes y cierra sus alertas. Corregir solo el nombre, la dosis o la vía conserva el horario. Las dosis administradas no se tocan.
- **Salida del paciente:** `CancelDosesOnPatientExit` cancela las dosis pendientes y cierra sus alertas; no se crean más.
- **e-MAR:** muestra el turno vigente y las dosis vencidas de turnos anteriores que sigan pendientes, porque su alerta solo se cierra al administrarlas.
- **Indicaciones sin lista:** el plan basal del BPMH empieza a la hora de la firma con su frecuencia en texto libre: se lee el número de horas y, si no hay, cada 8 horas. Los planes anteriores a este cambio no tienen primera dosis y siguen desde su última dosis, o desde ahora si no tienen ninguna.
