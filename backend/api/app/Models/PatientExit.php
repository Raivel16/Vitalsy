<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientExit extends Model
{
    protected $fillable = [
        'encounter_id',
        'exited_at',
        'confirmed_by',
    ];

    protected function casts(): array
    {
        return [
            'exited_at' => 'datetime',
        ];
    }
}
