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
        'dispatched_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'dispatched_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }
}
