<?php

namespace App\Models;

use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientAllergy extends Model
{
    protected $fillable = [
        'patient_id',
        'substance',
        'notes',
        'is_optional',
    ];

    protected function casts(): array
    {
        return [
            'notes' => EncryptedText::class,
            'substance' => EncryptedText::class,
            'is_optional' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
