<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// RF-45 y RF-48: el escalamiento depende de vencimientos por minuto.
Schedule::command('alerts:process-slas')->everyMinute()->withoutOverlapping();

// RF-32: las dosis se crean con 24 horas de adelanto, así que basta revisar cada hora.
Schedule::command('emar:extend-doses')->hourly()->withoutOverlapping();
