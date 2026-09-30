<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinical_alerts', function (Blueprint $table) {
            $table->timestamp('follow_up_due_at')->nullable()->after('acknowledge_due_at');
            $table->timestamp('reassessed_at')->nullable()->after('follow_up_due_at');
        });
    }

    public function down(): void
    {
        Schema::table('clinical_alerts', function (Blueprint $table) {
            $table->dropColumn(['follow_up_due_at', 'reassessed_at']);
        });
    }
};
