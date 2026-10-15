<?php

namespace App\Models;

use App\Models\Concerns\Immutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertEscalation extends Model
{
    use Immutable;

    protected $fillable = [
        'alert_id',
        'to_role',
        'reason',
        'escalated_at',
    ];

    protected function casts(): array
    {
        return [
            'escalated_at' => 'datetime',
        ];
    }

    public function alert(): BelongsTo
    {
        return $this->belongsTo(ClinicalAlert::class, 'alert_id');
    }
}
