<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bed extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'ward_id',
        'room',
        'bed_code',
        'gender_policy',
        'isolation',
        'status',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'isolation' => 'boolean',
            'active' => 'boolean',
        ];
    }

    /** Camas habilitadas por la administración (cama y pabellón activos). */
    public function scopeEnabled(Builder $query): void
    {
        $query->where('beds.active', true)->whereHas('ward', fn ($ward) => $ward->where('active', true));
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
