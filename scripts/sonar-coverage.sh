#!/usr/bin/env bash
# Genera la cobertura igual que el CI y la deja en coverage-reports/ para SonarQube.
# Requiere PCOV o Xdebug (coverage) para PHP.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

(cd "$ROOT/frontend/web" && npm test)
(cd "$ROOT/movil" && npx jest --ci --coverage)
(cd "$ROOT/backend/api" && php -d xdebug.mode=coverage -d pcov.enabled=1 artisan test --coverage-clover coverage.xml)

node "$ROOT/scripts/sonar-coverage.mjs"
