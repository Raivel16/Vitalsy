<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Evento del historial de una alerta. RNF-07 exige trazabilidad inmutable:
 * una vez registrado, el evento no admite edición ni borrado.
 */
class AlertEvent extends Model
{
    protected $fillable = [
        'alert_id',
        'type',
        'role',
        'user_id',
        'detail',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new \RuntimeException('El historial de alertas no admite modificaciones.');
        });

        static::deleting(function (): never {
            throw new \RuntimeException('El historial de alertas no admite eliminaciones.');
        });
    }

    public function alert(): BelongsTo
    {
        return $this->belongsTo(ClinicalAlert::class, 'alert_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
