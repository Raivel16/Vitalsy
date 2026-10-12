<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Consentimiento de compartir datos con el hospital: una fila por cuenta, nunca se elimina. */
class LifeConsent extends Model
{
    protected $fillable = ['life_account_id', 'sharing_enabled', 'revoked_at'];

    protected function casts(): array
    {
        return ['sharing_enabled' => 'boolean', 'revoked_at' => 'datetime'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LifeAccount::class, 'life_account_id');
    }
}
