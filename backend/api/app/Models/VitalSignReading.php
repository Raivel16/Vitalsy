<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VitalSignReading extends Model
{
    protected $fillable = [
        'encounter_id',
        'author_user_id',
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

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    protected function casts(): array
    {
        return [
            'temperature' => 'float',
            'supplemental_oxygen' => 'boolean',
            'recorded_at' => 'datetime',
        ];
    }
}
