FROM php:8.3-fpm

# Extensões e utilitários do sistema (pdo_sqlite é obrigatório para o SQLite).
RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip git curl libpng-dev libsqlite3-dev \
    && docker-php-ext-install zip pdo pdo_mysql pdo_sqlite

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# O código e as dependências vêm do volume + docker-entrypoint.sh (ver docker-compose.yml).
