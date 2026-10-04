# Vitalsy

Vitalsy es un monorepo para una plataforma orientada a la investigación bibliográfica y gestión de datos de salud, construida con React + Vite + TypeScript, Laravel y PostgreSQL, y orquestada con Docker.

## Stack tecnológico

- Frontend: React + Vite + TypeScript
- Backend: Laravel
- Base de datos: PostgreSQL
- Infraestructura: Docker

## Arranque rápido en desarrollo

Desde la raíz del repositorio:

```bash
docker compose up --build
```

Nginx publica la aplicación en http://localhost:8080. El puerto 80 queda libre para XAMPP. La API queda en el mismo origen, bajo `/api`. PostgreSQL queda en `localhost:5432`.

El ingreso pide una cuenta local. Las cuentas de revisión y qué pantalla corresponde a cada requisito están en [docs/architecture/modulo-1-admision.md](docs/architecture/modulo-1-admision.md).

La guía para revisar cada pantalla del ingreso está en [docs/architecture/modulo-1-admision.md](docs/architecture/modulo-1-admision.md).

## Documentación

- Requerimientos: [docs/requirements/requerimientos.md](docs/requirements/requerimientos.md)
- Reglas de desarrollo: [docs/architecture/reglas.md](docs/architecture/reglas.md)
- Módulo 1: [docs/architecture/modulo-1-admision.md](docs/architecture/modulo-1-admision.md)

## Estructura principal

- `frontend/web/` - aplicación React + Vite
- `backend/api/` - API Laravel
- `database/` - `init.sql` y `seeds.sql` para el laboratorio
- `services/movil/` - app ciudadana Vitalsy Life
- `docker/` - configuración de Docker y Nginx
- `docs/` - documentación técnica y requisitos
- `bibliography/` - referencias bibliográficas
