<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * El sistema externo (LIS/PACS) no respondio o devolvio un error. Se responde 503
 * con mensaje en espanol; render() propio porque el render global enmascara los 5xx.
 */
class InteropUnavailableException extends HttpException
{
    public function __construct(string $message, public readonly string $errorCode = 'interop_unavailable')
    {
        parent::__construct(503, $message);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), 'code' => $this->errorCode], 503);
    }
}
