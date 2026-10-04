<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinical_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('source');
            $table->string('severity');
            $table->unsignedTinyInteger('news2_total')->nullable();
            $table->text('message');
            $table->string('status');
            $table->timestamp('generated_at');
            $table->timestamps();
        });

        Schema::create('alert_acknowledgements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alert_id')->constrained('clinical_alerts')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('role');
            $table->timestamp('acknowledged_at');
            $table->timestamps();
        });

        Schema::create('alert_escalations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alert_id')->constrained('clinical_alerts')->cascadeOnDelete();
            $table->string('to_role');
            $table->text('reason');
            $table->timestamp('escalated_at');
            $table->timestamps();
        });

        Schema::create('monitoring_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->timestamp('next_due_at');
            $table->unsignedInteger('frequency_minutes');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monitoring_schedules');
        Schema::dropIfExists('alert_escalations');
        Schema::dropIfExists('alert_acknowledgements');
        Schema::dropIfExists('clinical_alerts');
    }
};
