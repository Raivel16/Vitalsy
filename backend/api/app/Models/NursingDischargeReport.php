<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NursingDischargeReport extends Model
{
    protected $fillable = [
        'encounter_id',
        'instructions',
        'alarm_signs',
        'home_care',
    ];
}
