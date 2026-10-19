<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * RNF-07: triggers de BD (SQLite y PostgreSQL) que impiden UPDATE/DELETE sobre los
 * registros de trazabilidad, incluso desde SQL crudo o la API de administración.
 * Complementan el trait App\Models\Concerns\Immutable.
 *
 * Reglas:
 *  - alert_events, alert_acknowledgements, alert_escalations,
 *    discharge_indication_receipts: congelados desde su creación.
 *  - medication_administrations: congelada cuando status = 'administrado' (firma digital).
 *  - Excepción referencial: las columnas FK de usuario/ítem pueden pasar a NULL por
 *    `nullOnDelete` (no es una edición de contenido).
 */
return new class extends Migration
{
    private const MESSAGE = 'RNF-07: registro de trazabilidad inmutable';

    /** @var array<string, array{nullable: list<string>, when: string|null}> */
    private function rules(): array
    {
        return [
            'alert_events' => ['nullable' => ['user_id'], 'when' => null],
            'alert_acknowledgements' => ['nullable' => ['user_id'], 'when' => null],
            'alert_escalations' => ['nullable' => [], 'when' => null],
            'discharge_indication_receipts' => ['nullable' => [], 'when' => null],
            'medication_administrations' => ['nullable' => ['nurse_user_id', 'prescription_item_id'], 'when' => "OLD.status = 'administrado'"],
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

        foreach ($this->rules() as $table => $rule) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $columns = array_values(array_filter(
                Schema::getColumnListing($table),
                fn (string $c) => $c !== 'id',
            ));
            $distinct = $driver === 'pgsql' ? 'IS DISTINCT FROM' : 'IS NOT';

            $changes = array_map(function (string $c) use ($rule, $distinct) {
                $expr = "NEW.{$c} {$distinct} OLD.{$c}";

                // Pasar a NULL por nullOnDelete no cuenta como cambio de contenido.
                return in_array($c, $rule['nullable'], true) ? "(NEW.{$c} IS NOT NULL AND {$expr})" : "({$expr})";
            }, $columns);

            $updateWhen = implode(' OR ', $changes);
            if ($rule['when'] !== null) {
                $updateWhen = "{$rule['when']} AND ({$updateWhen})";
            }
            $deleteWhen = $rule['when'] ?? 'TRUE';

            $this->createTrigger($driver, "trg_{$table}_no_update", $table, 'UPDATE', $updateWhen);
            $this->createTrigger($driver, "trg_{$table}_no_delete", $table, 'DELETE', $deleteWhen);
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if (! in_array($driver, ['sqlite', 'pgsql'], true)) {
            return;
        }

        foreach (array_keys($this->rules()) as $table) {
            foreach (['no_update', 'no_delete'] as $kind) {
                DB::unprepared($driver === 'pgsql'
                    ? "DROP TRIGGER IF EXISTS trg_{$table}_{$kind} ON {$table}"
                    : "DROP TRIGGER IF EXISTS trg_{$table}_{$kind}");
            }
        }
        if ($driver === 'pgsql') {
            DB::unprepared('DROP FUNCTION IF EXISTS vitalsy_block_traceability_mutation()');
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

        // SQLite: OLD/NEW solo existen según el evento; en DELETE no hay NEW.
        DB::unprepared("DROP TRIGGER IF EXISTS {$name}");
        DB::unprepared(
            "CREATE TRIGGER {$name} BEFORE {$event} ON {$table} FOR EACH ROW WHEN {$when} "
            .'BEGIN SELECT RAISE(ABORT, \''.self::MESSAGE.'\'); END;'
        );
    }
};
