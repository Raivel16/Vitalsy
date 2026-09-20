<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discharge_orders', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->foreignId('ordered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('ordered_at');
            $table->string('status', 40)->default('registrada');
            $table->timestamps();
        });

        Schema::create('epicrisis_documents', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->text('diagnoses');
            $table->text('procedures')->nullable();
            $table->text('evolution')->nullable();
            $table->foreignId('authored_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('ambulatory_prescriptions', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->json('content')->nullable();
            $table->timestamp('issued_at');
            $table->timestamps();
        });

        Schema::create('social_assessments', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->text('report');
            $table->boolean('validated')->default(false);
            $table->foreignId('assessed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('pharma_discharge_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->text('notes')->nullable();
            $table->string('status', 40)->default('registrada');
            $table->timestamps();
        });

        Schema::create('nursing_discharge_reports', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->text('instructions');
            $table->text('alarm_signs')->nullable();
            $table->text('home_care')->nullable();
            $table->timestamps();
        });

        Schema::create('discharge_indication_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('received_by_name', 120);
            $table->timestamp('received_at');
            $table->timestamps();
        });

        Schema::create('account_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('status', 40)->default('pendiente');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('exit_passes', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->timestamp('issued_at');
            $table->string('status', 40)->default('emitido');
            $table->timestamps();
        });

        Schema::create('patient_exits', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->timestamp('exited_at');
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_exits');
        Schema::dropIfExists('exit_passes');
        Schema::dropIfExists('account_verifications');
        Schema::dropIfExists('discharge_indication_receipts');
        Schema::dropIfExists('nursing_discharge_reports');
        Schema::dropIfExists('pharma_discharge_reconciliations');
        Schema::dropIfExists('social_assessments');
        Schema::dropIfExists('ambulatory_prescriptions');
        Schema::dropIfExists('epicrisis_documents');
        Schema::dropIfExists('discharge_orders');
    }
};
