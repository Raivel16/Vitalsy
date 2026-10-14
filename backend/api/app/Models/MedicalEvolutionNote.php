<?php

namespace App\Models;

use App\Casts\EncryptedText;
use App\Models\Concerns\Immutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalEvolutionNote extends Model
{
    use Immutable;

    /** RNF-07: firmada (signed_at) la nota/entrega queda congelada; antes de firmar es editable. */
    public function isImmutableNow(): bool
    {
        return $this->getOriginal('signed_at') !== null;
    }

    public function immutableNullableColumns(): array
    {
        return ['author_user_id' => 'users'];
    }

    protected $fillable = [
        'encounter_id',
        'author_user_id',
        'body',
        'signed_at',
    ];

    protected function casts(): array
    {
        return [
            'body' => EncryptedText::class,
            'signed_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }
}
