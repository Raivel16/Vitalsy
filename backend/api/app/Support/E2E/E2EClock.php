<?php

namespace App\Support\E2E;

use Illuminate\Contracts\Foundation\Application;

/**
 * RNF-18: reloj desplazable de la suite E2E. El desplazamiento se guarda en un
 * archivo local del contenedor (no en storage/, compartido con desarrollo) y
 * solo tiene efecto con APP_ENV=e2e y E2E_CLOCK_ENABLED=true.
 */
final class E2EClock
{
    public static function isActive(Application $app): bool
    {
        return $app->environment('e2e') && config('vitalsy.e2e.clock_enabled') === true;
    }

    public static function offsetSeconds(): int
    {
        $file = self::file();
        if (! is_file($file)) {
            return 0;
        }

        $data = json_decode((string) @file_get_contents($file), true);

        return is_array($data) && is_int($data['offsetSeconds'] ?? null) ? $data['offsetSeconds'] : 0;
    }

    public static function setOffsetSeconds(int $seconds): void
    {
        file_put_contents(self::file(), json_encode(['offsetSeconds' => $seconds]), LOCK_EX);
    }

    public static function reset(): void
    {
        @unlink(self::file());
    }

    /** Hora desplazada en ISO-8601 UTC, calculada sobre el reloj real. */
    public static function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z', time() + self::offsetSeconds());
    }

    private static function file(): string
    {
        return (string) config('vitalsy.e2e.clock_file');
    }
}
