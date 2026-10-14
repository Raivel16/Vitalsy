<?php

namespace App\Models;

use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalEvolutionNote extends Model
{
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
