# Operación

| Requisito | Artefacto | Estado de verificación |
|---|---|---|
| RNF-02 | `backend/api/tests/Feature/Nfr/Rnf02TimingTest.php` | Automatizada (CI) |
| RNF-03 | Guion k6 local (no versionado), [pruebas-de-carga.md](pruebas-de-carga.md) | Escrito; sin corrida real |
| RNF-04 | Guion k6 local (no versionado), [pruebas-de-carga.md](pruebas-de-carga.md) | Escrito; sin corrida real |
| RNF-11 | `GET /api/health`, healthchecks y `restart` en `docker-compose.prod.yml`, [disponibilidad.md](disponibilidad.md) | Sonda con test; 99.9 % requiere medición anual |
| RNF-13 | [recuperacion-ante-desastres.md](recuperacion-ante-desastres.md) (respaldo manual con `pg_dump`) | Sin respaldo automático en la demo de AWS; RTO estimado |
| RNF-18 | `frontend/web/playwright.config.ts`, `frontend/web/e2e/`, `.github/workflows/browser-matrix.yml` | Matriz definida; requiere variable `E2E_BASE_URL`; el job instala `@playwright/test` con `--no-save`; sin ejecutar localmente |
| RF-114 / Proceso 3 | `frontend/web/cypress/`, [pruebas-cypress-alertas.md](pruebas-cypress-alertas.md) | Cypress local contra :8080; última corrida 12/12 aprobadas |
