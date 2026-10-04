<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BedReadinessCheck extends Model
{
    protected $fillable = [
        'bed_id',
        'linen_ok',
        'supplies_ok',
        'confirmed_by',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'linen_ok' => 'boolean',
            'supplies_ok' => 'boolean',
            'confirmed_at' => 'datetime',
        ];
    }
}
