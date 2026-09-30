<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExitPass extends Model
{
    protected $fillable = [
        'encounter_id',
        'issued_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
        ];
    }
}
