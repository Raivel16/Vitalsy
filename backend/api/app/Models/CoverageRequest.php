<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoverageRequest extends Model
{
    protected $fillable = [
        'absence_id',
        'status',
        'approved_by',
        'authorized_by_hr',
    ];
}
