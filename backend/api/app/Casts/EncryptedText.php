<?php

namespace App\Casts;

use App\Support\Security\FieldCipher;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** Texto libre cifrado en reposo; tolera valores legados en claro hasta el respaldo. */
class EncryptedText implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : (FieldCipher::decryptOrRaw((string) $value, $model, $key) ?? FieldCipher::UNAVAILABLE_TEXT);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        FieldCipher::assertWritable($model, $key);

        return $value === null ? null : FieldCipher::encrypt((string) $value);
    }
}
