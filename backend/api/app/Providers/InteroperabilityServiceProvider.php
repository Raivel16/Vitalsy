<?php

namespace App\Providers;

use App\Services\Interoperability\FhirLisClient;
use App\Services\Interoperability\FhirPacsClient;
use App\Services\Interoperability\InteropMetrics;
use App\Services\Interoperability\LisClient;
use App\Services\Interoperability\PacsClient;
use App\Services\Interoperability\StubLisClient;
use App\Services\Interoperability\StubPacsClient;
use Illuminate\Support\ServiceProvider;

/** RNF-17: INTEROP_DRIVER=stub (defecto) | fhir. Falla al resolver si falta la URL base. */
class InteroperabilityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(InteropMetrics::class);

        $fhir = fn () => (config('interop.driver') === 'fhir');

        $this->app->bind(LisClient::class, fn ($app) => $fhir()
            ? new FhirLisClient($app->make(InteropMetrics::class), (array) config('interop.fhir'))
            : $app->make(StubLisClient::class));
        $this->app->bind(PacsClient::class, fn ($app) => $fhir()
            ? new FhirPacsClient($app->make(InteropMetrics::class), (array) config('interop.fhir'))
            : $app->make(StubPacsClient::class));
    }
}
