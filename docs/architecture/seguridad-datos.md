# Seguridad de datos: cifrado en reposo e inmutabilidad (RNF-06, RNF-07)

## 1. Cifrado en reposo (RNF-06)

**Mecanismo.** Cifrador de Laravel (`Crypt`) con `config('app.cipher') = AES-256-CBC` (AES-256 + MAC HMAC-SHA256) y clave `APP_KEY`. Se aplica con tres casts propios (`App\Casts\EncryptedText`, `EncryptedArray`, `EncryptedFloat`) en lugar de los `encrypted*` nativos porque **toleran valores legados en claro**: durante el despliegue, entre la migración y el respaldo, las lecturas no fallan. La escritura siempre cifra. Registro único de columnas: `App\Support\Security\EncryptedColumns`.

**Alcance honesto.** RNF-06 se cumple para los *campos de información clínica sensible* (texto libre, resultados, cargas JSON, planes, valores biométricos). Las columnas de **búsqueda, unión, orden o estado** permanecen en claro porque una columna cifrada no se puede consultar (`WHERE`/`LIKE`/`ORDER`/`UNIQUE`/índice). No se afirma AES-256 sobre ellas; el control complementario es el cifrado a nivel de volumen/BD (p. ej. cifrado de disco o TDE de PostgreSQL) y el control de acceso por rol.

### Inventario

| Tabla | Columna | Sensibilidad | Consultada en SQL | Decisión |
|---|---|---|---|---|
| admission_encounters | clinical_payload (JSON) | Alta: anamnesis, reconciliación, plan | No (solo lectura en PHP; sin `->` JSON path) | **Cifrar** (array) |
| admission_encounters | patient_name | Media (identidad) | Sí: `LOWER(patient_name) LIKE` en censo | Claro (búsqueda) |
| admission_encounters | document_type/number | Media (identidad) | Sí: búsqueda `q` | Claro (búsqueda) |
| admission_encounters | encounter_id, order_number, wristband_code, record_id, current_step, room, bed, service, coverage_* | Baja/operativa | Sí: llaves, joins, filtros | Claro |
| admission_encounters | deliverables (JSON) | Baja: banderas de entregables | No | Claro (estado del flujo, sin texto clínico) |
| nursing_evolution_notes | body | Alta | No | **Cifrar** |
| medical_evolution_notes | body | Alta | No | **Cifrar** |
| patient_allergies | substance, notes | Alta | No | **Cifrar** |
| epicrisis_documents | diagnoses, procedures, evolution | Alta | No | **Cifrar** |
| social_assessments | report | Alta | No | **Cifrar** |
| ambulatory_prescriptions | content (JSON) | Alta | No | **Cifrar** (array) |
| prescription_items | drug_name, dose, route, frequency | Alta | No (frecuencia se interpreta en PHP) | **Cifrar** |
| nursing_discharge_reports | instructions, alarm_signs, home_care | Alta | No | **Cifrar** |
| pharma_discharge_reconciliations | notes | Alta | No | **Cifrar** |
| lab_results / imaging_reports | summary, payload | Alta | No | **Cifrar** |
| clinical_alerts | message, closure_note | Media/alta (texto clínico) | No (`compliance_key`, `status`, fechas sí) | **Cifrar** |
| handovers | payload (JSON) | Alta | No | **Cifrar** (array) |
| life_biometric_samples | value | Alta (biométrico) | No (la línea base se calcula en PHP; filtros por `kind`, `started_at`) | **Cifrar** (float) |
| life_baseline_imports | baseline (JSON) | Alta | No | **Cifrar** (array) |
| life_discharge_plans | payload (JSON) | Alta | No (`code`, `status`, `valid_until` sí) | **Cifrar** (array) |
| vital_sign_readings | rr, spo2, sbp, dbp, pulse, temperature, news2_total | Alta | Sí: orden, agregados y umbrales NEWS2 | Claro; cubierto por control de volumen |
| alert_events | detail | Media (metadatos de flujo) | No | Claro: la tabla es inmutable por trigger y el respaldo no podría reescribirla; contiene metadatos de flujo |
| alert_escalations | reason | Baja (motivo de SLA) | No | Claro (misma razón; inmutable) |
| patients / patient_contacts | full_name, document_*, birth_date, phone | Media (identidad) | Sí: búsqueda y unicidad `(document_type, document_number)` | Claro |
| users, life_accounts | name, email, password | Credenciales/identidad | Sí: login, unicidad | Claro (password con bcrypt, tokens hash) |
| tablas sin modelo (nursing_assessments, medication_reconciliations, informed_consents, risk_assessments, wristband_events, coverage_referrals) | varios | — | — | Sin uso por la aplicación hoy; si se activan, deben registrarse en `EncryptedColumns` |

Las columnas JSON/`string` cifradas pasaron a `text` (migración `2026_10_14_100000_widen_clinical_columns_for_encryption`, conserva nulabilidad y datos, irreversible a propósito: volver a `string`/`json` truncaría o rechazaría el cifrado).

### Respaldo de datos existentes

```bash
php artisan vitalsy:encrypt-existing --dry-run   # informa cuántos valores se cifrarían, no escribe
php artisan vitalsy:encrypt-existing --chunk=500 # cifra por bloques, una transacción por bloque
```

