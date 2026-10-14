# Modelo de datos Vitalsy

Esquema PostgreSQL/Laravel para RF-01–RF-104 (módulos 1–6 + acceso). Complementa —no reemplaza— `admission_encounters` (flujo de admisión ya en producción de desarrollo).

## Convención de `encounter_id`

Las tablas clínicas usan `encounter_id` como **string indexado**, alineado con `admission_encounters.encounter_id`.

**No hay FK** hacia `admission_encounters` para evitar acoplamiento de orden de migraciones y claves string. La integridad se garantiza en capa de aplicación.

Los catálogos y entidades propias (pacientes, camas, alertas hijas, ítems de receta, etc.) sí usan `foreignId()->constrained()` con `cascadeOnDelete` / `nullOnDelete` según el padre.

Estados y acciones (`status`, `action`, `protocol`) se modelan como `string`, no ENUM de MySQL, por compatibilidad PostgreSQL/SQLite.

---

## Dominio: Identidad y acceso (RF-02, RF-99–104)

| Tabla | Rol | RF |
|-------|-----|----|
| `patients` | Identidad canónica (documento único por tipo+número) | RF-02, RF-99+ |
| `patient_contacts` | Familiar / contacto | RF-02, RF-03 |
| `patient_allergies` | Alergias del paciente (`is_optional` para marcar registro opcional) | RF-11, RF-13 |
| `users` (+ `is_active`, `deactivated_at`, `must_change_password`) | Cuentas y baja lógica | RF-99–104 |
| `access_audit_logs` | Auditoría de alta, edición y desactivación de cuentas (actor, objetivo, acción, detalle) | RF-102–104 |
| `admission_encounters` *(existente)* | Caso de ingreso en curso / demo | RF-01–20 |

---

## Módulo 1 — Admisión y recepción (RF-01–20)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `coverage_referrals` | Derivación cobertura / caja / trabajo social | RF-03 |
| `informed_consents` | Consentimiento informado firmado | RF-06 |
| `wristband_events` | Emisión/verificación de brazalete (`issued`\|`verified`) | RF-04, RF-08 |
| `nursing_assessments` | Valoración inicial (motivo, historia, alergias JSON) | RF-11 |
| `vital_sign_readings` | Constantes (`sbp` + `dbp`) + NEWS2 opcional | RF-12, RF-26–29 |
| `medication_reconciliations` | BPMH ingreso | RF-13 |
| `risk_assessments` | Morse / Braden | RF-14 |

El Kardex y la ficha digital siguen apoyados en `admission_encounters.clinical_payload` / `deliverables` hasta migrar lógica.

---

## Módulo 2 — Atención y seguimiento (RF-21–38)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `lab_results` | Integración LIS | RF-21, RF-23 |
| `imaging_reports` | Integración PACS | RF-22, RF-23 |
| `medical_evolution_notes` | Evolución médica | RF-24 |
| `prescriptions` / `prescription_items` | CPOE | RF-25, RF-16 |
| `medication_administrations` | e-MAR (horario, firma, barcode) | RF-32–35 |
| `nursing_evolution_notes` | Evolución de enfermería | RF-36 |
| `care_activity_completions` | Cuidados básicos finalizados | RF-37 |

---

## Módulo 3 — Alertas clínicas (RF-39–53)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `clinical_alerts` | Alerta con enrutamiento y plazos (`assigned_role`, `acknowledge_due_at`, `medical_due_at`, `closed_at`) | RF-39–52 |
| `alert_acknowledgements` | Confirmación por rol | RF-44, RF-47 |
| `alert_escalations` | Escalamiento a otro rol | RF-45, RF-46, RF-48 |
| `alert_events` | Bitácora append-only del evento (RNF-07) | RF-49–52 |
| `monitoring_schedules` | Próximo control / frecuencia | RF-31, RF-42 |

---

