<?php

namespace App\Support\Security;

use App\Exceptions\UndecryptableFieldException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

/**
 * Cifrado de campos clínicos en reposo (RNF-06) con el cifrador de la aplicación
 * (AES-256-CBC + HMAC-SHA256, clave APP_KEY; claves anteriores en APP_PREVIOUS_KEYS).
 */
final class FieldCipher
{
    public const PLAIN = 'plain';

    public const ENCRYPTED = 'encrypted';

    public const UNDECRYPTABLE = 'undecryptable';

    public static function encrypt(string $plain): string
    {
        return Crypt::encryptString($plain);
    }

    /** ¿Tiene la forma de un payload cifrado de Laravel (base64 de JSON con iv, value y mac)? */
    public static function looksEncrypted(string $value): bool
    {
        $json = base64_decode($value, true);
        if ($json === false || $json === '' || $json[0] !== '{') {
            return false;
        }
        $payload = json_decode($json, true);

        return is_array($payload)
            && isset($payload['iv'], $payload['value'], $payload['mac'])
            && is_string($payload['iv']) && is_string($payload['value']) && is_string($payload['mac']);
    }

    /** @return self::PLAIN|self::ENCRYPTED|self::UNDECRYPTABLE */
    public static function state(string $value): string
    {
        if (! self::looksEncrypted($value)) {
            return self::PLAIN;
        }

        try {
            Crypt::decryptString($value);

            return self::ENCRYPTED;
        } catch (DecryptException) {
            return self::UNDECRYPTABLE;
        }
    }

    public static function isEncrypted(string $value): bool
    {
        return self::state($value) === self::ENCRYPTED;
    }

    /**
     * Descifra. Un valor que NO tiene forma de payload cifrado es texto legado en claro
     * (antes del respaldo `vitalsy:encrypt-existing`) y se devuelve tal cual. Un valor que
     * parece cifrado pero no descifra (clave incorrecta/dato corrupto) lanza excepción:
     * jamás se debe tratar como vacío, o un guardado posterior lo sobrescribiría.
     */
    public static function decryptOrRaw(string $value): string
    {
        if (! self::looksEncrypted($value)) {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            throw UndecryptableFieldException::make();
        }
    }
}
