<?php

namespace App\Models;

use App\Models\Concerns\Immutable;
use Illuminate\Database\Eloquent\Model;

class DischargeIndicationReceipt extends Model
{
    use Immutable;

    protected $fillable = [
        'encounter_id',
        'received_by_name',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
        ];
    }
}
