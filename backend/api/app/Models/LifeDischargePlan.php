<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Plan de seguimiento al alta emitido para Vitalsy Life (RF-96, RF-97, RF-98). */
class LifeDischargePlan extends Model
{
    protected $fillable = [
        'encounter_id', 'mode', 'code', 'invitation_code', 'payload', 'valid_until', 'status',
        'claimed_by_account_id', 'claimed_at', 'custody_transferred_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'valid_until' => 'date',
            'claimed_at' => 'datetime',
            'custody_transferred_at' => 'datetime',
        ];
    }
}
