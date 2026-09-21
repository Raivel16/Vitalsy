<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicalAlert extends Model
{
    protected $fillable = [
        'encounter_id',
        'source',
        'severity',
        'news2_total',
        'message',
        'status',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
        ];
    }

    public function acknowledgements(): HasMany
    {
        return $this->hasMany(AlertAcknowledgement::class, 'alert_id');
    }

    public function escalations(): HasMany
    {
        return $this->hasMany(AlertEscalation::class, 'alert_id');
    }
}