## Módulo 4 — Alta y egreso (RF-54–67)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `discharge_orders` | Orden de alta | RF-54 |
| `epicrisis_documents` | Epicrisis | RF-55 |
| `ambulatory_prescriptions` | Recetas ambulatorias | RF-56 |
| `social_assessments` | Valoración social | RF-57–58 |
| `pharma_discharge_reconciliations` | Conciliación al alta | RF-59–60 |
| `nursing_discharge_reports` | Informe de alta de enfermería | RF-61 |
| `discharge_indication_receipts` | Recepción de indicaciones | RF-62 |
| `account_verifications` | Estado de cuenta | RF-63 |
| `exit_passes` | Pase de salida | RF-64–65 |
| `patient_exits` | Salida efectiva | RF-66–67 |

---

## Módulo 5 — Camas (RF-68–77)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `wards` | Servicios / unidades | RF-69 |
| `beds` | Lecho (`available`\|`occupied`\|`cleaning`\|`blocked`) | RF-69, RF-72–73 |
| `bed_requests` | Solicitud priorizada | RF-68, RF-70 |
| `bed_assignments` | Asignación / liberación | RF-07, RF-73 |
| `cleaning_orders` | Limpieza (`standard`\|`deep`) | RF-74–75 |
| `bed_readiness_checks` | Ropa / insumos listos | RF-76 |
| `discharge_projections` | Alta proyectada | RF-71 |

---

## Módulo 6 — Personal (RF-78–88)

| Tabla | Contenido | RF |
|-------|-----------|----|
| `staff_shift_plans` | Plan mensual (`year_month` YYYY-MM) | RF-78–80 |
| `staff_shifts` | Turnos individuales | RF-78–80 |
| `daily_patient_assignments` | Asignación paciente–enfermera del día | RF-80 |
| `handovers` | Entrega de turno | RF-81–83 |
| `staff_absences` | Ausencias | RF-84–85 |
| `coverage_requests` | Cobertura / retén | RF-85–87 |
| `retainer_confirmations` | Confirmación de retén | RF-88 |

---

## Integración Vitalsy Life (RF-89–98)

Contrato en [contrato-clinical-life.md](contrato-clinical-life.md). `life_accounts` es una identidad ciudadana separada de `users` (sin `role`). `encounter_id` sigue la convención sin FK.

| Tabla | Contenido | RF |
|-------|-----------|----|
| `life_accounts` | Cuenta ciudadana: `name`, `email` único, `password` (hash) | RF-89 |
| `life_biometric_samples` | Lecturas sincronizadas: `life_account_id` (FK, cascade), `client_id` (64), `kind` (24), `value` decimal(8,2), `unit` (16), `started_at`, `ended_at`, `origin` (24); único `(life_account_id, client_id)` | RF-89, RF-92 |
| `life_consents` | Consentimiento de compartición: `life_account_id` único (FK, cascade), `sharing_enabled` (default false), `revoked_at` null | RF-93 |
| `life_link_codes` | Código de vinculación: `life_account_id` (FK, cascade), `code` (16) único, `expires_at`, `consumed_at` null, `consumed_encounter_id` indexado null | RF-94 |
| `life_baseline_imports` | Línea de base importada: `encounter_id` indexado, `life_account_id` (FK), `baseline` json, `imported_by` (FK `users`, nullOnDelete), `imported_at` | RF-95 |
| `life_discharge_plans` | Plan de alta: `encounter_id` único, `mode` (16), `code` (20) único null, `invitation_code` (20) único null, `payload` json, `valid_until` date, `status` (16, default `pendiente`: pendiente / activo / reclamado), `claimed_by_account_id` (FK `life_accounts`, nullOnDelete), `claimed_at`, `custody_transferred_at`, `created_by` (FK `users`, nullOnDelete) | RF-96–98 |

Migraciones: `2026_10_12_100000_create_life_tables.php`, `2026_10_13_100000_unique_life_baseline_import_per_encounter.php` (una importación por ingreso) y `2026_10_14_100000_widen_clinical_columns_for_encryption.php` (campos cifrados en reposo).

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

Prefijo `2026_09_20_100*` bajo `backend/api/database/migrations/`. Seed de catálogo: `CatalogSeeder` (wards + camas de ejemplo), invocado desde `DatabaseSeeder` sin borrar datos demo de admisión.

## Modelos Eloquent principales

`Patient`, `Ward`, `Bed`, `ClinicalAlert`, `Prescription`, `DischargeOrder` (+ satélites delgados para relaciones).
