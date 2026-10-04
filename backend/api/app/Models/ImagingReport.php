<?php

namespace App\Models;

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
            'payload' => 'array',
            'reported_at' => 'datetime',
        ];
    }
}
