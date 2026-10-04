<?php

namespace App\Models;

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
            'payload' => 'array',
            'resulted_at' => 'datetime',
        ];
    }
}
