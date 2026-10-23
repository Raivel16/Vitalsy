#!/usr/bin/env bash
# Análisis de calidad local con SonarQube Community (Docker).
#
# Genera la cobertura de frontend, móvil y backend, corrige las rutas del reporte
# clover del backend, ejecuta el scanner y muestra métricas y Quality Gate.
#
# Uso:
#   export SONAR_TOKEN=squ_...        # My Account -> Security en SonarQube
#   scripts/sonar.sh [opciones] [-- args extra del scanner]
#
# Opciones:
#   --skip-tests      reutiliza los reportes existentes (no corre pruebas)
#   --skip-frontend   no regenera la cobertura del frontend
#   --skip-movil      no regenera la cobertura del móvil
#   --skip-backend    no regenera la cobertura del backend (PCOV en Docker)
#   --no-stop         no detiene SonarQube mientras corren las pruebas
#   -h, --help        muestra esta ayuda
#
# Variables opcionales: SONAR_URL (http://localhost:9000), SCANNER_URL
# (http://host.docker.internal:9000), SONAR_CONTAINER (sonarqube), PROJECT_KEY (vitalsy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SONAR_URL="${SONAR_URL:-http://localhost:9000}"
SCANNER_URL="${SCANNER_URL:-http://host.docker.internal:9000}"
SONAR_CONTAINER="${SONAR_CONTAINER:-sonarqube}"
PROJECT_KEY="${PROJECT_KEY:-vitalsy}"
BACKEND_IMAGE="vitalsy-backend-cov"
COVERAGE_CONTAINER="vitalsy-cov-run"

RUN_FRONTEND=1
RUN_MOVIL=1
RUN_BACKEND=1
STOP_SONAR=1
SCANNER_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests) RUN_FRONTEND=0; RUN_MOVIL=0; RUN_BACKEND=0 ;;
    --skip-frontend) RUN_FRONTEND=0 ;;
    --skip-movil) RUN_MOVIL=0 ;;
    --skip-backend) RUN_BACKEND=0 ;;
    --no-stop) STOP_SONAR=0 ;;
    -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;;
    --) shift; SCANNER_ARGS=("$@"); break ;;
    *) echo "Opción desconocida: $1 (usa --help)" >&2; exit 2 ;;
  esac
  shift
done

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "Falta SONAR_TOKEN. Genera uno en SonarQube (My Account -> Security) y expórtalo:" >&2
  echo "  export SONAR_TOKEN=squ_..." >&2
  exit 2
fi
command -v docker >/dev/null || { echo "Docker no está instalado o no está en el PATH." >&2; exit 2; }
docker info >/dev/null 2>&1 || { echo "Docker no responde. Abre Docker Desktop y reintenta." >&2; exit 2; }

WARNINGS=()
STOPPED_SONAR=0

warn() { WARNINGS+=("$1"); echo "AVISO: $1" >&2; }

sonar_is_up() {
  curl -fs "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'
}

wait_for_sonar() {
  echo "Esperando a que SonarQube esté listo..."
  for _ in $(seq 1 72); do
    if sonar_is_up; then return 0; fi
    sleep 5
  done
  echo "SonarQube no respondió en 6 minutos en $SONAR_URL." >&2
  return 1
}

start_sonar() {
  if sonar_is_up; then return 0; fi
  if docker ps -a --format '{{.Names}}' | grep -qx "$SONAR_CONTAINER"; then
    echo "== Iniciando el contenedor $SONAR_CONTAINER =="
    docker start "$SONAR_CONTAINER" >/dev/null
  else
    echo "No existe el contenedor '$SONAR_CONTAINER'. Créalo con:" >&2
    echo "  docker run -d --name $SONAR_CONTAINER -p 9000:9000 sonarqube:community" >&2
    exit 1
  fi
  wait_for_sonar
}

