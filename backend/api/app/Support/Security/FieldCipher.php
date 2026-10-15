<?php

namespace App\Support\Security;

use App\Exceptions\UndecryptableFieldException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

/**
 * Cifrado de campos clínicos en reposo (RNF-06) con el cifrador de la aplicación
 * (AES-256-CBC + HMAC-SHA256, clave APP_KEY; claves anteriores en APP_PREVIOUS_KEYS).
 */
final class FieldCipher
{
    public const PLAIN = 'plain';

    public const ENCRYPTED = 'encrypted';

    public const UNDECRYPTABLE = 'undecryptable';

    public const UNAVAILABLE_TEXT = 'No disponible (error de descifrado)';

    private static int $degradeDepth = 0;

    /** @var list<array{table: string, column: string, id: mixed}> */
    private static array $degradeErrors = [];

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
     * Dentro de `degrading()` devuelve null (el cast decide el valor a mostrar).
     */
    public static function decryptOrRaw(string $value, ?Model $model = null, ?string $column = null): ?string
    {
        if (! self::looksEncrypted($value)) {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            if (self::$degradeDepth === 0) {
                throw UndecryptableFieldException::make();
            }

            $ref = [
                'table' => $model?->getTable() ?? '?',
                'column' => $column ?? '?',
                'id' => $model?->getKey(),
            ];
            self::$degradeErrors[] = $ref;
            Log::warning('rnf06.field_undecryptable', $ref);

            return null;
        }
    }

    /** ¿Estamos en una lectura de listado con degradación por campo? */
    public static function isDegrading(): bool
    {
        return self::$degradeDepth > 0;
    }

    /**
     * Ejecuta una lectura de listado tolerando campos ilegibles.
     *
     * @template T
     *
     * @param  callable(): T  $read
     * @return array{0: T, 1: list<array{table: string, column: string, id: mixed}>}
     */
    public static function degrading(callable $read): array
    {
        $outer = self::$degradeDepth;
        if ($outer === 0) {
            self::$degradeErrors = [];
        }
        self::$degradeDepth++;
        try {
            $result = $read();
        } finally {
            self::$degradeDepth--;
        }

        $errors = array_values(array_unique(self::$degradeErrors, SORT_REGULAR));
        if ($outer === 0) {
            self::$degradeErrors = [];
        }

        return [$result, $errors];
    }

    /**
     * Protección de escritura dentro de una lectura degradada: si el valor almacenado es
     * ilegible, asignarlo (y luego guardar) lo destruiría.
     */
    public static function assertWritable(Model $model, string $column): void
    {
        if (self::$degradeDepth === 0) {
            return;
        }
        $raw = $model->getRawOriginal($column);
        if (is_string($raw) && self::state($raw) === self::UNDECRYPTABLE) {
            throw UndecryptableFieldException::make();
        }
    }
}
