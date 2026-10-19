<?php

namespace App\Exceptions;

use RuntimeException;

/** Configuracion de interoperabilidad ausente o invalida (p. ej. INTEROP_FHIR_BASE_URL). */
class InteropConfigurationException extends RuntimeException {}
