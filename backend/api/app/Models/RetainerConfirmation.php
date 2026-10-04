<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RetainerConfirmation extends Model
{
    protected $fillable = [
        'coverage_request_id',
        'user_id',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
        ];
    }
}
