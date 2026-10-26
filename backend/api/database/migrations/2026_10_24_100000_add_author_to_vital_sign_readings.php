<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vital_sign_readings', function (Blueprint $table) {
            // RF-26: quién registró la lectura. Las lecturas anteriores quedan sin autor.
            $table->foreignId('author_user_id')->nullable()->after('encounter_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vital_sign_readings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('author_user_id');
        });
    }
};
