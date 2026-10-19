# Recuperación ante desastres (RNF-13: RPO <= 24 h, RTO <= 4 h)

## Respaldo

- Script: `scripts/backup-db.sh` (`pg_dump -Fc`, checksum SHA-256, retención por `BACKUP_RETENTION_DAYS`, 14 por defecto).
- Automático: servicio `backup` de `docker-compose.prod.yml`, cada `BACKUP_INTERVAL_HOURS` (6 h por defecto; debe ser <= 24 para cumplir el RPO).
- Los respaldos viven en el volumen `backup_data`. **Obligatorio fuera del servidor:** copiar periódicamente a almacenamiento externo cifrado (cifrado en reposo y control de acceso), porque un volumen en el mismo host no sobrevive a su pérdida.
- La clave de base de datos se pasa por `PGPASSWORD`/`PGPASSFILE`, nunca por línea de comandos.

## Verificación de restauración

`scripts/verify-backup.sh <archivo.dump>` valida checksum, restaura en una base temporal, cuenta tablas, `users` y `admission_encounters` y la elimina. Ejecutar al menos semanalmente y tras cambios de esquema.

## Runbook de restauración

| Paso | Acción | Tiempo estimado |
|---|---|---|
| 1 | Declarar el incidente y detener tráfico (`docker compose stop frontend backend reverb`) | 10 min |
| 2 | Aprovisionar host/volumen de PostgreSQL si se perdió | 60 min |
| 3 | Localizar el último respaldo y su `.sha256` | 10 min |
| 4 | `scripts/restore-db.sh --yes <archivo.dump>` (verifica checksum antes de restaurar) | 30-60 min según tamaño |
| 5 | `php artisan migrate --force` por si el esquema es posterior al respaldo | 10 min |
| 6 | Levantar servicios y comprobar `GET /api/health` | 10 min |
| 7 | Humo funcional (login, censo, un ingreso) y reapertura | 30 min |

Total estimado: ~3 h, dentro del RTO de 4 h. Son estimaciones; deben medirse en un simulacro.

## Simulacro

Realizar un simulacro trimestral en un entorno aparte, cronometrar cada paso y actualizar la tabla. Hasta registrar un simulacro, el RTO es una estimación no verificada.
