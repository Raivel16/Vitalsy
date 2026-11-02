<?php

namespace App\Models;

use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionItem extends Model
{
    protected $fillable = [
        'prescription_id',
        'drug_name',
        'dose',
        'route',
        'frequency',
        'first_dose_at',
    ];

    protected function casts(): array
    {
        return [
            'dose' => EncryptedText::class,
            'drug_name' => EncryptedText::class,
            'first_dose_at' => 'datetime',
            'frequency' => EncryptedText::class,
            'route' => EncryptedText::class,
        ];
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }
}
