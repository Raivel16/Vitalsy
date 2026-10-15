<?php

namespace App\Models\Concerns;

use App\Exceptions\ImmutableRecordException;
use Illuminate\Database\Eloquent\Builder;

/** Bloquea mutaciones masivas (query()->update()/delete()) que no disparan eventos de modelo. */
class ImmutableEloquentBuilder extends Builder
{
    public function update(array $values)
    {
        if (! $this->model->isPersistingInstance()) {
            $this->model->assertMassUpdateAllowed($values);
        }

        return parent::update($values);
    }

    public function upsert(array $values, $uniqueBy, $update = null)
    {
        throw ImmutableRecordException::forAction(class_basename($this->model), 'upsert');
    }

    public function delete()
    {
        if ($this->model->isPersistingInstance()) {
            return parent::delete();
        }

        throw ImmutableRecordException::forAction(class_basename($this->model), 'eliminación');
    }

    public function forceDelete()
    {
        throw ImmutableRecordException::forAction(class_basename($this->model), 'eliminación');
    }

    public function increment($column, $amount = 1, array $extra = [])
    {
        throw ImmutableRecordException::forAction(class_basename($this->model), 'modificación');
    }

    public function decrement($column, $amount = 1, array $extra = [])
    {
        throw ImmutableRecordException::forAction(class_basename($this->model), 'modificación');
    }
}
