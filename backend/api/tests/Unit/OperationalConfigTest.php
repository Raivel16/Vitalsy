<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class OperationalConfigTest extends TestCase
{
    private function root(): string
    {
        return dirname(__DIR__, 4);
    }

    public function test_la_zona_horaria_por_defecto_es_la_de_peru(): void
    {
        $config = file_get_contents(dirname(__DIR__, 2).'/config/app.php');

        $this->assertStringContainsString("env('APP_TIMEZONE', 'America/Lima')", $config);
    }

    public function test_el_entorno_de_desarrollo_ejecuta_el_planificador(): void
    {
        $compose = file_get_contents($this->root().'/docker-compose.yml');

        $this->assertMatchesRegularExpression('/^  scheduler:\R(?:.*\R)*?\s+command:.*schedule:work/m', $compose);
    }

    public function test_el_entorno_de_produccion_ejecuta_el_planificador(): void
    {
        $compose = file_get_contents($this->root().'/docker-compose.prod.yml');

        $this->assertMatchesRegularExpression('/^  scheduler:\R(?:.*\R)*?\s+command:.*schedule:work/m', $compose);
    }
}
