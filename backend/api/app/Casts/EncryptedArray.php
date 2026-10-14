<?php

namespace App\Casts;

use App\Support\Security\FieldCipher;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** JSON/array cifrado en reposo; tolera JSON legado en claro hasta el respaldo. */
class EncryptedArray implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        if ($value === null) {
            return null;
        }

        $decoded = json_decode(FieldCipher::decryptOrRaw((string) $value), true);

        return is_array($decoded) ? $decoded : null;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : FieldCipher::encrypt(json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }
}
