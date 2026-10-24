<?php

namespace App\Providers;

use App\Support\E2E\E2EClock;
use App\Support\E2E\E2EClockCommand;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Support\ServiceProvider;

/**
 * RNF-18: aplica el reloj E2E a cada petición y comando. Fuera de APP_ENV=e2e
 * con E2E_CLOCK_ENABLED=true no registra nada ni toca la hora.
 */
class E2EClockServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if (! E2EClock::isActive($this->app)) {
            return;
        }

        $this->commands([E2EClockCommand::class]);

        $offset = E2EClock::offsetSeconds();
        if ($offset !== 0) {
            $shifted = Carbon::createFromTimestamp(time() + $offset);
            Carbon::setTestNow($shifted);
            CarbonImmutable::setTestNow($shifted->toImmutable());
        }
    }
}
