# Recuperación ante desastres (RNF-13: RPO <= 24 h, RTO <= 4 h)

## Alcance actual

El despliegue en AWS (`docs/devops/despliegue-produccion.md`) es de demostración. **No hay respaldo automático.** Los datos se pueden recrear con `php artisan db:seed --force`, y perderlos no es un riesgo aceptado como incidente. El RNF-13 queda sin cumplir hasta que exista una operación real. Los scripts de respaldo se retiraron del repositorio porque no forman parte de la entrega evaluada.

## Respaldo manual

Desde la raíz del proyecto en el servidor:

```bash
C="docker compose -f docker-compose.prod.yml"
$C exec -T postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > vitalsy-$(date +%F-%H%M).dump
sha256sum vitalsy-*.dump > respaldos.sha256
```

La contraseña no viaja por la línea de comandos: `pg_dump` corre dentro del contenedor con el usuario de la base. Copiar el `.dump` y el `.env` fuera del servidor, a almacenamiento cifrado. Sin el mismo `APP_KEY`, los campos cifrados (RNF-06) no se pueden leer.

## Restauración

| Paso | Acción | Tiempo estimado |
|---|---|---|
| 1 | Detener el tráfico: `$C stop frontend backend reverb scheduler` | 10 min |
| 2 | Aprovisionar el host o el volumen de PostgreSQL si se perdió | 60 min |
| 3 | Verificar el respaldo: `sha256sum -c respaldos.sha256` | 10 min |
| 4 | `$C exec -T postgres sh -c 'pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < archivo.dump` | 30-60 min según tamaño |
| 5 | `$C run --rm backend php artisan migrate --force`, por si el esquema es posterior al respaldo | 10 min |
| 6 | Levantar los servicios y comprobar `GET /api/health` | 10 min |
| 7 | Prueba de humo funcional (login, censo, un ingreso) y reapertura | 30 min |

Total estimado: unas 3 h, dentro del RTO de 4 h. Son estimaciones que deben medirse en un simulacro.
