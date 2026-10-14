<?php

namespace App\Providers;

use App\Services\Interoperability\LisClient;
use App\Services\Interoperability\PacsClient;
use App\Services\Interoperability\StubLisClient;
use App\Services\Interoperability\StubPacsClient;
use Illuminate\Support\Facades\URL;
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
     *
     * Los listeners de app/Listeners (p. ej. PatientExited) se descubren solos; registrarlos
     * a mano los ejecutaría dos veces.
     */
    public function boot(): void
    {
        // RNF-05: toda URL generada en produccion es https (el proxy termina TLS 1.3).
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
