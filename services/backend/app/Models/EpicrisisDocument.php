<?php

namespace App\Models;

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
}
