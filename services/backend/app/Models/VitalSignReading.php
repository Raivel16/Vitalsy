<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VitalSignReading extends Model
{
    protected $fillable = [
        'encounter_id',
        'rr',
        'spo2',
        'sbp',
        'dbp',
        'pulse',
        'temperature',
        'spo2_scale',
        'supplemental_oxygen',
        'consciousness',
        'news2_total',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'temperature' => 'float',
            'supplemental_oxygen' => 'boolean',
            'recorded_at' => 'datetime',
        ];
    }
}
