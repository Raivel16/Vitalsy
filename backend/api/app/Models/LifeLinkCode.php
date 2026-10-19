<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Código de vinculación VL-XXXX-XXXX: TTL corto, un solo uso, nunca se elimina (se expira). */
class LifeLinkCode extends Model
{
    protected $fillable = ['life_account_id', 'code', 'expires_at', 'consumed_at', 'consumed_encounter_id'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'consumed_at' => 'datetime'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LifeAccount::class, 'life_account_id');
    }

    public function isUsable(): bool
    {
        return $this->consumed_at === null && $this->expires_at !== null && $this->expires_at->isFuture();
    }
}
