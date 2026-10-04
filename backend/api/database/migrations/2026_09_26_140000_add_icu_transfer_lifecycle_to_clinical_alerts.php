<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinical_alerts', function (Blueprint $table) {
            $table->timestamp('icu_ordered_at')->nullable()->after('reassessed_at');
            $table->timestamp('icu_doctor_authorized_at')->nullable()->after('icu_ordered_at');
            $table->foreignId('icu_doctor_authorized_by')->nullable()->after('icu_doctor_authorized_at')->constrained('users')->nullOnDelete();
            $table->timestamp('icu_nurse_authorized_at')->nullable()->after('icu_doctor_authorized_by');
            $table->foreignId('icu_nurse_authorized_by')->nullable()->after('icu_nurse_authorized_at')->constrained('users')->nullOnDelete();
            $table->timestamp('icu_transferred_at')->nullable()->after('icu_nurse_authorized_by');
            $table->timestamp('icu_returned_at')->nullable()->after('icu_transferred_at');
            $table->string('icu_previous_room')->nullable()->after('icu_returned_at');
            $table->string('icu_previous_bed')->nullable()->after('icu_previous_room');
            $table->string('icu_previous_service')->nullable()->after('icu_previous_bed');
        });
    }

    public function down(): void
    {
        Schema::table('clinical_alerts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('icu_doctor_authorized_by');
            $table->dropConstrainedForeignId('icu_nurse_authorized_by');
            $table->dropColumn([
                'icu_ordered_at',
                'icu_doctor_authorized_at',
                'icu_nurse_authorized_at',
                'icu_transferred_at',
                'icu_returned_at',
                'icu_previous_room',
                'icu_previous_bed',
                'icu_previous_service',
            ]);
        });
    }
};
