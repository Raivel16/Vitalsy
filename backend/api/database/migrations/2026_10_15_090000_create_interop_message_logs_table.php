<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interop_message_logs', function (Blueprint $table) {
            $table->id();
            $table->string('system', 10); // lis | pacs
            $table->string('direction', 5)->default('in');
            $table->string('resource_type', 40);
            $table->string('external_id', 120)->nullable();
            $table->string('outcome', 5); // ok | error
            $table->string('error_code', 60)->nullable();
            $table->unsignedInteger('duration_ms')->default(0);
            $table->timestamp('created_at')->useCurrent()->index();
            $table->index(['system', 'outcome']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interop_message_logs');
    }
};
