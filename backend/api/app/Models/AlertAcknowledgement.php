<?php

namespace App\Models;

use App\Models\Concerns\Immutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertAcknowledgement extends Model
{
    use Immutable;

    protected $fillable = [
        'alert_id',
        'user_id',
        'role',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
        ];
    }

    public function immutableNullableColumns(): array
    {
        return ['user_id' => 'users'];
    }

    public function alert(): BelongsTo
    {
        return $this->belongsTo(ClinicalAlert::class, 'alert_id');
    }
}
