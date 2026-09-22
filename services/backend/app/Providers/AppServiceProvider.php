<?php

namespace App\Providers;

use App\Services\Interoperability\LisClient;
use App\Services\Interoperability\PacsClient;
use App\Services\Interoperability\StubLisClient;
use App\Services\Interoperability\StubPacsClient;
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
        //
    }
}
