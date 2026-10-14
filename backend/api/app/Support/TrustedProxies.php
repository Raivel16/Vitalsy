<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Proxies de confianza para X-Forwarded-* (RNF-05). Por defecto solo rangos privados
 * (red de Docker/LAN); '*' debe ser una decision explicita via TRUSTED_PROXIES.
 */
final class TrustedProxies
{
    /** Cabeceras X-Forwarded-* aceptadas: FOR y PROTO; HOST y PORT se ignoran a proposito. */
    public const HEADERS = Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO;

    public const DEFAULT = ['127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];

    /** @return array<int, string> */
    public static function fromEnv(?string $value): array
    {
        $value = trim((string) $value);
        if ($value === '') {
            return self::DEFAULT;
        }
        if ($value === '*') {
            return ['*'];
        }

        return array_values(array_filter(array_map('trim', explode(',', $value)), fn ($v) => $v !== ''));
    }
}
