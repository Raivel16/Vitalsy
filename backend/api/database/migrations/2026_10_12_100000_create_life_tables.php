<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('life_accounts', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('password');
            $t->timestamps();
        });
        Schema::create('life_biometric_samples', function (Blueprint $t) {
            $t->id();
            $t->foreignId('life_account_id')->constrained('life_accounts')->cascadeOnDelete();
            $t->string('client_id', 64);
            $t->string('kind', 24);
            $t->decimal('value', 8, 2);
            $t->string('unit', 16);
            $t->timestamp('started_at');
            $t->timestamp('ended_at');
            $t->string('origin', 24);
            $t->timestamps();
            $t->unique(['life_account_id', 'client_id']);
        });
        Schema::create('life_consents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('life_account_id')->unique()->constrained('life_accounts')->cascadeOnDelete();
            $t->boolean('sharing_enabled')->default(false);
            $t->timestamp('revoked_at')->nullable();
            $t->timestamps();
        });
        Schema::create('life_link_codes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('life_account_id')->constrained('life_accounts')->cascadeOnDelete();
            $t->string('code', 16)->unique();
            $t->timestamp('expires_at');
            $t->timestamp('consumed_at')->nullable();
            $t->string('consumed_encounter_id')->nullable()->index();
            $t->timestamps();
        });
        Schema::create('life_baseline_imports', function (Blueprint $t) {
            $t->id();
            $t->string('encounter_id')->index();
            $t->foreignId('life_account_id')->constrained('life_accounts');
            $t->json('baseline');
            $t->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('imported_at');
            $t->timestamps();
        });
        Schema::create('life_discharge_plans', function (Blueprint $t) {
            $t->id();
            $t->string('encounter_id')->unique();
            $t->string('mode', 16);
            $t->string('code', 20)->nullable()->unique();
            $t->string('invitation_code', 20)->nullable()->unique();
            $t->json('payload');
            $t->date('valid_until');
            $t->string('status', 16)->default('pendiente'); // pendiente | activo | reclamado
            $t->foreignId('claimed_by_account_id')->nullable()->constrained('life_accounts')->nullOnDelete();
            $t->timestamp('claimed_at')->nullable();
            $t->timestamp('custody_transferred_at')->nullable();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('life_discharge_plans');
        Schema::dropIfExists('life_baseline_imports');
        Schema::dropIfExists('life_link_codes');
        Schema::dropIfExists('life_consents');
        Schema::dropIfExists('life_biometric_samples');
        Schema::dropIfExists('life_accounts');
    }
};
