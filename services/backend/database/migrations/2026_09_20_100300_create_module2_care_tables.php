<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_results', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('external_id')->nullable();
            $table->text('summary');
            $table->json('payload')->nullable();
            $table->timestamp('resulted_at');
            $table->timestamps();
        });

        Schema::create('imaging_reports', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('external_id')->nullable();
            $table->string('modality')->nullable();
            $table->text('summary');
            $table->json('payload')->nullable();
            $table->timestamp('reported_at');
            $table->timestamps();
        });

        Schema::create('medical_evolution_notes', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->foreignId('author_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('status');
            $table->foreignId('prescribed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
            $table->string('drug_name');
            $table->string('dose');
            $table->string('route');
            $table->string('frequency');
            $table->timestamps();
        });

        Schema::create('medication_administrations', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->foreignId('prescription_item_id')->nullable()->constrained('prescription_items')->nullOnDelete();
            $table->timestamp('scheduled_at');
            $table->timestamp('administered_at')->nullable();
            $table->string('status');
            $table->foreignId('nurse_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('barcode_ok')->nullable();
            $table->timestamps();
        });

        Schema::create('nursing_evolution_notes', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->foreignId('author_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('care_activity_completions', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('activity_label');
            $table->timestamp('completed_at');
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_activity_completions');
        Schema::dropIfExists('nursing_evolution_notes');
        Schema::dropIfExists('medication_administrations');
        Schema::dropIfExists('prescription_items');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('medical_evolution_notes');
        Schema::dropIfExists('imaging_reports');
        Schema::dropIfExists('lab_results');
    }
};
