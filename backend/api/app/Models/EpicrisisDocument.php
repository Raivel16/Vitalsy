<?php

namespace App\Models;

use App\Casts\EncryptedText;
use Illuminate\Database\Eloquent\Model;

class EpicrisisDocument extends Model
{
    protected $fillable = [
        'encounter_id',
        'diagnoses',
        'procedures',
        'evolution',
        'authored_by',
    ];

    protected function casts(): array
    {
        return [
            'diagnoses' => EncryptedText::class,
            'evolution' => EncryptedText::class,
            'procedures' => EncryptedText::class,
        ];
    }
}
