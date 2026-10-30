<?php

namespace App\Support\E2E;

use Illuminate\Console\Command;

/**
 * RNF-18: controla el reloj E2E. Vive fuera de app/Console/Commands para que
 * Laravel no lo descubra solo: únicamente lo registra E2EClockServiceProvider.
 */
class E2EClockCommand extends Command
{
    protected $signature = 'e2e:clock
        {action : advance|set|reset|show}
        {--minutes=0 : Minutos a adelantar (advance)}
        {--at= : Instante ISO-8601 UTC (set)}';

    protected $description = 'Desplaza el reloj del entorno E2E (solo APP_ENV=e2e con E2E_CLOCK_ENABLED=true)';

    public function handle(): int
    {
        if (! E2EClock::isActive($this->laravel)) {
            $this->error('El reloj E2E solo está disponible con APP_ENV=e2e y E2E_CLOCK_ENABLED=true.');

            return self::FAILURE;
        }

        $error = $this->applyAction((string) $this->argument('action'));
        if ($error !== null) {
            $this->error($error);

            return self::FAILURE;
        }

        $this->line('Reloj E2E: '.E2EClock::nowIso());

        return self::SUCCESS;
    }

    /** Aplica la acción pedida; devuelve el mensaje de error o null si salió bien. */
    private function applyAction(string $action): ?string
    {
        return match ($action) {
            'advance' => $this->advance(),
            'set' => $this->setInstant(),
            'reset' => $this->resetClock(),
            'show' => null,
            default => 'Acción no válida: use advance, set, reset o show.',
        };
    }

    private function advance(): ?string
    {
        E2EClock::setOffsetSeconds(E2EClock::offsetSeconds() + 60 * (int) $this->option('minutes'));

        return null;
    }

    private function setInstant(): ?string
    {
        $at = strtotime((string) $this->option('at'));
        if ($at === false) {
            return 'Indique --at con un instante ISO-8601 válido.';
        }
        E2EClock::setOffsetSeconds($at - time());

        return null;
    }

    private function resetClock(): ?string
    {
        E2EClock::reset();

        return null;
    }
}
