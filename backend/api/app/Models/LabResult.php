<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;

class LabResult extends Model
{
    protected $fillable = [
        'encounter_id',
        'external_id',
        'summary',
        'payload',
        'resulted_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => EncryptedArray::class,
            'summary' => EncryptedText::class,
            'resulted_at' => 'datetime',
        ];
    }
}
