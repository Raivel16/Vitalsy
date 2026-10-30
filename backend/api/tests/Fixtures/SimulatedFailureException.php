<?php

namespace Tests\Fixtures;

use RuntimeException;

/**
 * Fallo inyectado por las pruebas para comprobar la atomicidad de una operación.
 */
class SimulatedFailureException extends RuntimeException {}
