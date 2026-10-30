<?php

namespace Tests\Feature;

use App\Providers\E2EClockServiceProvider;
use App\Support\E2E\E2EClock;
use App\Support\E2E\E2EClockCommand;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class E2EClockTest extends TestCase
{
    private string $file;

    protected function setUp(): void
    {
        parent::setUp();
        $this->file = sys_get_temp_dir().DIRECTORY_SEPARATOR.'vitalsy-e2e-clock-test.json';
        config(['vitalsy.e2e.clock_file' => $this->file]);
        @unlink($this->file);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(null);
        CarbonImmutable::setTestNow(null);
        @unlink($this->file);
        parent::tearDown();
    }

    private function bootIn(string $environment, bool $flag): void
    {
        $this->app['env'] = $environment;
        config(['vitalsy.e2e.clock_enabled' => $flag]);
        $provider = new E2EClockServiceProvider($this->app);
        $provider->register();
        $provider->boot();
    }

    private function assertNowShiftedBy(int $seconds): void
    {
        $real = (new \DateTimeImmutable('now'))->getTimestamp();
        $this->assertEqualsWithDelta($real + $seconds, now()->getTimestamp(), 5);
        $this->assertEqualsWithDelta($real + $seconds, CarbonImmutable::now()->getTimestamp(), 5);
    }

    public function test_clock_inactive_in_testing_environment(): void
    {
        $this->assertFalse(E2EClock::isActive($this->app));
        $this->assertArrayNotHasKey('e2e:clock', Artisan::all());
    }

    public function test_clock_inactive_in_e2e_without_flag(): void
    {
        E2EClock::setOffsetSeconds(600);

        $this->bootIn('e2e', false);

        $this->assertFalse(E2EClock::isActive($this->app));
        $this->assertNowShiftedBy(0);
    }

    public function test_clock_inactive_in_production_even_with_flag_and_file(): void
    {
        E2EClock::setOffsetSeconds(600);

        $this->bootIn('production', true);

        $this->assertFalse(E2EClock::isActive($this->app));
        $this->assertNowShiftedBy(0);
    }

    public function test_clock_shifts_now_in_e2e_with_flag(): void
    {
        E2EClock::setOffsetSeconds(600);

        $this->bootIn('e2e', true);

        $this->assertTrue(E2EClock::isActive($this->app));
        $this->assertNowShiftedBy(600);
    }

    public function test_command_refuses_outside_e2e(): void
    {
        $this->app[Kernel::class]->registerCommand($this->app->make(E2EClockCommand::class));

        $this->artisan('e2e:clock', ['action' => 'advance', '--minutes' => 6])->assertFailed();
        $this->assertSame(0, E2EClock::offsetSeconds());
    }

    public function test_command_advance_set_reset(): void
    {
        $this->bootIn('e2e', true);
        $this->app[Kernel::class]->registerCommand($this->app->make(E2EClockCommand::class));

        $this->artisan('e2e:clock', ['action' => 'advance', '--minutes' => 6])
            ->expectsOutputToContain('Reloj E2E: ')
            ->assertSuccessful();
        $this->assertSame(360, E2EClock::offsetSeconds());

        $target = (new \DateTimeImmutable('now'))->modify('+2 hours');
        $this->artisan('e2e:clock', ['action' => 'set', '--at' => $target->format(DATE_ATOM)])->assertSuccessful();
        $this->assertEqualsWithDelta(7200, E2EClock::offsetSeconds(), 5);

        $this->artisan('e2e:clock', ['action' => 'reset'])->assertSuccessful();
        $this->assertFileDoesNotExist($this->file);
    }

    public function test_command_rejects_invalid_action_and_invalid_instant(): void
    {
        $this->bootIn('e2e', true);
        $this->app[Kernel::class]->registerCommand($this->app->make(E2EClockCommand::class));

        $this->artisan('e2e:clock', ['action' => 'rewind'])
            ->expectsOutputToContain('Acción no válida')
            ->assertFailed();
        $this->artisan('e2e:clock', ['action' => 'set', '--at' => 'no es una fecha'])
            ->expectsOutputToContain('instante ISO-8601 válido')
            ->assertFailed();
        $this->assertSame(0, E2EClock::offsetSeconds());
    }

    public function test_command_show_does_not_move_the_clock(): void
    {
        $this->bootIn('e2e', true);
        $this->app[Kernel::class]->registerCommand($this->app->make(E2EClockCommand::class));

        $this->artisan('e2e:clock', ['action' => 'show'])
            ->expectsOutputToContain('Reloj E2E: ')
            ->assertSuccessful();
        $this->assertSame(0, E2EClock::offsetSeconds());
    }
}
