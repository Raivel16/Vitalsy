<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinical_alerts', function (Blueprint $table) {
            $table->string('assigned_role')->nullable()->after('status');
            $table->foreignId('assigned_user_id')->nullable()->after('assigned_role')->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->after('assigned_user_id')->constrained('users')->nullOnDelete();
            $table->timestamp('acknowledge_due_at')->nullable()->after('generated_at');
            $table->timestamp('medical_notified_at')->nullable()->after('acknowledge_due_at');
            $table->timestamp('medical_due_at')->nullable()->after('medical_notified_at');
            $table->timestamp('closed_at')->nullable()->after('medical_due_at');
            $table->text('closure_note')->nullable()->after('closed_at');
        });

        // RF-52: historial append-only de cada evento de la alerta.
        Schema::create('alert_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alert_id')->constrained('clinical_alerts')->cascadeOnDelete();
            $table->string('type');
            $table->string('role')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('detail')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['alert_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_events');

        Schema::table('clinical_alerts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_user_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn([
                'assigned_role',
                'acknowledge_due_at',
                'medical_notified_at',
                'medical_due_at',
                'closed_at',
                'closure_note',
            ]);
        });
    }
};
