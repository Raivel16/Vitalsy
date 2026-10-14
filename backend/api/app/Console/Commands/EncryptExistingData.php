<?php

namespace App\Console\Commands;

use App\Support\Security\EncryptedColumns;
use App\Support\Security\FieldCipher;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * RNF-06: cifra los valores en claro que existían antes de activar el cifrado en reposo.
 * Idempotente: un valor que ya descifra con APP_KEY (o APP_PREVIOUS_KEYS) no se vuelve a cifrar.
 */
class EncryptExistingData extends Command
{
    protected $signature = 'vitalsy:encrypt-existing {--dry-run : Solo informa cuántos valores se cifrarían} {--chunk=500 : Filas por bloque/transacción}';

    protected $description = 'Cifra en reposo (AES-256-CBC) los campos clínicos sensibles que aún están en claro';

    public function handle(): int
    {
        if (trim((string) config('app.key')) === '') {
            $this->error('APP_KEY está vacía: se aborta para no cifrar con una clave inválida.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $chunk = max(1, (int) $this->option('chunk'));
        $grand = ['encrypted' => 0, 'already' => 0];

        foreach (EncryptedColumns::map() as $table => $spec) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $columns = array_values(array_filter($spec['columns'], fn (string $c) => Schema::hasColumn($table, $c)));
            if ($columns === []) {
                continue;
            }

            $counts = ['encrypted' => 0, 'already' => 0];

            DB::table($table)->select(array_merge(['id'], $columns))->orderBy('id')
                ->chunkById($chunk, function ($rows) use ($table, $columns, $dryRun, &$counts) {
                    $apply = function () use ($rows, $table, $columns, $dryRun, &$counts) {
                        foreach ($rows as $row) {
                            $changes = [];
                            foreach ($columns as $column) {
                                $value = $row->{$column};
                                if ($value === null || $value === '') {
                                    continue;
                                }
                                $plain = is_string($value) ? $value : (string) $value;
                                if (FieldCipher::isEncrypted($plain)) {
                                    $counts['already']++;

                                    continue;
                                }
                                $changes[$column] = FieldCipher::encrypt($plain);
                                $counts['encrypted']++;
                            }
                            if ($changes !== [] && ! $dryRun) {
                                DB::table($table)->where('id', $row->id)->update($changes);
                            }
                        }
                    };

                    $dryRun ? $apply() : DB::transaction($apply);
                });

            $this->line(sprintf('%-36s cifrados: %d | ya cifrados: %d', $table, $counts['encrypted'], $counts['already']));
            $grand['encrypted'] += $counts['encrypted'];
            $grand['already'] += $counts['already'];
        }

        $this->info(sprintf(
            '%s Valores %s: %d. Ya cifrados: %d.',
            $dryRun ? '[dry-run]' : 'Listo.',
            $dryRun ? 'por cifrar' : 'cifrados',
            $grand['encrypted'],
            $grand['already'],
        ));

        return self::SUCCESS;
    }
}
