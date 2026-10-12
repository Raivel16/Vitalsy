<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Regla clínica u operativa incumplida. Se responde como 422 con el mensaje en
 * español, igual que las validaciones de formulario. Opcionalmente lleva un
 * `code` legible por máquina que se expone en el JSON.
 */
class ClinicalRuleException extends HttpException
{
    public function __construct(string $message, public readonly ?string $errorCode = null)
    {
        parent::__construct(422, $message);
    }
}