restore_sonar() {
  if [[ "$STOPPED_SONAR" -eq 1 ]]; then
    STOPPED_SONAR=0
    docker start "$SONAR_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap restore_sonar EXIT

# SonarQube consume ~3 GB; detenerlo mientras corren las pruebas evita timeouts por carga.
if [[ "$STOP_SONAR" -eq 1 && $((RUN_FRONTEND + RUN_MOVIL + RUN_BACKEND)) -gt 0 ]] \
   && docker ps --format '{{.Names}}' | grep -qx "$SONAR_CONTAINER"; then
  echo "== Deteniendo $SONAR_CONTAINER mientras corren las pruebas =="
  docker stop "$SONAR_CONTAINER" >/dev/null
  STOPPED_SONAR=1
fi

if [[ "$RUN_FRONTEND" -eq 1 ]]; then
  echo "== Frontend: pruebas y cobertura =="
  cd "$ROOT/frontend/web"
  [[ -d node_modules ]] || npm ci
  npx vitest run --coverage --coverage.reportOnFailure \
    || warn "Hay pruebas fallidas en el frontend; la cobertura se generó igualmente."
fi

if [[ "$RUN_MOVIL" -eq 1 ]]; then
  echo "== Móvil: pruebas y cobertura =="
  cd "$ROOT/movil"
  [[ -d node_modules ]] || npm ci
  npx jest --coverage \
    || warn "Hay pruebas fallidas en el móvil; la cobertura se generó igualmente."
fi

if [[ "$RUN_BACKEND" -eq 1 ]]; then
  echo "== Backend: pruebas y cobertura (PCOV en Docker) =="
  cd "$ROOT"
  docker build -q -t "$BACKEND_IMAGE" backend/api >/dev/null
  docker rm -f "$COVERAGE_CONTAINER" >/dev/null 2>&1 || true
  docker run --name "$COVERAGE_CONTAINER" --user root "$BACKEND_IMAGE" sh -c \
    "cp .env.example .env && php artisan key:generate --force >/dev/null && touch database/testing.sqlite \
     && php -d pcov.enabled=1 vendor/bin/phpunit --coverage-clover coverage.xml" \
    || warn "Hay pruebas fallidas en el backend; se intenta usar la cobertura generada."
  if docker cp "$COVERAGE_CONTAINER:/var/www/html/coverage.xml" "$ROOT/backend/api/coverage.xml" 2>/dev/null; then
    # Las rutas del contenedor no existen en el host: sin esto Sonar cuenta el backend como 0 %.
    sed 's#/var/www/html/#backend/api/#g' "$ROOT/backend/api/coverage.xml" > "$ROOT/backend/api/coverage.xml.tmp"
    mv "$ROOT/backend/api/coverage.xml.tmp" "$ROOT/backend/api/coverage.xml"
  else
    warn "No se generó backend/api/coverage.xml."
  fi
  docker rm -f "$COVERAGE_CONTAINER" >/dev/null 2>&1 || true
fi

cd "$ROOT"
for report in frontend/web/coverage/lcov.info movil/coverage/lcov.info backend/api/coverage.xml; do
  [[ -f "$report" ]] || warn "Falta $report: esa parte contará como 0 % de cobertura."
done
if [[ -f backend/api/coverage.xml ]] && grep -q '/var/www/html/' backend/api/coverage.xml; then
  warn "backend/api/coverage.xml aún tiene rutas del contenedor; el backend contará como 0 %."
fi

restore_sonar
start_sonar

echo "== Escaneo en SonarQube =="
HOST_ROOT="$(pwd -W 2>/dev/null || pwd)"
# -Dsonar.scm.disabled: el .git de una worktree apunta a una ruta del host que el contenedor no ve.
MSYS_NO_PATHCONV=1 docker run --rm \
  -e SONAR_HOST_URL="$SCANNER_URL" \
  -e SONAR_TOKEN \
  -v "$HOST_ROOT:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey="$PROJECT_KEY" \
  -Dsonar.scm.disabled=true \
  "${SCANNER_ARGS[@]+"${SCANNER_ARGS[@]}"}"

echo "== Esperando el procesamiento del informe =="
for _ in $(seq 1 60); do
  task="$(curl -fs -u "$SONAR_TOKEN:" "$SONAR_URL/api/ce/component?component=$PROJECT_KEY" || true)"
  if [[ "$task" == *'"queue":[]'* ]]; then break; fi
  sleep 3
done
sleep 3

echo "== Resultados =="
METRICS="software_quality_reliability_rating,software_quality_security_rating,software_quality_maintainability_rating,bugs,vulnerabilities,code_smells,coverage,line_coverage,branch_coverage,duplicated_lines_density"
curl -fs -u "$SONAR_TOKEN:" \
  "$SONAR_URL/api/measures/component?component=$PROJECT_KEY&metricKeys=$METRICS" \
  | grep -o '"metric":"[a-z_]*","value":"[^"]*"' \
  | sed 's/"metric":"\([a-z_]*\)","value":"\([^"]*\)"/  \1 = \2/' || true

gate="$(curl -fs -u "$SONAR_TOKEN:" "$SONAR_URL/api/qualitygates/project_status?projectKey=$PROJECT_KEY" || true)"
status="$(echo "$gate" | grep -o '"status":"[A-Z]*"' | head -1 | cut -d'"' -f4)"
echo "  quality_gate = ${status:-desconocido}"
echo "Ratings: 1.0 = A, 2.0 = B, 3.0 = C, 4.0 = D, 5.0 = E"
echo "Detalle: $SONAR_URL/dashboard?id=$PROJECT_KEY"

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  echo "Avisos:"
  printf '  - %s\n' "${WARNINGS[@]}"
fi

[[ "$status" == "ERROR" ]] && exit 1
exit 0
