<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bed extends Model
{
    protected $fillable = [
        'ward_id',
        'room',
        'bed_code',
        'gender_policy',
        'isolation',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'isolation' => 'boolean',
        ];
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(BedAssignment::class);
    }
}
