<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bed_requests', function (Blueprint $table) {
            $table->string('patient_name')->nullable()->after('encounter_id');
            $table->string('specialty')->nullable()->after('priority');
            $table->string('gender')->nullable()->after('specialty');
            $table->boolean('isolation')->default(false)->after('gender');
        });
    }

    public function down(): void
    {
        Schema::table('bed_requests', function (Blueprint $table) {
            $table->dropColumn(['patient_name', 'specialty', 'gender', 'isolation']);
        });
    }
};
