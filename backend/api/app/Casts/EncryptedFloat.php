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
        return $value === null ? null : (float) FieldCipher::decryptOrRaw((string) $value);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : FieldCipher::encrypt((string) (float) $value);
    }
}
