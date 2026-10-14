<?php

namespace App\Support\Security;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

/**
 * Cifrado de campos clínicos en reposo (RNF-06) con el cifrador de la aplicación
 * (AES-256-CBC + HMAC-SHA256, clave APP_KEY; claves anteriores en APP_PREVIOUS_KEYS).
 */
final class FieldCipher
{
    public static function encrypt(string $plain): string
    {
        return Crypt::encryptString($plain);
    }

    public static function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (DecryptException) {
            return false;
        }
    }

    /**
     * Descifra; si el valor aún es texto legado en claro (antes del respaldo
     * `vitalsy:encrypt-existing`) lo devuelve tal cual para no romper la lectura.
     */
    public static function decryptOrRaw(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            return $value;
        }
    }
}
