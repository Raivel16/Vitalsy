#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Frontend: dependencias y cobertura =="
cd "$ROOT/frontend/web"
npm ci
npm test

echo "== Backend: dependencias y tests =="
cd "$ROOT/backend/api"
composer install --no-interaction --prefer-dist --no-progress
if [[ ! -f .env ]]; then
  cp .env.example .env
  php artisan key:generate --force
fi
php artisan test

if php -m | grep -Eiq '^(pcov|xdebug)$'; then
  echo "== Backend: coverage.xml =="
  composer test:coverage
else
  echo "PHP local no tiene PCOV ni Xdebug. Los tests del backend pasaron."
  echo "coverage.xml no se generó aquí. El CI de GitHub sí lo genera con PCOV."
fi

echo "Listo."
echo "Frontend: frontend/web/coverage/lcov.info"
if [[ -f "$ROOT/backend/api/coverage.xml" ]]; then
  echo "Backend:  backend/api/coverage.xml"
fi
