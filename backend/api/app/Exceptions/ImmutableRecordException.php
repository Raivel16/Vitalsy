<?php

namespace App\Exceptions;

use RuntimeException;

/** RNF-07: se intentó editar o eliminar un registro de trazabilidad ya confirmado. */
class ImmutableRecordException extends RuntimeException
{
    public static function forAction(string $model, string $action): self
    {
        return new self("El registro de trazabilidad {$model} no admite {$action} una vez confirmado (RNF-07).");
    }
}
