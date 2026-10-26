<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** RF-110–112: pabellones y camas administrables (desactivar / borrado lógico con historial). */
    public function up(): void
    {
        foreach (['wards', 'beds'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->boolean('active')->default(true)->after('id');
                $table->softDeletes();
            });
        }

        Schema::create('bed_infrastructure_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 40);
            $table->string('subject_type', 10);
            $table->unsignedBigInteger('subject_id');
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bed_infrastructure_changes');
        foreach (['wards', 'beds'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropSoftDeletes();
                $table->dropColumn('active');
            });
        }
    }
};
