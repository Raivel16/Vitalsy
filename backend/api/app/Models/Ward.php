<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ward extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'specialty',
        'active',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function beds(): HasMany
    {
        return $this->hasMany(Bed::class);
    }
}
