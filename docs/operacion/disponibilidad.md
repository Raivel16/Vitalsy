# Disponibilidad (RNF-11, objetivo >= 99.9 % anual)

- **Sonda:** `GET /api/health` (sin autenticación, sin datos clínicos). Responde `200 {"status":"ok","db":"ok"}` o `503 {"status":"degraded","db":"fail"}` si PostgreSQL no responde. Prueba: `backend/api/tests/Feature/HealthEndpointTest.php`.
- **Reinicio automático:** `restart: unless-stopped` en frontend, backend, reverb, postgres y backup (`docker-compose.prod.yml`).
- **Healthchecks de contenedor:** backend (`/api/health`), frontend (HTTP), reverb (puerto 8080), postgres (`pg_isready`).
- **Presupuesto:** 99.9 % anual equivale a como máximo 8.76 h de inactividad no programada.
- **Monitoreo externo:** apuntar el monitor (UptimeRobot, Prometheus blackbox u otro) a `/api/health` cada 60 s y alertar tras 3 fallos consecutivos.

## Limitaciones

Un único host con Docker Compose no garantiza 99.9 %; la cifra requiere medición anual y, de ser necesario, réplicas y base gestionada. Esta medición no puede verificarse desde el repositorio.
