<?php

namespace App\Services\Life;

use RuntimeException;

/** El lote completo supera los topes agregados de muestras (RF-89). */
class LifeSyncLimitExceeded extends RuntimeException {}
