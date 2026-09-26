<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicalAlert extends Model
{
    public const STATUS_OPEN = 'abierta';

    public const STATUS_IN_PROGRESS = 'en_atencion';

    public const STATUS_SUPERVISOR = 'escalada_supervisora';

    public const STATUS_DOCTOR_NOTIFIED = 'medico_notificado';

    public const STATUS_DOCTOR_IN_PROGRESS = 'medico_en_atencion';

    public const STATUS_RRT_REQUESTED = 'err_solicitado';

    public const STATUS_RRT_ESCALATED = 'escalada_err';

    public const STATUS_CLOSED = 'cerrada';

    protected $fillable = [
        'encounter_id',
        'source',
        'severity',
        'news2_total',
        'message',
        'status',
        'assigned_role',
        'assigned_user_id',
        'created_by',
        'generated_at',
        'acknowledge_due_at',
        'medical_notified_at',
        'medical_due_at',
        'closed_at',
        'closure_note',
    ];

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
            'acknowledge_due_at' => 'datetime',
            'medical_notified_at' => 'datetime',
            'medical_due_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }

    public function acknowledgements(): HasMany
    {
        return $this->hasMany(AlertAcknowledgement::class, 'alert_id');
    }

    public function escalations(): HasMany
    {
        return $this->hasMany(AlertEscalation::class, 'alert_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AlertEvent::class, 'alert_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
}
