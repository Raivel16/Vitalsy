<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Línea de base importada de Vitalsy Life a un ingreso: inmutable, un solo registro por ingreso. */
class LifeBaselineImport extends Model
{
    protected $fillable = ['encounter_id', 'life_account_id', 'baseline', 'imported_by', 'imported_at'];

    protected function casts(): array
    {
        return ['baseline' => 'array', 'imported_at' => 'datetime'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LifeAccount::class, 'life_account_id');
    }

    /**
     * Forma pública sin datos del ciudadano: {importedAt, metrics}.
     *
     * @return array{importedAt: string|null, metrics: array<int, array<string, mixed>>}|null
     */
    public static function presentFor(string $encounterId): ?array
    {
        $import = static::query()->where('encounter_id', $encounterId)->orderBy('id')->first();
        if (! $import) {
            return null;
        }

        return [
            'importedAt' => $import->imported_at?->toIso8601String(),
            'metrics' => $import->baseline ?? [],
        ];
    }
}
