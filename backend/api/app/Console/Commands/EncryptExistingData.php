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
 * Un valor con forma de payload cifrado que NO descifra (clave incorrecta) no se toca: se
 * informa (solo tabla, columna e id) y el comando termina con error.
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
        $grand = ['encrypted' => 0, 'already' => 0, 'undecryptable' => 0];

        foreach (EncryptedColumns::map() as $table => $spec) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $columns = array_values(array_filter($spec['columns'], fn (string $c) => Schema::hasColumn($table, $c)));
            if ($columns === []) {
                continue;
            }

            $counts = ['encrypted' => 0, 'already' => 0, 'undecryptable' => 0];

            DB::table($table)->select(array_merge(['id'], $columns))->orderBy('id')
                ->chunkById($chunk, function ($rows) use ($table, $columns, $dryRun, &$counts) {
                    $apply = function () use ($rows, $table, $columns, $dryRun): array {
                        $local = ['encrypted' => 0, 'already' => 0, 'undecryptable' => 0, 'bad' => []];
                        foreach ($rows as $row) {
                            $changes = [];
                            foreach ($columns as $column) {
                                $value = $row->{$column};
                                if ($value === null || $value === '') {
                                    continue;
                                }
                                $plain = (string) $value;
                                $state = FieldCipher::state($plain);
                                if ($state === FieldCipher::ENCRYPTED) {
                                    $local['already']++;
                                } elseif ($state === FieldCipher::UNDECRYPTABLE) {
                                    $local['undecryptable']++;
                                    $local['bad'][] = "{$table}.{$column} id={$row->id}";
                                } else {
                                    $changes[$column] = FieldCipher::encrypt($plain);
                                    $local['encrypted']++;
                                }
                            }
                            if ($changes !== [] && ! $dryRun) {
                                DB::table($table)->where('id', $row->id)->update($changes);
                            }
                        }

                        return $local;
                    };

                    // Los contadores se suman solo cuando el bloque se confirmó.
                    $local = $dryRun ? $apply() : DB::transaction($apply);
                    foreach (['encrypted', 'already', 'undecryptable'] as $k) {
                        $counts[$k] += $local[$k];
                    }
                    foreach ($local['bad'] as $ref) {
                        $this->warn("  no descifrable: {$ref}");
                    }
                });

            $this->line(sprintf(
                '%-36s cifrados: %d | ya cifrados: %d | no descifrables: %d',
                $table, $counts['encrypted'], $counts['already'], $counts['undecryptable'],
            ));
            foreach ($grand as $k => $_) {
                $grand[$k] += $counts[$k];
            }
        }

        $this->info(sprintf(
            '%s Valores %s: %d. Ya cifrados: %d. No descifrables: %d.',
            $dryRun ? '[dry-run]' : 'Listo.',
            $dryRun ? 'por cifrar' : 'cifrados',
            $grand['encrypted'],
            $grand['already'],
            $grand['undecryptable'],
        ));

        if ($grand['undecryptable'] > 0) {
            $this->error(sprintf(
                'ADVERTENCIA: %d valores parecen cifrados pero no descifran con la clave actual: posible APP_KEY incorrecta. No se modificaron.',
                $grand['undecryptable'],
            ));

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
