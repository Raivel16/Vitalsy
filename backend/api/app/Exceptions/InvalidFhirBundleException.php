<?php

namespace App\Exceptions;

use RuntimeException;

/** La respuesta del servidor FHIR no es un Bundle valido. */
class InvalidFhirBundleException extends RuntimeException {}
