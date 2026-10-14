<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Models\Concerns\Immutable;
use Illuminate\Database\Eloquent\Model;

class Handover extends Model
{
    use Immutable;

    /** RNF-07: firmada (signed_at) la nota/entrega queda congelada; antes de firmar es editable. */
    public function isImmutableNow(): bool
    {
        return $this->getOriginal('signed_at') !== null;
    }

    public function immutableNullableColumns(): array
    {
        return [];
    }

    protected $fillable = [
        'from_user_id',
        'to_user_id',
        'encounter_id',
        'payload',
        'signed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => EncryptedArray::class,
            'signed_at' => 'datetime',
        ];
    }
}
