<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bed_requests', function (Blueprint $table) {
            $table->string('isolation_type')->nullable()->after('isolation'); // ninguno|gotas|contacto|respiratorio
            $table->json('equipment')->nullable()->after('isolation_type');
        });

        // RF-73: la asignación queda notificada a la supervisora hasta que la reconoce.
        Schema::table('bed_assignments', function (Blueprint $table) {
            $table->timestamp('notified_at')->nullable()->after('released_at');
            $table->string('notified_role')->nullable()->index()->after('notified_at');
            $table->timestamp('acknowledged_at')->nullable()->after('notified_role');
            $table->foreignId('acknowledged_by')->nullable()->after('acknowledged_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bed_assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('acknowledged_by');
            $table->dropIndex(['notified_role']);
            $table->dropColumn(['acknowledged_at', 'notified_role', 'notified_at']);
        });

        Schema::table('bed_requests', function (Blueprint $table) {
            $table->dropColumn(['equipment', 'isolation_type']);
        });
    }
};
