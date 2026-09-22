<?php

namespace App\Providers;

use App\Services\Interoperability\LisClient;
use App\Services\Interoperability\StubLisClient;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(LisClient::class, StubLisClient::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
