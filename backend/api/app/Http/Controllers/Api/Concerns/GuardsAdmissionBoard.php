<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Services\Admission\AdmissionBoardException;
use Illuminate\Http\JsonResponse;

/** Convierte las excepciones de reglas del tablero de admisión en respuestas JSON con su estado HTTP. */
trait GuardsAdmissionBoard
{
    private function guard(callable $action): JsonResponse
    {
        try {
            return $action();
        } catch (AdmissionBoardException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->status);
        }
    }
}
