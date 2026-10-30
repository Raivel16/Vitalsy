<?php

namespace Tests\Feature;

use App\Exceptions\UndecryptableFieldException;
use App\Models\AdmissionEncounter;
use App\Models\MedicalEvolutionNote;
use App\Support\Security\FieldCipher;
use Illuminate\Encryption\Encrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** RNF-06: una clave incorrecta no debe perder, sobrescribir ni recifrar datos. */
class EncryptionKeyMismatchTest extends TestCase
{
    private const A_1 = '{"a":1}';

    use RefreshDatabase;

    private function foreignCipher(string $plain): string
    {
        return (new Encrypter(random_bytes(32), 'AES-256-CBC'))->encryptString($plain);
    }

    private function encounterWithRawPayload(string $raw): int
    {
        return DB::table('admission_encounters')->insertGetId([
            'encounter_id' => 'ENC-K', 'order_number' => 'OI-K', 'patient_name' => 'Ana',
            'document_type' => 'DNI', 'document_number' => '1', 'origin_service' => 'M',
            'coverage_payer' => 'X', 'coverage_status' => 'ok', 'coverage_plan' => 'Y',
            'current_step' => 'admision', 'deliverables' => '[]', 'clinical_payload' => $raw,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_looks_encrypted_discriminates_payloads_from_plaintext(): void
    {
        $this->assertTrue(FieldCipher::looksEncrypted(FieldCipher::encrypt('x')));
        $this->assertTrue(FieldCipher::looksEncrypted($this->foreignCipher('x')));
        $this->assertFalse(FieldCipher::looksEncrypted('texto legado'));
        $this->assertFalse(FieldCipher::looksEncrypted(base64_encode(self::A_1)));
        $this->assertFalse(FieldCipher::looksEncrypted(self::A_1));
    }

    public function test_ciphertext_under_another_key_throws_on_read(): void
    {
        $id = $this->encounterWithRawPayload($this->foreignCipher('{"reconciliation":{"x":1}}'));

        $this->expectException(UndecryptableFieldException::class);
        AdmissionEncounter::query()->findOrFail($id)->clinical_payload;
    }

    public function test_exception_message_leaks_no_ciphertext(): void
    {
        $cipher = $this->foreignCipher('secreto');
        $id = DB::table('medical_evolution_notes')->insertGetId([
            'encounter_id' => 'E', 'body' => $cipher, 'created_at' => now(), 'updated_at' => now(),
        ]);

        try {
            MedicalEvolutionNote::query()->findOrFail($id)->body;
            $this->fail('debía lanzar');
        } catch (UndecryptableFieldException $e) {
            $this->assertStringNotContainsString($cipher, $e->getMessage());
            $this->assertStringContainsString('APP_KEY', $e->getMessage());
        }
    }

    public function test_failed_read_cannot_lead_to_overwriting_the_stored_value(): void
    {
        $cipher = $this->foreignCipher('{"reconciliation":{"x":1}}');
        $id = $this->encounterWithRawPayload($cipher);

        try {
            $encounter = AdmissionEncounter::query()->findOrFail($id);
            $payload = $encounter->clinical_payload ?? [];   // lanza antes de poder mutar
            $payload['nuevo'] = true;
            $encounter->clinical_payload = $payload;
            $encounter->save();
            $this->fail('debía lanzar');
        } catch (UndecryptableFieldException) {
            $this->assertTrue(true);
        }

        // Guardar otro atributo tampoco toca la columna cifrada.
        AdmissionEncounter::query()->findOrFail($id)->update(['room' => '101']);

        $this->assertSame($cipher, DB::table('admission_encounters')->where('id', $id)->value('clinical_payload'));
    }

    public function test_backfill_with_wrong_key_encrypts_nothing_and_fails(): void
    {
        $cipher = $this->foreignCipher('Texto cifrado con otra clave');
        $id = DB::table('medical_evolution_notes')->insertGetId([
            'encounter_id' => 'E', 'body' => $cipher, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->artisan('vitalsy:encrypt-existing')->assertFailed();

        $this->assertSame($cipher, DB::table('medical_evolution_notes')->where('id', $id)->value('body'));
    }

    public function test_backfill_with_correct_key_is_idempotent_and_encrypts_base64_json_lookalikes(): void
    {
        $lookalike = base64_encode(self::A_1);
        DB::table('medical_evolution_notes')->insert([
            ['encounter_id' => 'E', 'body' => $lookalike, 'created_at' => now(), 'updated_at' => now()],
            ['encounter_id' => 'E', 'body' => FieldCipher::encrypt('ya cifrado'), 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->artisan('vitalsy:encrypt-existing')->assertSuccessful();

        $rows = DB::table('medical_evolution_notes')->orderBy('id')->pluck('body');
        $this->assertSame($lookalike, FieldCipher::decryptOrRaw($rows[0]));
        $this->assertTrue(FieldCipher::isEncrypted($rows[0]));
        $this->assertSame('ya cifrado', FieldCipher::decryptOrRaw($rows[1]));

        $snapshot = $rows->all();
        $this->artisan('vitalsy:encrypt-existing')->assertSuccessful();
        $this->assertSame($snapshot, DB::table('medical_evolution_notes')->orderBy('id')->pluck('body')->all());
    }
}
