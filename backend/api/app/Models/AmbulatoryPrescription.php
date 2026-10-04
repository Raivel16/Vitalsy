<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AmbulatoryPrescription extends Model
{
    protected $fillable = [
        'encounter_id',
        'content',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'issued_at' => 'datetime',
        ];
    }
}
