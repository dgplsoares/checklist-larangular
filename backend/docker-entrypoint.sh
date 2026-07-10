#!/bin/sh
set -e

# Dependências: instala só se o vendor estiver ausente (o volume monta ./backend
# por cima do que foi baked, então num clone limpo o vendor não existe ainda).
[ -d vendor ] || composer install --no-interaction --no-progress

# .env + APP_KEY apenas na primeira vez — a guarda evita rotacionar a chave a cada boot.
[ -f .env ] || (cp .env.example .env && php artisan key:generate --force)

# SQLite: garante o arquivo e aplica as migrations (idempotente).
touch database/database.sqlite
php artisan migrate --force

exec php artisan serve --host=0.0.0.0 --port=8000
