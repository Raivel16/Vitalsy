<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// RF-40 y RF-43: el escalamiento depende de vencimientos por minuto.
Schedule::command('alerts:process-slas')->everyMinute()->withoutOverlapping();
