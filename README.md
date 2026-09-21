# Vitalsy

Vitalsy es un monorepo para una plataforma orientada a la investigación bibliográfica y gestión de datos de salud, construida con React + Vite + TypeScript, Laravel y PostgreSQL, y orquestada con Docker.

## Stack tecnológico

- Frontend: React + Vite + TypeScript
- Backend: Laravel
- Base de datos: PostgreSQL
- Infraestructura: Docker

## Arranque rápido

```bash
docker-compose up --build
```

Luego accede a:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

## Documentación

- Requerimientos: [docs/requirements/requerimientos.md](docs/requirements/requerimientos.md)
- Reglas de desarrollo: [docs/architecture/reglas.md](docs/architecture/reglas.md)

## Estructura principal

- `services/frontend/` - aplicación React + Vite
- `services/backend/` - API Laravel
- `docker/` - configuración de Docker y Nginx
- `docs/` - documentación técnica y requisitos
- `bibliography/` - referencias bibliográficas
