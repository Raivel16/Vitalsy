<?php

namespace Tests\Unit\Access;

use App\Support\RoleCatalog;
use PHPUnit\Framework\TestCase;

class RoleCatalogTest extends TestCase
{
    public function test_catalog_covers_every_process_actor(): void
    {
        $this->assertSame([
            'admision',
            'camillero',
            'enfermera_piso',
            'auxiliar_enfermeria',
            'medico_residente',
            'medico_tratante',
            'enfermera_supervisora',
            'equipo_respuesta_rapida',
            'trabajo_social',
            'altas_caja',
            'gestion_camas',
            'servicios_generales',
            'jefatura_enfermeria',
            'recursos_humanos',
            'administrador_accesos',
        ], RoleCatalog::all());
    }

    public function test_catalog_labels_each_role_with_its_process_actor(): void
    {
        $this->assertSame('Enfermera supervisora de piso', RoleCatalog::label('enfermera_supervisora'));
        $this->assertSame('Equipo de Respuesta Rápida', RoleCatalog::label('equipo_respuesta_rapida'));
        $this->assertSame('Recursos humanos', RoleCatalog::label('recursos_humanos'));
    }

    public function test_catalog_rejects_legacy_and_unknown_keys(): void
    {
        $this->assertTrue(RoleCatalog::has('gestion_camas'));
        $this->assertFalse(RoleCatalog::has('enfermeria'));
        $this->assertFalse(RoleCatalog::has('medico'));
        $this->assertFalse(RoleCatalog::has('limpieza'));
    }
}
