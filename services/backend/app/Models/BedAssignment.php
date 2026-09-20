<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BedAssignment extends Model
{
    protected $fillable = [
        'bed_id',
        'encounter_id',
        'assigned_at',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }
}
