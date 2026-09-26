# Modelo de datos Vitalsy

Esquema PostgreSQL/Laravel para RF-01–RF-91 (módulos 1–6 + acceso). Complementa —no reemplaza— `admission_encounters` (flujo de admisión ya en producción de desarrollo).

## Convención de `encounter_id`

Las tablas clínicas usan `encounter_id` como **string indexado**, alineado con `admission_encounters.encounter_id`.

**No hay FK** hacia `admission_encounters` para evitar acoplamiento de orden de migraciones y claves string. La integridad se garantiza en capa de aplicación.

Los catálogos y entidades propias (pacientes, camas, alertas hijas, ítems de receta, etc.) sí usan `foreignId()->constrained()` con `cascadeOnDelete` / `nullOnDelete` según el padre.

Estados y acciones (`status`, `action`, `protocol`) se modelan como `string`, no ENUM de MySQL, por compatibilidad PostgreSQL/SQLite.

---

## Dominio: Identidad y acceso (RF-02, RF-86–91)

| Tabla | Rol | RF |
|-------|-----|----|
| `patients` | Identidad canónica (documento único por tipo+número) | RF-02, RF-86+ |
| `patient_contacts` | Familiar / contacto | RF-02, RF-03 |
| `patient_allergies` | Alergias del paciente (`is_optional` para marcar registro opcional) | RF-11, RF-13 |
| `users` (+ `is_active`, `deactivated_at`) | Cuentas y baja lógica | RF-86–91 |
| `admission_encounters` *(existente)* | Caso de ingreso en curso / demo | RF-01–16, RF-83–85 |

---

## Módulo 1 — Admisión y recepción (RF-01–16, RF-83–85)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `coverage_referrals` | Derivación cobertura / caja / trabajo social | RF-03 |
| `informed_consents` | Consentimiento informado firmado | RF-06 |
| `wristband_events` | Emisión/verificación de brazalete (`issued`\|`verified`) | RF-04, RF-08 |
| `nursing_assessments` | Valoración inicial (motivo, historia, alergias JSON) | RF-11 |
| `vital_sign_readings` | Constantes + NEWS2 opcional | RF-12, RF-22–25 |
| `medication_reconciliations` | BPMH ingreso | RF-13 |
| `risk_assessments` | Morse / Braden | RF-14 |

El Kardex y la ficha digital siguen apoyados en `admission_encounters.clinical_payload` / `deliverables` hasta migrar lógica.

---

## Módulo 2 — Atención y seguimiento (RF-17–33)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `lab_results` | Integración LIS | RF-17, RF-19 |
| `imaging_reports` | Integración PACS | RF-18, RF-19 |
| `medical_evolution_notes` | Evolución médica | RF-20 |
| `prescriptions` / `prescription_items` | CPOE | RF-21, RF-16 |
| `medication_administrations` | e-MAR (horario, firma, barcode) | RF-28–31 |
| `nursing_evolution_notes` | Evolución de enfermería | RF-32 |
| `care_activity_completions` | Cuidados básicos finalizados | RF-33 |

---

## Módulo 3 — Alertas clínicas (RF-34–47)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `clinical_alerts` | Alerta con enrutamiento y plazos (`assigned_role`, `acknowledge_due_at`, `medical_due_at`, `closed_at`) | RF-34–36, RF-47 |
| `alert_acknowledgements` | Confirmación por rol | RF-39, RF-42 |
| `alert_escalations` | Escalamiento a otro rol | RF-40, RF-41, RF-43 |
| `alert_events` | Bitácora append-only del evento (RNF-07) | RF-44–47 |
| `monitoring_schedules` | Próximo control / frecuencia | RF-27, RF-37 |

---

## Módulo 4 — Alta y egreso (RF-48–61)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `discharge_orders` | Orden de alta | RF-48 |
| `epicrisis_documents` | Epicrisis | RF-49 |
| `ambulatory_prescriptions` | Recetas ambulatorias | RF-50 |
| `social_assessments` | Valoración social | RF-51–52 |
| `pharma_discharge_reconciliations` | Conciliación al alta | RF-53–54 |
| `nursing_discharge_reports` | Informe de alta de enfermería | RF-55 |
| `discharge_indication_receipts` | Recepción de indicaciones | RF-56 |
| `account_verifications` | Estado de cuenta | RF-57 |
| `exit_passes` | Pase de salida | RF-58–59 |
| `patient_exits` | Salida efectiva | RF-60–61 |

---

## Módulo 5 — Camas (RF-62–72)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `wards` | Servicios / unidades | RF-63 |
| `beds` | Lecho (`available`\|`occupied`\|`cleaning`\|`blocked`) | RF-63, RF-66–69 |
| `bed_requests` | Solicitud priorizada | RF-62, RF-64 |
| `bed_assignments` | Asignación / liberación | RF-07, RF-66 |
| `cleaning_orders` | Limpieza (`standard`\|`deep`) | RF-68–69 |
| `bed_readiness_checks` | Ropa / insumos listos | RF-70 |
| `discharge_projections` | Alta proyectada | RF-65 |

---

## Módulo 6 — Personal (RF-73–82)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `staff_shift_plans` | Plan mensual (`year_month` YYYY-MM) | RF-73–74 |
| `staff_shifts` | Turnos individuales | RF-73–75 |
| `daily_patient_assignments` | Asignación paciente–enfermera del día | RF-76 |
| `handovers` | Entrega de turno | RF-77 |
| `staff_absences` | Ausencias | RF-78–79 |
| `coverage_requests` | Cobertura / retén | RF-80–81 |
| `retainer_confirmations` | Confirmación de retén | RF-82 |

---

## Diagrama lógico (resumen ER)

```
users ──┬── prescriptions / medical_evolution_notes / … (autorías)
        ├── staff_shifts / daily_patient_assignments / handovers
        └── alert_acknowledgements

patients ── patient_contacts
         └── patient_allergies

admission_encounters.encounter_id  (lógico)
        │
        ├── coverage_referrals, informed_consents, wristband_events
        ├── nursing_assessments, vital_sign_readings, …
        ├── lab_results, prescriptions, medication_administrations, …
        ├── clinical_alerts ── acknowledgements / escalations
        ├── discharge_orders, epicrisis_documents, …, patient_exits
        └── bed_assignments, bed_requests, discharge_projections

wards ── beds ── bed_assignments / cleaning_orders / bed_readiness_checks
```

## Migraciones

Prefijo `2026_09_20_100*` bajo `services/backend/database/migrations/`. Seed de catálogo: `CatalogSeeder` (wards + camas de ejemplo), invocado desde `DatabaseSeeder` sin borrar datos demo de admisión.

## Modelos Eloquent principales

`Patient`, `Ward`, `Bed`, `ClinicalAlert`, `Prescription`, `DischargeOrder` (+ satélites delgados para relaciones).
