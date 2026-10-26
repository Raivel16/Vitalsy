<?php

use App\Providers\AppServiceProvider;
use App\Providers\E2EClockServiceProvider;
use App\Providers\InteroperabilityServiceProvider;

return [
    AppServiceProvider::class,
    E2EClockServiceProvider::class,
    InteroperabilityServiceProvider::class,
];
