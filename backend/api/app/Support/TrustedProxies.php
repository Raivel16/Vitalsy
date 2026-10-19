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

    /** Loopback (octetos) y rangos privados RFC 1918 como [octeto1..octeto4, prefijo]. */
    private const LOOPBACK = [127, 0, 0, 1];

    private const RFC1918_CLASS_A = [10, 0, 0, 0, 8];

    private const RFC1918_CLASS_B = [172, 16, 0, 0, 12];

    private const RFC1918_CLASS_C = [192, 168, 0, 0, 16];

    /**
     * Proxies por defecto: loopback y rangos privados (red de Docker/LAN).
     *
     * @return array<int, string>
     */
    public static function defaults(): array
    {
        return [
            implode('.', self::LOOPBACK),
            ...array_map(
                static fn (array $parts): string => implode('.', array_slice($parts, 0, 4)).'/'.$parts[4],
                [self::RFC1918_CLASS_A, self::RFC1918_CLASS_B, self::RFC1918_CLASS_C],
            ),
        ];
    }

    /** @return array<int, string> */
    public static function fromEnv(?string $value): array
    {
        $value = trim((string) $value);
        if ($value === '') {
            return self::defaults();
        }
        if ($value === '*') {
            return ['*'];
        }

        return array_values(array_filter(array_map('trim', explode(',', $value)), fn ($v) => $v !== ''));
    }
}
