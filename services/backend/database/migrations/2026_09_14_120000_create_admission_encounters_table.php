<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admission_encounters', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->unique();
            $table->string('order_number')->unique();
            $table->string('transfer_order_number')->nullable();
            $table->string('patient_name');
            $table->string('document_type');
            $table->string('document_number');
            $table->string('origin_service');
            $table->string('coverage_payer');
            $table->string('coverage_status');
            $table->string('coverage_plan');
            $table->string('room')->nullable();
            $table->string('bed')->nullable();
            $table->string('service')->nullable();
            $table->string('wristband_code')->nullable();
            $table->string('record_id')->nullable();
            $table->string('current_step');
            $table->string('waiting_reason')->nullable();
            $table->json('deliverables');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admission_encounters');
    }
};
