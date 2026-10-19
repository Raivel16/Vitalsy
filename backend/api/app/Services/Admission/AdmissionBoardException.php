<?php

namespace App\Services\Admission;

use RuntimeException;

class AdmissionBoardException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status)
    {
        parent::__construct($message);
    }
}
