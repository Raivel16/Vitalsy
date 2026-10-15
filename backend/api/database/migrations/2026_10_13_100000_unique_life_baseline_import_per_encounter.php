<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** RF-95: una sola línea de base importada por ingreso, garantizada por la base de datos. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('life_baseline_imports', function (Blueprint $t) {
            $t->dropIndex(['encounter_id']);
        });
        Schema::table('life_baseline_imports', function (Blueprint $t) {
            $t->unique('encounter_id');
        });
    }

    public function down(): void
    {
        Schema::table('life_baseline_imports', function (Blueprint $t) {
            $t->dropUnique(['encounter_id']);
        });
        Schema::table('life_baseline_imports', function (Blueprint $t) {
            $t->index('encounter_id');
        });
    }
};
