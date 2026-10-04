<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_shift_plans', function (Blueprint $table) {
            $table->id();
            $table->string('year_month', 7);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique('year_month');
        });

        Schema::create('staff_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->nullable()->constrained('staff_shift_plans')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('unit', 80)->nullable();
            $table->timestamps();
        });

        Schema::create('daily_patient_assignments', function (Blueprint $table) {
            $table->id();
            $table->date('shift_date');
            $table->foreignId('nurse_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('encounter_id')->index();
            $table->unsignedSmallInteger('news2_weight')->nullable();
            $table->timestamps();
        });

        Schema::create('handovers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('encounter_id')->nullable()->index();
            $table->json('payload')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('staff_absences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('shift_date');
            $table->string('reason', 255)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('coverage_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('absence_id')->nullable()->constrained('staff_absences')->nullOnDelete();
            $table->string('status', 40)->default('solicitada');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('authorized_by_hr')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('retainer_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coverage_request_id')->constrained('coverage_requests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('confirmed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('retainer_confirmations');
        Schema::dropIfExists('coverage_requests');
        Schema::dropIfExists('staff_absences');
        Schema::dropIfExists('handovers');
        Schema::dropIfExists('daily_patient_assignments');
        Schema::dropIfExists('staff_shifts');
        Schema::dropIfExists('staff_shift_plans');
    }
};
