<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coverage_referrals', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('destination');
            $table->string('relative_name');
            $table->string('relative_phone');
            $table->text('note')->nullable();
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('informed_consents', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('signer_name');
            $table->string('relationship');
            $table->timestamp('accepted_at');
            $table->timestamps();
        });

        Schema::create('nursing_assessments', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->text('chief_complaint')->nullable();
            $table->text('history')->nullable();
            $table->json('allergies')->nullable();
            $table->string('recorded_by')->nullable();
            $table->timestamps();
        });

        Schema::create('vital_sign_readings', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->unsignedSmallInteger('rr')->nullable();
            $table->unsignedSmallInteger('spo2')->nullable();
            $table->unsignedSmallInteger('sbp')->nullable();
            $table->unsignedSmallInteger('pulse')->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->string('spo2_scale')->nullable();
            $table->boolean('supplemental_oxygen')->nullable();
            $table->string('consciousness')->nullable();
            $table->unsignedTinyInteger('news2_total')->nullable();
            $table->timestamp('recorded_at');
            $table->timestamps();
        });

        Schema::create('medication_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->text('allergies')->nullable();
            $table->json('medications')->nullable();
            $table->string('status');
            $table->timestamps();
        });

        Schema::create('risk_assessments', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->unsignedSmallInteger('morse_score')->nullable();
            $table->unsignedSmallInteger('braden_score')->nullable();
            $table->text('recommendations')->nullable();
            $table->timestamps();
        });

        Schema::create('wristband_events', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->string('code');
            $table->string('action'); // issued|verified
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wristband_events');
        Schema::dropIfExists('risk_assessments');
        Schema::dropIfExists('medication_reconciliations');
        Schema::dropIfExists('vital_sign_readings');
        Schema::dropIfExists('nursing_assessments');
        Schema::dropIfExists('informed_consents');
        Schema::dropIfExists('coverage_referrals');
    }
};
