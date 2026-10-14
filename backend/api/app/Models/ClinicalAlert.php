<?php

namespace App\Models;

use App\Casts\EncryptedText;
use App\Observers\ClinicalAlertObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[ObservedBy(ClinicalAlertObserver::class)]
class ClinicalAlert extends Model
{
    public const STATUS_OPEN = 'abierta';

    public const STATUS_IN_PROGRESS = 'en_atencion';

    public const STATUS_SUPERVISOR = 'escalada_supervisora';

    public const STATUS_DOCTOR_NOTIFIED = 'medico_notificado';

    public const STATUS_DOCTOR_IN_PROGRESS = 'medico_en_atencion';

    public const STATUS_RRT_REQUESTED = 'err_solicitado';

    public const STATUS_RRT_ESCALATED = 'escalada_err';

    public const STATUS_ICU_ORDERED = 'orden_uci';

    public const STATUS_ICU_AUTHORIZED = 'uci_autorizada';

    public const STATUS_IN_ICU = 'en_uci';

    public const STATUS_CLOSED = 'cerrada';

    protected $fillable = [
        'encounter_id',
        'source',
        'compliance_key',
        'severity',
        'news2_total',
        'message',
        'status',
        'assigned_role',
        'assigned_user_id',
        'created_by',
        'generated_at',
        'acknowledge_due_at',
        'follow_up_due_at',
        'reassessed_at',
        'icu_ordered_at',
        'icu_doctor_authorized_at',
        'icu_doctor_authorized_by',
        'icu_nurse_authorized_at',
        'icu_nurse_authorized_by',
        'icu_transferred_at',
        'icu_returned_at',
        'icu_previous_room',
        'icu_previous_bed',
        'icu_previous_service',
        'medical_notified_at',
        'medical_due_at',
        'closed_at',
        'closure_note',
    ];

    protected function casts(): array
    {
        return [
            'closure_note' => EncryptedText::class,
            'message' => EncryptedText::class,
            'generated_at' => 'datetime',
            'acknowledge_due_at' => 'datetime',
            'follow_up_due_at' => 'datetime',
            'reassessed_at' => 'datetime',
            'icu_ordered_at' => 'datetime',
            'icu_doctor_authorized_at' => 'datetime',
            'icu_nurse_authorized_at' => 'datetime',
            'icu_transferred_at' => 'datetime',
            'icu_returned_at' => 'datetime',
            'medical_notified_at' => 'datetime',
            'medical_due_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }

    public function icuFullyAuthorized(): bool
    {
        return $this->icu_doctor_authorized_at !== null && $this->icu_nurse_authorized_at !== null;
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
