<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DischargeProjection extends Model
{
    protected $fillable = [
        'encounter_id',
        'projected_at',
        'noted_by',
    ];

    protected function casts(): array
    {
        return [
            'projected_at' => 'datetime',
        ];
    }
}
