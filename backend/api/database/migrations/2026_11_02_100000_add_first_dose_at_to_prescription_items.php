<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            // RF-25: ancla del horario. Las indicaciones anteriores quedan sin ella y siguen desde su última dosis.
            $table->timestamp('first_dose_at')->nullable()->after('frequency');
        });
    }

    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->dropColumn('first_dose_at');
        });
    }
};
