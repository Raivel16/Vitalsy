<?php

use App\Support\Security\EncryptedColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RNF-06: el texto cifrado (base64 + MAC) no cabe en string(255) ni es JSON válido
 * para una columna json de PostgreSQL. Las columnas clínicas cifradas pasan a `text`
 * conservando su nulabilidad. Los datos existentes se conservan (conversión a texto);
 * su cifrado lo hace `php artisan vitalsy:encrypt-existing`.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (EncryptedColumns::map() as $table => $spec) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $existing = collect(Schema::getColumns($table))->keyBy('name');

            foreach ($spec['columns'] as $column) {
                $meta = $existing->get($column);
                if ($meta === null || $meta['type_name'] === 'text') {
                    continue;
                }

                $nullable = (bool) $meta['nullable'];
                Schema::table($table, function (Blueprint $t) use ($column, $nullable) {
                    $definition = $t->text($column);
                    if ($nullable) {
                        $definition->nullable();
                    }
                    $definition->change();
                });
            }
        }
    }

    public function down(): void
    {
        // Irreversible a propósito: volver a string/json truncaría o rechazaría texto cifrado.
    }
};
