<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vital_sign_readings', function (Blueprint $table) {
            $table->unsignedSmallInteger('dbp')->nullable()->after('sbp');
        });
    }

    public function down(): void
    {
        Schema::table('vital_sign_readings', function (Blueprint $table) {
            $table->dropColumn('dbp');
        });
    }
};
