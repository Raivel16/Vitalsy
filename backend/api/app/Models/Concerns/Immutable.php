<?php

namespace App\Models\Concerns;

use App\Exceptions\ImmutableRecordException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * RNF-07: registros de trazabilidad (historial, acuses, firmas, controles de tiempo)
 * que no admiten edición ni borrado una vez confirmados.
 *
 * Por defecto el registro está congelado desde su creación. Un modelo con estado
 * borrador/confirmado sobrescribe `isImmutableNow()`. Complemento a nivel de BD:
 * triggers de la migración 2026_10_14_100100_add_traceability_immutability_triggers.
 *
 * @mixin Model
 */
trait Immutable
{
    public static function bootImmutable(): void
    {
        static::updating(function (Model $model): void {
            if (! $model->isImmutableNow()) {
                return;
            }
            // `nullOnDelete`: una FK solo puede pasar a NULL cuando la fila referenciada ya no existe.
            $changed = array_keys($model->getDirty());
            $onlyOrphaned = $changed !== []
                && collect($changed)->every(fn (string $col) => $model->isReferenceGone($col));
            if ($onlyOrphaned) {
                return;
            }
            throw ImmutableRecordException::forAction(class_basename($model), 'edición');
        });

        static::deleting(function (Model $model): void {
            if ($model->isImmutableNow()) {
                throw ImmutableRecordException::forAction(class_basename($model), 'eliminación');
            }
        });
    }

    private bool $immutablePersisting = false;

    /** Guardado de una instancia (ya validado por los hooks), distinto de una mutación masiva. */
    public function isPersistingInstance(): bool
    {
        return $this->immutablePersisting;
    }

    protected function performUpdate(Builder $query)
    {
        $this->immutablePersisting = true;
        try {
            return parent::performUpdate($query);
        } finally {
            $this->immutablePersisting = false;
        }
    }

    protected function performDeleteOnModel()
    {
        $this->immutablePersisting = true;
        try {
            return parent::performDeleteOnModel();
        } finally {
            $this->immutablePersisting = false;
        }
    }

    /** ¿El registro (según su estado original en BD) ya no admite cambios? */
    public function isImmutableNow(): bool
    {
        return true;
    }

    /**
     * Columnas FK que la BD puede poner en NULL por `nullOnDelete` => tabla referenciada.
     *
     * @return array<string, string>
     */
    public function immutableNullableColumns(): array
    {
        return [];
    }

    /** ¿La columna pasa a NULL y su referencia original ya no existe (efecto de nullOnDelete)? */
    public function isReferenceGone(string $column): bool
    {
        $tables = $this->immutableNullableColumns();
        if (! isset($tables[$column]) || $this->getAttribute($column) !== null) {
            return false;
        }
        $original = $this->getOriginal($column);

        return $original === null || ! DB::table($tables[$column])->where('id', $original)->exists();
    }

    /** Por defecto toda actualización masiva se rechaza; los modelos con excepciones lo sobrescriben recibiendo los valores. */
    public function assertMassUpdateAllowed(): void
    {
        throw ImmutableRecordException::forAction(class_basename($this), 'modificación masiva');
    }

    public function newEloquentBuilder($query): ImmutableEloquentBuilder
    {
        return new ImmutableEloquentBuilder($query);
    }
}
