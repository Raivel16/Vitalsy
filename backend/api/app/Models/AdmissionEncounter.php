<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Exceptions\UndecryptableFieldException;
use App\Support\Security\FieldCipher;
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

    /**
     * RNF-06: el payload clinico almacenado no se puede descifrar. En lectura degradada el cast
     * devuelve null, que NO debe interpretarse como "sin alergias / sin medicacion".
     */
    public function payloadUnreadable(): bool
    {
        $raw = $this->getRawOriginal('clinical_payload');

        if (! is_string($raw) || FieldCipher::state($raw) !== FieldCipher::UNDECRYPTABLE) {
            return false;
        }

        // Registra el error en la lectura degradada (decryptErrors); fuera de ella lanza.
        $this->clinical_payload;

        return true;
    }

    /**
     * Payload legible para consumidores clinicos; lanza si es ilegible (nunca [] silencioso).
     *
     * @return array<string, mixed>
     */
    public function readablePayload(): array
    {
        if ($this->payloadUnreadable()) {
            throw UndecryptableFieldException::make();
        }

        return $this->clinical_payload ?? [];
    }
}
