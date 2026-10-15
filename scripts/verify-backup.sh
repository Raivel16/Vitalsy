#!/bin/sh
# RNF-13: verifica que un respaldo se pueda restaurar (requiere PostgreSQL en ejecucion).
# Uso: verify-backup.sh <archivo.dump>
# Variables: PGHOST PGUSER y PGPASSWORD o PGPASSFILE (usuario con CREATEDB).
# Restaura en una base temporal, cuenta filas en tablas clave y la elimina.
set -eu

fail() { echo "verify-backup: $*" >&2; exit 1; }

file="${1:-}"
[ -n "$file" ] && [ -f "$file" ] || fail "indique el archivo .dump existente"
: "${PGHOST:?defina PGHOST}"
: "${PGUSER:?defina PGUSER}"
if [ -z "${PGPASSWORD:-}" ] && [ -z "${PGPASSFILE:-}" ]; then
  fail "defina PGPASSWORD o PGPASSFILE"
fi

sumfile="$file.sha256"
if [ -f "$sumfile" ]; then
  ( cd "$(dirname "$file")" && sha256sum -c "$(basename "$sumfile")" ) >/dev/null || fail "checksum invalido"
else
  fail "falta $sumfile"
fi

scratch="vitalsy_verify_$(date -u +%Y%m%d%H%M%S)"
cleanup() { dropdb --if-exists "$scratch" >/dev/null 2>&1 || true; }
trap cleanup EXIT

createdb "$scratch" || fail "no se pudo crear la base temporal"
pg_restore --no-owner --dbname="$scratch" "$file" || fail "pg_restore fallo"

tables=$(psql -At -d "$scratch" -c "select count(*) from information_schema.tables where table_schema='public'")
[ "$tables" -gt 0 ] || fail "la base restaurada no tiene tablas"
users=$(psql -At -d "$scratch" -c "select count(*) from users")
encounters=$(psql -At -d "$scratch" -c "select count(*) from admission_encounters")

echo "verify-backup: OK tablas=$tables users=$users admission_encounters=$encounters"
