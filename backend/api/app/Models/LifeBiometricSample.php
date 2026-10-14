<?php

namespace App\Models;

use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Muestra biométrica enviada por Vitalsy Life; única por (cuenta, client_id). */
class LifeBiometricSample extends Model
{
    protected $fillable = [
        'life_account_id', 'client_id', 'kind', 'value', 'unit', 'started_at', 'ended_at', 'origin',
    ];

    protected function casts(): array
    {
        return [
            'value' => EncryptedFloat::class, 'started_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LifeAccount::class, 'life_account_id');
    }
}
