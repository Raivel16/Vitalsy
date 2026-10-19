<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;

class ImagingReport extends Model
{
    protected $fillable = [
        'encounter_id',
        'external_id',
        'modality',
        'summary',
        'payload',
        'reported_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => EncryptedArray::class,
            'summary' => EncryptedText::class,
            'reported_at' => 'datetime',
        ];
    }
}
