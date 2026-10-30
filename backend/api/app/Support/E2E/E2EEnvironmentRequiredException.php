<?php

namespace App\Support\E2E;

use RuntimeException;

/**
 * RNF-18: se intentó usar una herramienta E2E fuera de APP_ENV=e2e.
 */
class E2EEnvironmentRequiredException extends RuntimeException {}
