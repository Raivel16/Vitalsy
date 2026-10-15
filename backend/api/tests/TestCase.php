<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        // Docker inyecta DB_*=pgsql; sin forzar SQLite, RefreshDatabase borra la BD real.
        // VITALSY_TEST_SQLITE permite aislar la BD de pruebas cuando varias ejecuciones corren a la vez.
        $sqlite = getenv('VITALSY_TEST_SQLITE')
            ?: dirname(__DIR__).DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'testing.sqlite';
        if (! file_exists($sqlite)) {
            touch($sqlite);
        }

        putenv('DB_CONNECTION=sqlite');
        putenv('DB_DATABASE='.$sqlite);
        putenv('DB_URL');
        $_ENV['DB_CONNECTION'] = 'sqlite';
        $_ENV['DB_DATABASE'] = $sqlite;
        $_ENV['DB_URL'] = '';
        $_SERVER['DB_CONNECTION'] = 'sqlite';
        $_SERVER['DB_DATABASE'] = $sqlite;
        $_SERVER['DB_URL'] = '';

        $app = require __DIR__.'/../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Las pruebas de API autentican con actingAs; Sanctum stateful (host dinámico / LAN)
        // exigiría CSRF en cada POST y no aporta cobertura útil aquí.
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }
}
