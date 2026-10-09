# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Vitalsy es un monorepo hospitalario (documentación y UI en español): ingreso, atención, alertas, alta, camas y personal, más una app móvil ciudadana. La documentación del proyecto es la fuente de verdad; no inventar requisitos.

| Carpeta | Contenido |
|---|---|
| `frontend/web/` | React 19 + Vite + TypeScript (Vitest + Testing Library) |
| `backend/api/` | Laravel (PHP 8.2), API en `/api/v1`, auth con Sanctum |
| `services/movil/` | Vitalsy Life, Expo/React Native (tiene su propio `AGENTS.md`; leerlo antes de tocar APIs de Expo) |
| `docs/` | `requirements/requerimientos.md` (RF-XX/RNF-XX), `architecture/` (reglas + un doc por módulo), `agent-context.md` |
| `docker/`, `docker-compose*.yml` | Nginx + frontend + backend + PostgreSQL |

## Proceso obligatorio (de AGENTS.md / CONTRIBUTING.md)

- **Plan primero:** antes de escribir o editar código, presentar un plan (alcance, pruebas, archivos, riesgo) y esperar la aprobación explícita del usuario. Sin aprobación no se edita nada funcional.
- **TDD** en backend y frontend: prueba primero, verla fallar, implementación mínima, pruebas en verde antes de cerrar.
- Consultar `docs/requirements/requerimientos.md` y `docs/architecture/reglas.md` antes de funcionalidad nueva; actualizar `docs/` si cambia arquitectura o requisitos.
- Toda pantalla/formulario del frontend necesita validación previa al envío y feedback visual de éxito/error.
- **Ramas:** `feature/RF-XX-descripcion`, `bugfix/RF-XX-...`, `hotfix/RF-XX-...` desde `dev`; PR hacia `dev`; `dev` → `main` para producción. (Nota de AGENTS.md: `origin/dev` puede ir atrasado; si hace falta ramificar desde otra feature, documentarlo en el plan.)
- **Commits:** Conventional Commits `tipo(alcance): RF-XX descripción` (tipos `feat|fix|test|docs|refactor|chore`, imperativo, minúsculas, sin punto final), atómicos.
- Al terminar una iteración relevante, anexar una nota al final de `AGENTS.md` (solo se agrega, no se reescribe lo previo) o a `docs/agent-context.md`.

## Comandos

Desarrollo completo (Nginx en http://localhost:8080, API bajo `/api`, Postgres en 5432; el puerto 80 queda para XAMPP). Requiere `.env` (ver `.env.example`; `APP_KEY`, `DB_PASSWORD`, `DEMO_PASSWORD`):

```bash
docker compose up --build
```

Frontend (`frontend/web`):

```bash
npm run dev
npm test                          # vitest run con cobertura (lo que corre CI)
npx vitest run src/app/roles.test.ts            # un archivo
npx vitest run -t "nombre del caso"             # un caso por nombre
npm run lint
npm run build                     # tsc -b && vite build
```

Backend (`backend/api`):

```bash
php artisan test                                 # usa sqlite (database/testing.sqlite)
php artisan test --filter=SchemaCoverageTest     # una clase/método
./vendor/bin/pint --test                         # estilo (CI lo exige); sin --test aplica el fix
composer test:coverage                           # genera coverage.xml (requiere PCOV/Xdebug)
php artisan alerts:process-slas                  # SLA de alertas y recordatorios de cumplimiento
```

Móvil (`services/movil`): `npm test` (jest), `npm run typecheck`, `npx expo lint`.

Validación local completa antes de push: `scripts/pre-push.sh`. CI (`.github/workflows/ci.yml`): tests + build del frontend, tests + `pint --test` del backend.

## Arquitectura

**Frontend — Screaming Architecture.** `src/modules/<dominio>/` (admission, admission-census, cpoe, e-mar, vital-monitoring, clinical-alerts, discharge, bed-management, staff-roster, patient-chart, …) con `pages/`, `components/`, `domain/` y el test junto al módulo. Lo transversal vive en `src/app/` (shell, `api.ts`, `AuthProvider`, `navigation.tsx`, `roles.ts`, timer de inactividad) y `src/shared/` (`ui/`, `validation/inputRules.ts`, `print/`, `audio/`, `datetime/`). Reutilizar `shared/ui` (`Button`, `Sheet`, `StatusStamp`, `FormActions`, `EmptyEncounter`, `BarcodeScanner`) y las reglas de `inputRules` (documento/teléfono solo dígitos, filtrados en `onChange`) en lugar de duplicar.

**Roles en dos lugares que deben coincidir.** El catálogo vive en `backend/api/app/Support/RoleCatalog.php` y en `frontend/web/src/app/roles.ts` (14 roles: admision, camillero, enfermera_piso, auxiliar_enfermeria, medico_residente, medico_tratante, enfermera_supervisora, equipo_respuesta_rapida, trabajo_social, altas_caja, gestion_camas, servicios_generales, jefatura_enfermeria, recursos_humanos). Cuentas demo: `{rol}@vitalsy.local` con `DEMO_PASSWORD`. Las rutas del backend se protegen con middleware `role:<rol>`; la visibilidad de pantallas se gobierna en `navigation.tsx` y `roles.ts`. Añadir un rol o ruta implica tocar ambos lados y sus tests.

**Backend.** `routes/api.php` (prefijo `v1`, `auth:sanctum`, grupos por rol) → controladores en `app/Http/Controllers/Api/` → lógica en `app/Services/<Dominio>/` (Admission, InpatientCare, ClinicalAlerts, Discharge, BedManagement, Staff, Clinical = escalas NEWS2/Braden/Morse, Interoperability = clientes LIS/PACS con `Stub*` FHIR). Reglas de negocio violadas lanzan `ClinicalRuleException`. Eventos: `PatientExited` → `DispatchCleaningOnPatientExit` (libera cama y crea orden de limpieza).

**Modelo de datos.** `admission_encounters` es el eje del ingreso; las tablas clínicas posteriores referencian el ingreso con `encounter_id` string indexado **sin FK**. Detalle por dominio↔RF en `docs/architecture/modelo-datos.md`. `CatalogSeeder` siembra wards y camas. Evitar `migrate:fresh` si hay datos a conservar.

**Flujo de procesos.** Seis procesos (docs `modulo-1…6`, `modulo-7` = móvil): M1 admisión con stepper lineal por rol (`AdmissionStepper`, `canViewRoleStep`; avance vía `POST encounters/{id}/advance`); M2 atención (`/atencion/*`, censo + expediente `/atencion/chart`, sin stepper); M3 alertas (`/alertas`, SLA, timeline inmutable, sirena que solo para al confirmar lectura); M4 egreso (`/egreso`, gates de secuencia; la salida efectiva solo la registra `enfermera_piso`); M5 camas/limpieza (`/camas`); M6 personal (`/personal`, balanceo NEWS2, handover). Consultar el doc del módulo correspondiente antes de modificar su flujo.

**UI.** Pantallas de procesos 2–6 usan el look «Pizarra»: `clinic` + clase `floor-care` (+ `ops-board` en egreso/camas/personal). `CaseBar` compacto solo en `/atencion` y `/alertas`; el stepper de admisión se oculta en `/atencion/*` e ingresos cerrados. Estilos en `src/styles/` (`clinical.css`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
