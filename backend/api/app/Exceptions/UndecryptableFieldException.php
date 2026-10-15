<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Un campo cifrado no se pudo descifrar (clave APP_KEY incorrecta o dato corrupto).
 * Se lanza en lectura para evitar que el flujo reescriba el valor con un valor vacío.
 * El mensaje no incluye material de clave ni texto cifrado.
 */
class UndecryptableFieldException extends RuntimeException
{
    public static function make(): self
    {
        return new self(
            'No se pudo descifrar un campo clínico almacenado. Verifique que APP_KEY (o APP_PREVIOUS_KEYS) '
            .'corresponda a la clave con la que se cifraron los datos.'
        );
    }
}
