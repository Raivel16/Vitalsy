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

## Administración de usuarios (RF-101–104)

Rol `administrador_accesos`. Una cuenta desactivada no inicia sesión y pierde sus sesiones activas.

| RF | Petición |
|---|---|
| RF-101 | `GET /api/v1/users?search=&status=active\|inactive` |
| RF-102 | `POST /api/v1/users` → `{ user, temporaryPassword }` (se muestra una sola vez) |
| RF-103 | `PATCH /api/v1/users/{id}` (no permite cambiar el rol propio ni dejar al sistema sin administrador activo) |
| RF-104 | `POST /api/v1/users/{id}/deactivate` (no borra; 422 si es la propia cuenta, ya está inactiva o es el último administrador) |
| RF-102 | `POST /api/v1/auth/change-password` `{ currentPassword, password, password_confirmation }` — obligatorio con contraseña temporal: mientras `mustChangePassword` sea `true`, el resto de la API responde 403 `password_change_required` (solo `auth/me`, `auth/logout` y este endpoint quedan abiertos) |
| apoyo RF-78–88 | `GET /api/v1/staff/members?role=` — personal asistencial activo (`id, name, role, isActive`; `email` solo para jefatura y supervisora) |
| RF-81 | `GET /api/v1/staff/handover/candidates?shiftDate=` — enfermeras a las que la persona puede relevar ahora (misma regla que la firma) |
| RF-78 | `GET /api/v1/staff/shift-plans` (últimos 12 meses) · `GET /api/v1/staff/shift-plans/{yyyy-mm}` (nombres, publicador y retenes) |
