<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyPatientAssignment extends Model
{
    protected $fillable = [
        'shift_date',
        'nurse_user_id',
        'encounter_id',
        'news2_weight',
    ];

    protected function casts(): array
    {
        return [
            'shift_date' => 'date',
        ];
    }
}
