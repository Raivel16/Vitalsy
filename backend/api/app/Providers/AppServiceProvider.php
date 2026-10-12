<?php

namespace App\Providers;

use App\Events\PatientExited;
use App\Listeners\ActivateLifePlanOnExit;
use App\Listeners\DispatchCleaningOnPatientExit;
use App\Services\Interoperability\LisClient;
use App\Services\Interoperability\PacsClient;
use App\Services\Interoperability\StubLisClient;
use App\Services\Interoperability\StubPacsClient;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(LisClient::class, StubLisClient::class);
        $this->app->bind(PacsClient::class, StubPacsClient::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(PatientExited::class, DispatchCleaningOnPatientExit::class);
        Event::listen(PatientExited::class, ActivateLifePlanOnExit::class);
    }
}
