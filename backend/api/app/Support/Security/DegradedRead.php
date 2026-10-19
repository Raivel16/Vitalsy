<?php

namespace App\Support\Security;

use Illuminate\Http\JsonResponse;

/**
 * Lecturas de listado/tablero: un campo ilegible no tumba la respuesta completa. El valor
 * ilegible se presenta como no disponible y la respuesta incluye `decryptError: true` y
 * `decryptErrors` (tabla, columna, id; nunca valores). Las escrituras y el detalle de un
 * solo registro siguen lanzando UndecryptableFieldException.
 */
final class DegradedRead
{
    /**
     * @param  callable(): array<string, mixed>  $producer
     */
    public static function json(callable $producer, int $status = 200): JsonResponse
    {
        [$data, $errors] = FieldCipher::degrading($producer);

        if ($errors !== []) {
            $data['decryptError'] = true;
            $data['decryptErrors'] = $errors;
        }

        return response()->json($data, $status);
    }
}
