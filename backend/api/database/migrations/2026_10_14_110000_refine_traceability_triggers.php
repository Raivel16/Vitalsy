<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * RNF-07 (refinamiento de 2026_10_14_100100): recrea los triggers de trazabilidad.
 *  - Una FK solo puede pasar a NULL cuando la fila referenciada YA NO existe (efecto de
 *    nullOnDelete); antes se permitía en cualquier momento y borraba quién firmó/acusó.
 *  - Se añaden medical_evolution_notes y handovers: congeladas cuando `signed_at` no es nulo.
 *
 * Los triggers copian la lista de columnas al momento de la migración: una columna nueva
 * en estas tablas exige una migración nueva que los recree. En SQLite, `->change()` sobre
 * estas tablas reconstruye la tabla y elimina los triggers.
 */
return new class extends Migration
{
    private const MESSAGE = 'RNF-07: registro de trazabilidad inmutable';

    /** @return array<string, array{nullable: array<string, string>, when: string|null}> */
    private function rules(): array
    {
        return [
            'alert_events' => ['nullable' => ['user_id' => 'users'], 'when' => null],
            'alert_acknowledgements' => ['nullable' => ['user_id' => 'users'], 'when' => null],
            'alert_escalations' => ['nullable' => [], 'when' => null],
            'discharge_indication_receipts' => ['nullable' => [], 'when' => null],
            'medication_administrations' => [
                'nullable' => ['nurse_user_id' => 'users', 'prescription_item_id' => 'prescription_items'],
                'when' => "OLD.status = 'administrado'",
            ],
            'medical_evolution_notes' => ['nullable' => ['author_user_id' => 'users'], 'when' => 'OLD.signed_at IS NOT NULL'],
            'handovers' => ['nullable' => [], 'when' => 'OLD.signed_at IS NOT NULL'],
        ];
    }

    public function up(): void
    {
        $driver = DB::connection()->getDriverName();
        if (! in_array($driver, ['sqlite', 'pgsql'], true)) {
            return;
        }

        if ($driver === 'pgsql') {
            DB::unprepared(
                "CREATE OR REPLACE FUNCTION vitalsy_block_traceability_mutation() RETURNS trigger AS \$\$\n"
                ."BEGIN\n  RAISE EXCEPTION '".self::MESSAGE."' USING ERRCODE = 'restrict_violation';\nEND;\n\$\$ LANGUAGE plpgsql;"
            );
        }

        $distinct = $driver === 'pgsql' ? 'IS DISTINCT FROM' : 'IS NOT';

        foreach ($this->rules() as $table => $rule) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $columns = array_values(array_filter(Schema::getColumnListing($table), fn (string $c) => $c !== 'id'));

            $changes = array_map(function (string $c) use ($rule, $distinct) {
                $expr = "NEW.{$c} {$distinct} OLD.{$c}";
                if (isset($rule['nullable'][$c])) {
                    // Permitido solo: pasa a NULL y la fila referenciada ya no existe.
                    $ref = $rule['nullable'][$c];

                    return "({$expr} AND (NEW.{$c} IS NOT NULL OR EXISTS (SELECT 1 FROM {$ref} WHERE id = OLD.{$c})))";
                }

                return "({$expr})";
            }, $columns);

            $updateWhen = implode(' OR ', $changes);
            if ($rule['when'] !== null) {
                $updateWhen = "{$rule['when']} AND ({$updateWhen})";
            }

            $this->createTrigger($driver, "trg_{$table}_no_update", $table, 'UPDATE', $updateWhen);
            $this->createTrigger($driver, "trg_{$table}_no_delete", $table, 'DELETE', $rule['when'] ?? 'TRUE');
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if (! in_array($driver, ['sqlite', 'pgsql'], true)) {
            return;
        }

        foreach (['medical_evolution_notes', 'handovers'] as $table) {
            foreach (['no_update', 'no_delete'] as $kind) {
                DB::unprepared($driver === 'pgsql'
                    ? "DROP TRIGGER IF EXISTS trg_{$table}_{$kind} ON {$table}"
                    : "DROP TRIGGER IF EXISTS trg_{$table}_{$kind}");
            }
        }
    }

    private function createTrigger(string $driver, string $name, string $table, string $event, string $when): void
    {
        if ($driver === 'pgsql') {
            DB::unprepared("DROP TRIGGER IF EXISTS {$name} ON {$table}");
            DB::unprepared(
                "CREATE TRIGGER {$name} BEFORE {$event} ON {$table} FOR EACH ROW WHEN ({$when}) "
                .'EXECUTE FUNCTION vitalsy_block_traceability_mutation()'
            );

            return;
        }

        DB::unprepared("DROP TRIGGER IF EXISTS {$name}");
        DB::unprepared(
            "CREATE TRIGGER {$name} BEFORE {$event} ON {$table} FOR EACH ROW WHEN {$when} "
            .'BEGIN SELECT RAISE(ABORT, \''.self::MESSAGE.'\'); END;'
        );
    }
};
