<?php

namespace Tests\Feature;

use App\Exceptions\UndecryptableFieldException;
use App\Models\AdmissionEncounter;
use App\Models\Handover;
use App\Models\User;
use App\Support\Security\FieldCipher;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Encryption\Encrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class DegradedReadAndSeederTest extends TestCase
{
    use RefreshDatabase;

    private function insertEncounter(string $id, mixed $payload): int
    {
        return DB::table('admission_encounters')->insertGetId([
            'encounter_id' => $id, 'order_number' => 'OI-'.$id, 'patient_name' => 'Paciente '.$id,
            'document_type' => 'DNI', 'document_number' => '1'.random_int(1000, 9999), 'origin_service' => 'M',
            'coverage_payer' => 'X', 'coverage_status' => 'aprobada', 'coverage_plan' => 'Y',
            'current_step' => 'admision', 'deliverables' => '[]', 'clinical_payload' => $payload,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function foreign(): string
    {
        return (new Encrypter(random_bytes(32), 'AES-256-CBC'))->encryptString('{"x":1}');
    }

    public function test_census_with_one_corrupted_row_still_answers_and_flags_it(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admision']));
        $this->insertEncounter('ENC-OK', json_encode(['a' => 1]));
        $badId = $this->insertEncounter('ENC-BAD', $this->foreign());
        Log::spy();

        $response = $this->getJson('/api/v1/hospital-admission/encounters')->assertOk();

        $response->assertJsonPath('decryptError', true);
        $response->assertJsonPath('decryptErrors.0.table', 'admission_encounters');
        $response->assertJsonPath('decryptErrors.0.column', 'clinical_payload');
        $response->assertJsonPath('decryptErrors.0.id', $badId);
        $ids = collect($response->json('encounters'))->pluck('encounterId')->all();
        $this->assertContains('ENC-OK', $ids);
        $this->assertContains('ENC-BAD', $ids);
        Log::shouldHaveReceived('warning')->with('rnf06.field_undecryptable', \Mockery::type('array'));
    }

    public function test_healthy_census_has_no_decrypt_flag(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admision']));
        $this->insertEncounter('ENC-OK', json_encode(['a' => 1]));

        $this->getJson('/api/v1/hospital-admission/encounters')
            ->assertOk()
            ->assertJsonMissingPath('decryptError');
    }

    public function test_write_on_corrupted_row_still_throws_and_does_not_overwrite(): void
    {
        $cipher = $this->foreign();
        $id = $this->insertEncounter('ENC-BAD', $cipher);

        try {
            $e = AdmissionEncounter::query()->findOrFail($id);
            $payload = $e->clinical_payload ?? [];
            $this->fail('lectura fuera de listado debía lanzar');
        } catch (UndecryptableFieldException) {
            $this->assertTrue(true);
        }

        // Aun dentro de una lectura degradada, asignar sobre un valor ilegible se rechaza.
        FieldCipher::degrading(function () use ($id) {
            $e = AdmissionEncounter::query()->findOrFail($id);
            $this->assertNull($e->clinical_payload);
            try {
                $e->clinical_payload = ['nuevo' => true];
                $this->fail('debía rechazar la asignación');
            } catch (UndecryptableFieldException) {
                $this->assertTrue(true);
            }
        });

        $this->assertSame($cipher, DB::table('admission_encounters')->where('id', $id)->value('clinical_payload'));
    }

    public function test_seeder_deactivates_legacy_user_that_signed_a_handover(): void
    {
        $legacy = User::factory()->create(['email' => 'enfermeria@vitalsy.local', 'role' => 'enfermera_piso']);
        $other = User::factory()->create();
        Handover::query()->create([
            'from_user_id' => $legacy->id, 'to_user_id' => $other->id, 'payload' => ['a' => 1], 'signed_at' => now(),
        ]);
        $orphan = User::factory()->create(['email' => 'celador@vitalsy.local', 'role' => 'camillero']);

        $this->seed(DatabaseSeeder::class);

        $legacy->refresh();
        $this->assertFalse((bool) $legacy->is_active);
        $this->assertNotNull($legacy->deactivated_at);
        $this->assertDatabaseMissing('users', ['id' => $orphan->id]);
        $this->assertSame(1, DB::table('handovers')->count());
    }

    public function test_pg_trigger_migration_has_no_subquery_in_when_clause(): void
    {
        foreach (glob(database_path('migrations/2026_10_14_1*traceability*.php')) as $file) {
            $src = file_get_contents($file);
            foreach (preg_split('/\R/', $src) as $line) {
                if (preg_match('/WHEN\s*\(/i', $line)) {
                    $this->assertDoesNotMatchRegularExpression('/SELECT|EXISTS/i', $line, "Subconsulta en WHEN (no admitida por PostgreSQL) en {$file}");
                }
            }
        }

        $refined = file_get_contents(database_path('migrations/2026_10_14_110000_refine_traceability_triggers.php'));
        $this->assertStringContainsString('createPgUpdateGuard', $refined);
        $this->assertStringContainsString('FOR EACH ROW{$when} EXECUTE FUNCTION', $refined);
        // La comprobación de existencia vive en el cuerpo plpgsql, no en WHEN.
        $this->assertStringContainsString('EXISTS (SELECT 1 FROM {$ref} WHERE id = OLD.{$c})', $refined);
    }
}
