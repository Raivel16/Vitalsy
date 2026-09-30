<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Regla clínica u operativa incumplida. Se responde como 422 con el mensaje en
 * español, igual que las validaciones de formulario.
 */
class ClinicalRuleException extends HttpException
{
    public function __construct(string $message)
    {
        parent::__construct(422, $message);
    }
}
