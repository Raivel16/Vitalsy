<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Bitácora de cambios del catálogo de pabellones y camas (RF-112). */
class BedInfrastructureChange extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'action', 'subject_type', 'subject_id', 'details'];

    protected function casts(): array
    {
        return ['details' => 'array'];
    }
}
