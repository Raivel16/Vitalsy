# API Módulo 2 — Yaak

Colección Postman v2.1 importable en Yaak: [`yaak-modulo-2.postman_collection.json`](./yaak-modulo-2.postman_collection.json).

## Importar en Yaak

1. Yaak → **Settings → Import/Export → Import**.
2. Elija `docs/api/yaak-modulo-2.postman_collection.json`.
3. Ajuste variables: `baseUrl` (`http://localhost:8080` o `https://localhost:8443`), `encounterId`, `email`, `password`.

## Auth (Sanctum cookies)

1. Ejecute **CSRF cookie** (`GET /sanctum/csrf-cookie`).
2. Copie el valor de la cookie `XSRF-TOKEN` (URL-decoded) a la variable `xsrfToken`.
3. Ejecute **Login** con un rol clínico (`medico_residente@vitalsy.local`) y la contraseña definida en `DEMO_PASSWORD`.
4. Conserve cookies de sesión en las peticiones siguientes (Yaak lo hace si el cookie jar está activo).

## Cobertura actual

| RF | Peticiones |
|---|---|
| RF-21 | `POST/GET .../lab-results[/sync]` |
| RF-22 | `POST/GET .../imaging-reports[/sync]` |
| RF-23 | `GET .../clinical-visit` |
| RF-24 | `GET/POST .../medical-evolution-notes` |

`encounterId` debe existir en `admission_encounters` (p. ej. un ingreso demo o uno creado en pruebas).
