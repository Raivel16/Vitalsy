#!/bin/sh
# RNF-13: restaura un respaldo .dump en la base destino tras verificar su checksum.
# Uso: restore-db.sh --yes <archivo.dump>
# Variables: PGHOST PGUSER PGDATABASE (destino) y PGPASSWORD o PGPASSFILE.
# Destructivo: usa pg_restore --clean --if-exists sobre PGDATABASE.
set -eu

fail() { echo "restore-db: $*" >&2; exit 1; }

[ "${1:-}" = "--yes" ] || fail "operacion destructiva: repita con --yes <archivo.dump>"
file="${2:-}"
[ -n "$file" ] && [ -f "$file" ] || fail "indique el archivo .dump existente"

: "${PGHOST:?defina PGHOST}"
: "${PGUSER:?defina PGUSER}"
: "${PGDATABASE:?defina PGDATABASE}"
if [ -z "${PGPASSWORD:-}" ] && [ -z "${PGPASSFILE:-}" ]; then
  fail "defina PGPASSWORD o PGPASSFILE"
fi

sumfile="$file.sha256"
[ -f "$sumfile" ] || fail "falta $sumfile; no se restaura sin verificar integridad"
( cd "$(dirname "$file")" && sha256sum -c "$(basename "$sumfile")" ) >/dev/null \
  || fail "checksum invalido: respaldo corrupto o alterado"

pg_restore --clean --if-exists --no-owner --dbname="$PGDATABASE" "$file" \
  || fail "pg_restore fallo"

echo "restore-db: OK $file -> $PGDATABASE@$PGHOST"
