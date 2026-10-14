<?php

namespace App\Models;

use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;

class SocialAssessment extends Model
{
    protected $fillable = [
        'encounter_id',
        'report',
        'validated',
        'assessed_by',
    ];

    protected function casts(): array
    {
        return [
            'report' => EncryptedText::class,
            'validated' => 'boolean',
        ];
    }
}