- Idempotente: un valor que ya descifra con `APP_KEY`/`APP_PREVIOUS_KEYS` no se vuelve a cifrar; es seguro repetirlo.
- Se niega a correr con `APP_KEY` vacía.
- Orden de despliegue: migrar → desplegar código → `--dry-run` → respaldar → ejecutar → repetir (debe informar 0). **Probar primero en una copia de la BD** (riesgo alto: pérdida de `APP_KEY` implica pérdida irrecuperable de los datos cifrados).

### Rotación de clave

1. Generar nueva clave (`php artisan key:generate --show`).
2. Poner la nueva en `APP_KEY` y la anterior en `APP_PREVIOUS_KEYS` (lista separada por comas). Laravel descifra con ambas y cifra con la actual.
3. Ejecutar `vitalsy:encrypt-existing` **no re-cifra** valores ya válidos con una clave previa; para rotar de verdad, re-guardar los registros (o ampliar el comando con `--rotate`, pendiente). Mantener la clave previa en `APP_PREVIOUS_KEYS` hasta completar la re-escritura.
4. Respaldar `APP_KEY` en un gestor de secretos distinto del respaldo de la BD.

## 2. Inmutabilidad de trazabilidad (RNF-07)

Dos capas: (a) trait `App\Models\Concerns\Immutable` (eventos `updating`/`deleting` y builder que bloquea `query()->update()/delete()/upsert/increment`) lanza `ImmutableRecordException`; (b) triggers de BD (migración `2026_10_14_100100_add_traceability_immutability_triggers`, SQLite y PostgreSQL) que rechazan `UPDATE`/`DELETE` incluso por SQL crudo.

| Modelo / tabla | Regla |
|---|---|
| AlertEvent (`alert_events`) | Congelado desde su creación (historial append-only). |
| AlertAcknowledgement (`alert_acknowledgements`) | Congelado desde su creación (acuse de recibo). |
| AlertEscalation (`alert_escalations`) | Congelado desde su creación (evidencia de SLA vencido). |
| DischargeIndicationReceipt | Congelado desde su creación (acuse del paciente/familiar). Un reenvío idéntico es idempotente; uno con contenido distinto responde 422 «La recepción de indicaciones ya fue registrada y no puede modificarse.». |
| MedicalEvolutionNote | Editable mientras `signed_at` es nulo; congelada desde que se firma. |
| Handover (entrega de turno) | Editable mientras `signed_at` es nulo; congelada desde que se firma (hoy se crea ya firmada). |
| MedicationAdministration | Editable mientras `status` ≠ `administrado` (pendiente → administrado, pendiente → cancelado, intento fallido de código de barras). Una vez `administrado` (firma digital de la dosis) queda congelada; solo se permite la cancelación masiva de dosis pendientes. |

Excepción referencial: las FK de usuario/ítem (`user_id`, `nurse_user_id`, `prescription_item_id`) solo pueden pasar a `NULL` cuando la fila referenciada **ya no existe** (efecto de `nullOnDelete`); anular el autor de un registro cuyo usuario existe se rechaza en el modelo y en el trigger (migración `2026_10_14_110000_refine_traceability_triggers`). Eliminar un usuario con entregas firmadas (`handovers` usa `cascadeOnDelete`) queda bloqueado por el trigger: los usuarios se desactivan, no se eliminan.

**Sin protección (decisión explícita):** `Prescription` / `PrescriptionItem` (el flujo CPOE vigente permite modificar ítems de una prescripción ya firmada; congelarla rompería ese flujo. Seguimiento recomendado: versionado de cambios de prescripción, una fila nueva por modificación), `ClinicalAlert` (cambia de estado legítimamente; su trazabilidad vive en `alert_events`, `alert_acknowledgements` y `alert_escalations`), `monitoring_schedules` (el `next_due_at` se reprograma al cumplirse un control; los incumplimientos quedan en los eventos inmutables), `ExitPass`, `PatientExit`, `AccountVerification`, `LifeBaselineImport` (inmutable por convención; candidato a futuro).

**No existe ninguna ruta HTTP** de `PUT/PATCH/DELETE` sobre estos recursos (verificado por escaneo de `Route::getRoutes()` en `TraceabilityImmutabilityTest`), por lo que ningún rol, incluido `administrador_accesos`, puede alterarlos por la API.

## 3. Riesgos residuales

- Los triggers copian la lista de columnas al momento de la migración: una columna nueva en estas tablas exige una migración nueva que los recree.
- Lectura con clave incorrecta: un valor con forma de payload cifrado que no descifra lanza `UndecryptableFieldException` (no se trata como vacío); `vitalsy:encrypt-existing` no los toca, los informa y termina con error («posible APP_KEY incorrecta»).
- Un superusuario de BD puede desactivar o eliminar los triggers y alterar filas; los triggers elevan el costo, no lo eliminan. Mitigar con roles de BD sin `ALTER`/`TRIGGER` para la aplicación y auditoría de DDL.
- No hay encadenamiento por hash (hash-chaining) de los registros: no se detecta una alteración hecha por un superusuario. Pendiente si se requiere evidencia forense.
- En SQLite, un `ALTER` futuro con `->change()` reconstruye la tabla y **elimina los triggers**: toda migración que cambie estas tablas debe recrearlos.
- Quien posea `APP_KEY` y acceso a la BD puede descifrar; la clave debe vivir fuera del repositorio y del respaldo de BD.
- Las columnas en claro (identidad, signos vitales, llaves) dependen del cifrado de volumen para protección en reposo.
- Los triggers de PostgreSQL y la conversión `json → text` en PostgreSQL no se ejercitaron en las pruebas automáticas (CI usa SQLite); probar en copia de BD.
