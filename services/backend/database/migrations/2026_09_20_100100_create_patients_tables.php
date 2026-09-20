<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('document_type');
            $table->string('document_number');
            $table->string('full_name');
            $table->date('birth_date')->nullable();
            $table->string('sex')->nullable();
            $table->timestamps();

            $table->unique(['document_type', 'document_number']);
        });

        Schema::create('patient_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone');
            $table->string('relationship');
            $table->timestamps();
        });

        Schema::create('patient_allergies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('substance');
            $table->text('notes')->nullable();
            $table->boolean('is_optional')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_allergies');
        Schema::dropIfExists('patient_contacts');
        Schema::dropIfExists('patients');
    }
};
