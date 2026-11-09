# Pruebas Cypress del módulo de monitoreo y alertas (Proceso 3)

Suite E2E con Cypress 16.2 (`frontend/web/cypress/`), versionada en git. Corre en local contra el stack Docker de desarrollo (`http://localhost:8080`) con datos reales; no se ejecuta en CI (el workflow instala con `npm ci --ignore-scripts` y no descarga el binario de Cypress).

## Escenarios

| ID | Archivo | Qué comprueba | RF |
|---|---|---|---|
| CY-M3-01 | `cy-m3-01-acceso.cy.ts` | Acceso y autenticación del personal que recibe alertas | Roles / Sanctum |
| CY-M3-02 | `cy-m3-02-monitoreo-genera-alerta.cy.ts` | Registro de constantes que genera una alerta automática por NEWS2 | RF-30, RF-39 |
| CY-M3-03 | `cy-m3-03-validacion-deterioro.cy.ts` | Validación del formulario de deterioro observado y registro de la alerta | RF-40 |
| CY-M3-04 | `cy-m3-04-acuse-alerta.cy.ts` | La enfermera confirma la recepción y cambia el estado de la alerta | RF-44, RF-52, RF-53 |
| CY-M3-05 | `cy-m3-05-atencion-medica.cy.ts` | Solicitud de atención médica y recepción en la bandeja del residente | RF-43, RF-46 |
| CY-M3-06 | `cy-m3-06-permisos-navegacion.cy.ts` | Navegación entre módulos y control de acceso por rol a alertas y reportes | RF-114 |
| CY-M3-07 | `cy-m3-07-reportes.cy.ts` | Reporte RF-114: filtros validados e indicadores calculados con registros reales | RF-114 |

Evidencia de la última corrida (12/12 pruebas aprobadas): `docs/practica-individual-arq-raivel/evidencias/cypress/`.

## Ejecución (en `frontend/web`)

1. Levantar el stack: `docker compose up --build` en la raíz (requiere `.env` con `DEMO_PASSWORD`).
2. Contraseña demo: la configuración la lee de `CYPRESS_DEMO_PASSWORD` o, si falta, del `.env` de la raíz.
3. Desde VS Code, quitar la variable que hereda la terminal; si no, el binario falla con `bad option --smoke-test`:

   ```bash
   unset ELECTRON_RUN_AS_NODE
   npm run cy:run        # headless, junit en cypress/results y video en cypress/videos
   npm run cy:open       # modo interactivo
   npm run cy:typecheck  # tipos de specs y soporte
   ```

4. `CYPRESS_BASE_URL` cambia el destino (por defecto `http://localhost:8080`).

## Notas de operación

- **Un paciente por corrida.** Las tareas de Node (`cypress/support/vitalsy/tasks.ts`) hospitalizan un único paciente por corrida y lo comparten entre specs: cada ingreso ocupa una cama y el entorno de desarrollo no da de alta. Si no hay camas libres compatibles, liberar camas o recrear la base de desarrollo.
- **Throttle de login (10/min por IP).** Las sesiones se cachean con `cy.session` y la API reintenta tras un 429 esperando 61 s.
- **Viewport 1920×1080.** A 1366 px los avisos (RF-53) tapan parte de los formularios; hallazgo de usabilidad documentado en el informe de la práctica.
- **Cobertura.** `cypress.config.ts` y `cypress/support/` tienen pruebas Vitest (`support.test.ts` con dobles de `Cypress`/`cy`, y `vitalsy/vitalsy.test.ts`) y entran en la cobertura del frontend, así la suite no baja la cobertura que mide SonarQube; los specs `.cy.ts` solo se ejecutan con Cypress.
- La suite Playwright (`frontend/web/e2e/`, ver [pruebas-e2e.md](pruebas-e2e.md)) sigue fuera del repositorio; esta suite Cypress es independiente.
