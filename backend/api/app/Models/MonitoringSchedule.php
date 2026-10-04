<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonitoringSchedule extends Model
{
    protected $fillable = [
        'encounter_id',
        'next_due_at',
        'frequency_minutes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'next_due_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
