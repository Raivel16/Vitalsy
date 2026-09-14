#!/bin/sh
set -e

echo "Esperando PostgreSQL..."
until php -r "try { new PDO('pgsql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); } catch (Throwable \$e) { exit(1); }"; do
  sleep 2
done

php artisan migrate --force --no-interaction
exec php artisan serve --host=0.0.0.0 --port=8000
