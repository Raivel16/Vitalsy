<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cleaning_orders', function (Blueprint $table) {
            $table->json('checklist')->nullable()->after('status');
            $table->foreignId('disinfected_by')->nullable()->after('completed_at')->constrained('users')->nullOnDelete();
            $table->timestamp('equipped_at')->nullable()->after('disinfected_by');
            $table->foreignId('equipped_by')->nullable()->after('equipped_at')->constrained('users')->nullOnDelete();
            $table->timestamp('enabled_at')->nullable()->after('equipped_by');
            $table->foreignId('enabled_by')->nullable()->after('enabled_at')->constrained('users')->nullOnDelete();
        });

        // El chequeo de equipamiento queda ligado a la orden que lo originó (sin FK, como el resto de tablas clínicas).
        Schema::table('bed_readiness_checks', function (Blueprint $table) {
            $table->unsignedBigInteger('cleaning_order_id')->nullable()->index()->after('bed_id');
        });
    }

    public function down(): void
    {
        Schema::table('bed_readiness_checks', function (Blueprint $table) {
            $table->dropColumn('cleaning_order_id');
        });

        Schema::table('cleaning_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('enabled_by');
            $table->dropConstrainedForeignId('equipped_by');
            $table->dropConstrainedForeignId('disinfected_by');
            $table->dropColumn(['enabled_at', 'equipped_at', 'checklist']);
        });
    }
};
