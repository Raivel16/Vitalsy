<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wards', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('specialty')->nullable();
            $table->timestamps();
        });

        Schema::create('beds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ward_id')->constrained('wards')->cascadeOnDelete();
            $table->string('room');
            $table->string('bed_code');
            $table->string('gender_policy')->nullable();
            $table->boolean('isolation')->default(false);
            $table->string('status'); // available|occupied|cleaning|blocked
            $table->timestamps();

            $table->unique(['ward_id', 'room', 'bed_code']);
        });

        Schema::create('bed_requests', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->nullable()->index();
            $table->string('source');
            $table->string('priority');
            $table->string('status');
            $table->timestamp('requested_at');
            $table->timestamps();
        });

        Schema::create('bed_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bed_id')->constrained('beds')->cascadeOnDelete();
            $table->string('encounter_id')->index();
            $table->timestamp('assigned_at');
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
        });

        Schema::create('cleaning_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bed_id')->constrained('beds')->cascadeOnDelete();
            $table->string('protocol'); // standard|deep
            $table->string('status');
            $table->timestamp('dispatched_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('bed_readiness_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bed_id')->constrained('beds')->cascadeOnDelete();
            $table->boolean('linen_ok')->default(false);
            $table->boolean('supplies_ok')->default(false);
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at');
            $table->timestamps();
        });

        Schema::create('discharge_projections', function (Blueprint $table) {
            $table->id();
            $table->string('encounter_id')->index();
            $table->timestamp('projected_at');
            $table->foreignId('noted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discharge_projections');
        Schema::dropIfExists('bed_readiness_checks');
        Schema::dropIfExists('cleaning_orders');
        Schema::dropIfExists('bed_assignments');
        Schema::dropIfExists('bed_requests');
        Schema::dropIfExists('beds');
        Schema::dropIfExists('wards');
    }
};
