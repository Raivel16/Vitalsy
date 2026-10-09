<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CleaningOrder extends Model
{
    protected $fillable = [
        'bed_id',
        'protocol',
        'status',
        'checklist',
        'dispatched_at',
        'completed_at',
        'disinfected_by',
        'equipped_at',
        'equipped_by',
        'enabled_at',
        'enabled_by',
    ];

    protected function casts(): array
    {
        return [
            'checklist' => 'array',
            'dispatched_at' => 'datetime',
            'completed_at' => 'datetime',
            'equipped_at' => 'datetime',
            'enabled_at' => 'datetime',
        ];
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }
}
