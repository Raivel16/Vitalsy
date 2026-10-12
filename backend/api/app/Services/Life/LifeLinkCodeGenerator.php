<?php

namespace App\Services\Life;

/** Genera códigos de vinculación `VL-XXXX-XXXX` sin caracteres ambiguos (0/O/1/I). */
class LifeLinkCodeGenerator
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function generate(): string
    {
        $max = strlen(self::ALPHABET) - 1;
        $raw = '';
        for ($i = 0; $i < 8; $i++) {
            $raw .= self::ALPHABET[random_int(0, $max)];
        }

        return 'VL-'.substr($raw, 0, 4).'-'.substr($raw, 4, 4);
    }
}
