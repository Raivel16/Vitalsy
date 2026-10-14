<?php

namespace App\Models;

use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;

class PharmaDischargeReconciliation extends Model
{
    protected $fillable = [
        'encounter_id',
        'notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'notes' => EncryptedText::class,
        ];
    }
}
