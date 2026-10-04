<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BedRequest extends Model
{
    protected $fillable = [
        'encounter_id',
        'patient_name',
        'source',
        'priority',
        'specialty',
        'gender',
        'isolation',
        'status',
        'requested_at',
    ];

    protected function casts(): array
    {
        return [
            'isolation' => 'boolean',
            'requested_at' => 'datetime',
        ];
    }
}
