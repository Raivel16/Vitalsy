<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PharmaDischargeReconciliation extends Model
{
    protected $fillable = [
        'encounter_id',
        'notes',
        'status',
    ];
}
