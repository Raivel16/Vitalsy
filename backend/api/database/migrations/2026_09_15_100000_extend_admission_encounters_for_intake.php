<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admission_encounters', function (Blueprint $table) {
            $table->string('source')->default('demo')->after('order_number');
            $table->json('clinical_payload')->nullable()->after('deliverables');
        });
    }

    public function down(): void
    {
        Schema::table('admission_encounters', function (Blueprint $table) {
            $table->dropColumn(['source', 'clinical_payload']);
        });
    }
};
