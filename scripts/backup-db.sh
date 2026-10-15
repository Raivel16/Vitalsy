#!/bin/sh
# RNF-13: respaldo de PostgreSQL en formato custom (pg_dump -Fc) con checksum y retencion.
# Variables requeridas: PGHOST PGUSER PGDATABASE y (PGPASSWORD o PGPASSFILE).
# Opcionales: BACKUP_DIR (defecto ./backups), BACKUP_RETENTION_DAYS (defecto 14).
# La clave nunca se pasa por linea de comandos.
set -eu

fail() { echo "backup-db: $*" >&2; exit 1; }

: "${PGHOST:?defina PGHOST}"
: "${PGUSER:?defina PGUSER}"
: "${PGDATABASE:?defina PGDATABASE}"
if [ -z "${PGPASSWORD:-}" ] && [ -z "${PGPASSFILE:-}" ]; then
  fail "defina PGPASSWORD o PGPASSFILE"
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"
case "$RETENTION" in ''|*[!0-9]*) fail "BACKUP_RETENTION_DAYS debe ser un entero" ;; esac

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out="$BACKUP_DIR/${PGDATABASE}_${stamp}.dump"
tmp="$out.partial"

trap 'rm -f "$tmp"' EXIT
pg_dump -Fc --no-owner --file="$tmp" || fail "pg_dump fallo"
[ -s "$tmp" ] || fail "el respaldo quedo vacio"
mv "$tmp" "$out"

( cd "$BACKUP_DIR" && sha256sum "$(basename "$out")" > "$(basename "$out").sha256" ) \
  || fail "no se pudo escribir el checksum"

# Retencion: elimina respaldos (y su checksum) mas antiguos que N dias.
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name "${PGDATABASE}_*.dump" -o -name "${PGDATABASE}_*.dump.sha256" \) \
  -mtime +"$RETENTION" -exec rm -f {} +

echo "backup-db: OK $out"
