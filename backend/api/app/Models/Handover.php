<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Handover extends Model
{
    protected $fillable = [
        'from_user_id',
        'to_user_id',
        'encounter_id',
        'payload',
        'signed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'signed_at' => 'datetime',
        ];
    }
}
