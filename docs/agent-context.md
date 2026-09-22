# Contexto de agentes (iteraciones)

Archivo propio para anotaciones de agentes. **No sustituye** [AGENTS.md](../AGENTS.md); solo evita reeditar el cuerpo fijo de ese archivo.

## 2026-09-19 — bugfix/RF-02-stepper-nav-y-validaciones

Base local usada: `feature/RF-07-celador-flujo-persistencia` (porque `origin/dev` aún no tiene el módulo 1 completo).

Cambios clave:

1. Eliminado `RoleStepLinks` (pills duplicados bajo el título del formulario).
2. `AdmissionStepper` navegable con rol via `canViewRoleStep`.
3. Formularios centrados en `clinical.css`.
4. Validaciones en `shared/validation/inputRules.ts` (DNI/teléfono numéricos; opcionales explícitos).

Al retomar: leer este archivo + sección final de anotaciones en `AGENTS.md`.

## 2026-09-20 — Censo: ancho, búsqueda y paginación + esquema RF-01–RF-91

### Parte A (UI/API censo)
- Formularios más anchos en viewports grandes (`clinical.css` media queries; censo usa `Sheet wide`).
- Censo: buscador (`q`) + paginación 10 (`page`, `per_page`) en `AdmissionBoard::list` y `CensusPage`.
- Meta de respuesta: `{ total, page, perPage, lastPage }`.

### Parte B (BD)
- Documentación: `docs/architecture/modelo-datos.md` (dominios ↔ RF, convención `encounter_id` string sin FK).
- Migraciones `2026_09_20_100*` en backend: pacientes, artefactos clínicos M1–M6, camas, personal; `users.is_active` / `deactivated_at`.
- No se altera la estructura de `admission_encounters`; tablas nuevas van en paralelo.
- `CatalogSeeder` (wards + camas) desde `DatabaseSeeder`; no limpia demo de admisión.
- Prueba: `tests/Feature/SchemaCoverageTest.php`.

Para aplicar esquema en entorno local (cuando el usuario lo autorice): `php artisan migrate` (evitar `migrate:fresh` si hay datos a conservar).

## 2026-09-20 — RF-92 camillero + escáner de brazalete

Base: `feature/RF-92-camillero-brazalete-censo` (desde `bugfix/RF-02-shared-ui-spacing`).

- Rol técnico `celador` → `camillero`; cuenta demo `camillero@vitalsy.local`. Etiqueta UI y docs de actor: **Celador / Camillero**.
- RF-08: al escanear en verificación de identidad se valida y avanza sin segundo clic.
- RF-92: escáner en censo (`/pacientes`) para todos los roles; `q` incluye `wristband_code`.
- `BarcodeScanner` movido a `shared/ui/BarcodeScanner.tsx`.

## 2026-09-21 — Módulo 2: roles clínicos separados

Rama: `feature/RF-17-modulo-2-atencion-seguimiento` (desde `origin/dev` actualizado).

- Roles: `enfermera_piso`, `auxiliar_enfermeria`, `medico_residente`, `medico_tratante` (sin claves genéricas `enfermeria`/`medico`). Catálogo en `requerimientos.md`.
- UX Módulo 2 orientativa: censo + chart (Opción A), no stepper de admisión.

## 2026-09-21 — RF-17 integración LIS

- `LisClient`/`StubLisClient`, `LabResultsIntegrator`, API `inpatient-care/.../lab-results`, UI `/atencion/laboratorio`.
- Guía: `docs/architecture/modulo-2-atencion.md`.
- Siguiente: RF-18 (PACS) por el mismo patrón.
