<?php

namespace App\Casts;

use App\Support\Security\FieldCipher;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** Valor numérico cifrado en reposo (no admite filtros ni agregados SQL). */
class EncryptedFloat implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?float
    {
        $plain = $value === null ? null : FieldCipher::decryptOrRaw((string) $value, $model, $key);

        return $plain === null ? null : (float) $plain;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        FieldCipher::assertWritable($model, $key);

        return $value === null ? null : FieldCipher::encrypt((string) (float) $value);
    }
}
