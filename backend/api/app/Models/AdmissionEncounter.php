<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use Illuminate\Database\Eloquent\Model;

class AdmissionEncounter extends Model
{
    protected $fillable = [
        'encounter_id',
        'order_number',
        'source',
        'transfer_order_number',
        'patient_name',
        'document_type',
        'document_number',
        'origin_service',
        'coverage_payer',
        'coverage_status',
        'coverage_plan',
        'room',
        'bed',
        'service',
        'wristband_code',
        'record_id',
        'current_step',
        'waiting_reason',
        'deliverables',
        'clinical_payload',
    ];

    protected function casts(): array
    {
        return [
            'clinical_payload' => EncryptedArray::class,
            'deliverables' => 'array',
        ];
    }
}
