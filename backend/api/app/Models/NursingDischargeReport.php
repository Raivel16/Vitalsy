<?php

namespace App\Models;

use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;

class NursingDischargeReport extends Model
{
    protected $fillable = [
        'encounter_id',
        'instructions',
        'alarm_signs',
        'home_care',
    ];

    protected function casts(): array
    {
        return [
            'alarm_signs' => EncryptedText::class,
            'home_care' => EncryptedText::class,
            'instructions' => EncryptedText::class,
        ];
    }
}
