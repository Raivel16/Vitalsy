FROM php:8.2.35-cli

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        curl \
        unzip \
        zip \
        pkg-config \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libpq-dev \
        libzip-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_pgsql gd zip bcmath pcntl \
    && pecl install pcov \
    && docker-php-ext-enable pcov \
    && apt-get purge -y --auto-remove $PHPIZE_DEPS \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY artisan composer.json composer.lock phpunit.xml ./
COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY lang ./lang
COPY public ./public
COPY resources ./resources
COPY routes ./routes
COPY storage ./storage
COPY tests ./tests

RUN composer install --no-interaction --prefer-dist --no-progress --optimize-autoloader \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache vendor

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

USER www-data

CMD ["sh", "-c", "php artisan serve --host=0.0.0.0 --port=${PORT}"]
