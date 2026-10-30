<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\AmbulatoryPrescription;
use App\Models\LabResult;
use App\Models\LifeAccount;
use App\Models\LifeBiometricSample;
use App\Models\MedicalEvolutionNote;
use App\Models\NursingEvolutionNote;
use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Support\Security\EncryptedColumns;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** RNF-06: campos clínicos sensibles cifrados en reposo (AES-256-CBC con APP_KEY). */
class EncryptionAtRestTest extends TestCase
{
    private const DOLOR_TORACICO_INTENSO = 'Paciente refiere dolor toracico intenso';

    private const LEGADO_EN_CLARO = 'Texto legado en claro';

    use RefreshDatabase;

    public function test_cipher_is_aes_256(): void
    {
        $this->assertSame('AES-256-CBC', config('app.cipher'));
    }

    public function test_free_text_is_ciphertext_in_the_database_and_plaintext_through_the_model(): void
    {
        $note = NursingEvolutionNote::query()->create([
            'encounter_id' => 'ENC-1',
            'body' => self::DOLOR_TORACICO_INTENSO,
        ]);

        $raw = DB::table('nursing_evolution_notes')->where('id', $note->id)->value('body');

        $this->assertStringNotContainsString('dolor toracico', $raw);
        $this->assertSame(self::DOLOR_TORACICO_INTENSO, Crypt::decryptString($raw));
        $this->assertSame(self::DOLOR_TORACICO_INTENSO, $note->fresh()->body);
    }

    public function test_json_payloads_round_trip_and_are_ciphertext_at_rest(): void
    {
        $encounter = AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-2', 'order_number' => 'OI-ENC-2', 'patient_name' => 'Ana Prueba',
            'document_type' => 'DNI', 'document_number' => '12345678', 'origin_service' => 'Medicina',
            'coverage_payer' => 'X', 'coverage_status' => 'aprobada', 'coverage_plan' => 'Y',
            'current_step' => 'admision', 'deliverables' => [],
            'clinical_payload' => ['reconciliation' => ['allergies' => 'penicilina']],
        ]);

        $raw = DB::table('admission_encounters')->where('id', $encounter->id)->value('clinical_payload');
        $this->assertStringNotContainsString('penicilina', $raw);
        $this->assertSame(
            ['reconciliation' => ['allergies' => 'penicilina']],
            $encounter->fresh()->clinical_payload,
        );
        // Columnas de busqueda se mantienen en claro.
        $this->assertSame('Ana Prueba', DB::table('admission_encounters')->where('id', $encounter->id)->value('patient_name'));

        $labs = LabResult::query()->create([
            'encounter_id' => 'ENC-2', 'summary' => 'Hemoglobina 7.1 g/dL', 'payload' => ['hb' => 7.1],
            'resulted_at' => now(),
        ]);
        $rawLab = DB::table('lab_results')->where('id', $labs->id)->first();
        $this->assertStringNotContainsString('Hemoglobina', $rawLab->summary);
        $this->assertStringNotContainsString('7.1', $rawLab->payload);
        $this->assertSame(['hb' => 7.1], $labs->fresh()->payload);

        $rx = AmbulatoryPrescription::query()->create([
            'encounter_id' => 'ENC-2', 'content' => ['items' => [['drug' => 'Amoxicilina']]], 'issued_at' => now(),
        ]);
        $this->assertStringNotContainsString('Amoxicilina', DB::table('ambulatory_prescriptions')->where('id', $rx->id)->value('content'));
        $this->assertSame('Amoxicilina', $rx->fresh()->content['items'][0]['drug']);
    }

    public function test_allergies_notes_and_biometric_values_are_encrypted(): void
    {
        $patient = Patient::query()->create(['document_type' => 'DNI', 'document_number' => '1', 'full_name' => 'Ana']);
        $allergy = PatientAllergy::query()->create(['patient_id' => $patient->id, 'substance' => 'Penicilina', 'notes' => 'anafilaxia']);
        $rawAllergy = DB::table('patient_allergies')->where('id', $allergy->id)->first();
        $this->assertStringNotContainsString('Penicilina', $rawAllergy->substance);
        $this->assertStringNotContainsString('anafilaxia', $rawAllergy->notes);
        $this->assertSame('Penicilina', $allergy->fresh()->substance);

        $account = LifeAccount::query()->create(['name' => 'Luz', 'email' => 'luz@example.com', 'password' => 'secret-pass']);
        $sample = LifeBiometricSample::query()->create([
            'life_account_id' => $account->id, 'client_id' => 'c1', 'kind' => 'heart_rate', 'value' => 72.5,
            'unit' => 'bpm', 'started_at' => now(), 'ended_at' => now(), 'origin' => 'manual',
        ]);
        $rawValue = DB::table('life_biometric_samples')->where('id', $sample->id)->value('value');
        $this->assertStringNotContainsString('72.5', (string) $rawValue);
        $this->assertSame(72.5, $sample->fresh()->value);
    }

    public function test_backfill_dry_run_changes_nothing_and_real_run_is_idempotent(): void
    {
        DB::table('medical_evolution_notes')->insert([
            'encounter_id' => 'ENC-9', 'body' => self::LEGADO_EN_CLARO, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('lab_results')->insert([
            'encounter_id' => 'ENC-9', 'summary' => 'Resumen legado', 'payload' => '{"k":"valor-legado"}',
            'resulted_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        // El modelo sigue leyendo valores legados en claro durante el despliegue.
        $this->assertSame(self::LEGADO_EN_CLARO, MedicalEvolutionNote::query()->first()->body);
        $this->assertSame(['k' => 'valor-legado'], LabResult::query()->first()->payload);

        $this->artisan('vitalsy:encrypt-existing', ['--dry-run' => true])->assertSuccessful();
        $this->assertSame(self::LEGADO_EN_CLARO, DB::table('medical_evolution_notes')->value('body'));

        $this->artisan('vitalsy:encrypt-existing')->assertSuccessful();
        $rawBody = DB::table('medical_evolution_notes')->value('body');
        $this->assertStringNotContainsString('legado', $rawBody);
        $this->assertSame(self::LEGADO_EN_CLARO, MedicalEvolutionNote::query()->first()->body);
        $this->assertSame(['k' => 'valor-legado'], LabResult::query()->first()->payload);

        $snapshot = DB::table('medical_evolution_notes')->value('body');
        $this->artisan('vitalsy:encrypt-existing', ['--chunk' => 1])->assertSuccessful();
        $this->assertSame($snapshot, DB::table('medical_evolution_notes')->value('body'), 'no debe re-cifrar');
    }

    public function test_backfill_refuses_to_run_without_app_key(): void
    {
        config(['app.key' => '']);

        $this->artisan('vitalsy:encrypt-existing')->assertFailed();
    }

    public function test_registry_columns_all_use_encrypting_casts(): void
    {
        foreach (EncryptedColumns::map() as $table => $spec) {
            $model = new $spec['model'];
            $this->assertSame($table, $model->getTable());
            foreach ($spec['columns'] as $column) {
                $this->assertArrayHasKey($column, $model->getCasts(), "$table.$column sin cast cifrado");
            }
        }
        $this->assertNotEmpty(Artisan::all()['vitalsy:encrypt-existing'] ?? null);
        $this->assertSame(MedicalEvolutionNote::class, EncryptedColumns::map()['medical_evolution_notes']['model']);
    }
}
