<?php

namespace App\Models;

use App\Exceptions\ImmutableRecordException;
use App\Models\Concerns\Immutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicationAdministration extends Model
{
    use Immutable;

    protected $fillable = [
        'encounter_id',
        'prescription_item_id',
        'scheduled_at',
        'administered_at',
        'status',
        'nurse_user_id',
        'barcode_ok',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'administered_at' => 'datetime',
            'barcode_ok' => 'boolean',
        ];
    }

    /**
     * RNF-07: la dosis es editable mientras no esté firmada (pendiente/cancelado);
     * una vez `administrado` (firma digital) queda congelada.
     */
    public function isImmutableNow(): bool
    {
        return $this->getOriginal('status') === 'administrado';
    }

    public function immutableNullableColumns(): array
    {
        return ['nurse_user_id' => 'users', 'prescription_item_id' => 'prescription_items'];
    }

    /** Solo se admite la cancelación masiva de dosis pendientes (el trigger protege las firmadas). */
    public function assertMassUpdateAllowed(array $values = []): void
    {
        if (array_keys($values) === ['status'] && $values['status'] === 'cancelado') {
            return;
        }

        throw ImmutableRecordException::forAction('MedicationAdministration', 'modificación masiva');
    }

    public function prescriptionItem(): BelongsTo
    {
        return $this->belongsTo(PrescriptionItem::class);
    }

    public function nurse(): BelongsTo
    {
        return $this->belongsTo(User::class, 'nurse_user_id');
    }
}
