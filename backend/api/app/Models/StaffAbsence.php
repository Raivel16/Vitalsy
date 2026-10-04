<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffAbsence extends Model
{
    protected $fillable = [
        'user_id',
        'shift_date',
        'reason',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'shift_date' => 'date',
        ];
    }
}
