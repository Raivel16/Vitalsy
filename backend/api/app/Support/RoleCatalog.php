<?php

namespace App\Support;

/**
 * Catálogo único de roles operativos. Cada actor de proceso se implementa con
 * una clave por responsabilidad; no existen claves genéricas de enfermería ni
 * de medicina.
 */
final class RoleCatalog
{
    private const ROLES = [
        'admision' => 'Admisión',
        'camillero' => 'Celador / Camillero',
        'enfermera_piso' => 'Enfermera de piso',
        'auxiliar_enfermeria' => 'Auxiliar de enfermería',
        'medico_residente' => 'Médico residente',
        'medico_tratante' => 'Médico tratante',
        'enfermera_supervisora' => 'Enfermera supervisora de piso',
        'equipo_respuesta_rapida' => 'Equipo de Respuesta Rápida',
        'trabajo_social' => 'Trabajo social',
        'altas_caja' => 'Altas / Caja',
        'gestion_camas' => 'Gestión de camas',
        'servicios_generales' => 'Servicios generales / Limpieza',
        'jefatura_enfermeria' => 'Jefatura de enfermería',
        'recursos_humanos' => 'Recursos humanos',
        'administrador_accesos' => 'Administrador de accesos',
    ];

    /** @return list<string> */
    public static function all(): array
    {
        return array_keys(self::ROLES);
    }

    public static function has(string $role): bool
    {
        return array_key_exists($role, self::ROLES);
    }

    public static function label(string $role): string
    {
        return self::ROLES[$role] ?? $role;
    }
}
