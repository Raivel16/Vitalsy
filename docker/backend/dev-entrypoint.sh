#!/bin/sh
set -e

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-${DB_DATABASE:-}}"
DB_USER="${DB_USER:-${DB_USERNAME:-}}"
DB_PASSWORD="${DB_PASSWORD:-}"
PORT="${PORT:-8000}"

export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD PORT
export DB_DATABASE="${DB_DATABASE:-$DB_NAME}"
export DB_USERNAME="${DB_USERNAME:-$DB_USER}"

echo "Esperando PostgreSQL..."
until php -r "try { new PDO('pgsql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_NAME'), getenv('DB_USER'), getenv('DB_PASSWORD')); } catch (Throwable \$e) { exit(1); }"; do
  sleep 2
done

echo "Instalando dependencias de Composer..."
composer install --no-interaction --prefer-dist --no-progress

php artisan migrate --force --no-interaction
php artisan db:seed --force --no-interaction

# RNF-18: el stack E2E (BD propia) usa el servidor embebido directo.
if [ "${APP_ENV:-}" = "e2e" ]; then
  cd public
  exec php -S 0.0.0.0:"${PORT}" ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
fi
# RNF-06: sin --no-reload, `artisan serve` descarta las variables del compose y lee backend/api/.env;
# si su APP_KEY difiere, la API no descifra lo que cifran db:seed y el planificador (y viceversa).
exec php artisan serve --no-reload --host=0.0.0.0 --port="${PORT}"
