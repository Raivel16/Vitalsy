<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use Illuminate\Database\Eloquent\Model;

class AmbulatoryPrescription extends Model
{
    protected $fillable = [
        'encounter_id',
        'content',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'content' => EncryptedArray::class,
            'issued_at' => 'datetime',
        ];
    }
}
