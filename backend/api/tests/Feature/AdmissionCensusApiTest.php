<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use App\Services\Admission\AdmissionIdentifiers;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdmissionCensusApiTest extends TestCase
{
    use RefreshDatabase;

    private function asRole(string $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]));
    }

    public function test_census_lists_the_three_review_patients_at_different_stages(): void
    {
        $this->asRole('admision');

        $response = $this->getJson('/api/v1/hospital-admission/encounters');

        $response->assertOk()
            ->assertJsonMissingPath('simulated')
            ->assertJsonCount(3, 'encounters')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.perPage', 10)
            ->assertJsonPath('meta.page', 1)
            ->assertJsonPath('encounters.0.patientName', 'Luis Ernesto Paredes')
            ->assertJsonPath('encounters.0.currentStep', 'cobertura')
            ->assertJsonPath('encounters.0.nextRole', 'admision')
            ->assertJsonPath('encounters.1.patientName', 'Carmen Yolanda Vega')
            ->assertJsonPath('encounters.1.currentStep', 'derivacion')
            ->assertJsonPath('encounters.2.encounterId', 'ENC-0001')
            ->assertJsonPath('encounters.2.currentStep', 'traslado')
            ->assertJsonPath('encounters.2.nextRole', 'camillero')
            ->assertJsonPath('encounters.2.location.room', '312')
            ->assertJsonPath('encounters.2.deliverables.3.done', true);
    }

    public function test_census_ignores_patients_who_already_left_the_hospital(): void
    {
        $this->asRole('enfermera_piso');
        app(AdmissionBoard::class)->ensureDemo();
        AdmissionEncounter::query()->where('encounter_id', 'ENC-0001')->update(['current_step' => 'egresado']);

        $response = $this->getJson('/api/v1/hospital-admission/encounters');

        $response->assertOk();
        $ids = collect($response->json('encounters'))->pluck('encounterId');
        $this->assertFalse($ids->contains('ENC-0001'));
        $this->assertTrue($ids->contains('ENC-0002'));
    }

    public function test_census_filters_by_patient_name_or_document(): void
    {
        $this->asRole('admision');

        $this->getJson('/api/v1/hospital-admission/encounters?q=Quispe')
            ->assertOk()
            ->assertJsonCount(1, 'encounters')
            ->assertJsonPath('encounters.0.patientName', 'Ana María Quispe Rojas')
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/hospital-admission/encounters?q=40112233')
            ->assertOk()
            ->assertJsonCount(1, 'encounters')
            ->assertJsonPath('encounters.0.documentNumber', '40112233');

        $this->getJson('/api/v1/hospital-admission/encounters?q=BRZ-0001-ANA')
            ->assertOk()
            ->assertJsonCount(1, 'encounters')
            ->assertJsonPath('encounters.0.wristbandCode', 'BRZ-0001-ANA')
            ->assertJsonPath('encounters.0.patientName', 'Ana María Quispe Rojas');
    }

    public function test_census_paginates_ten_per_page(): void
    {
        $this->asRole('admision');
        $this->getJson('/api/v1/hospital-admission/encounters');

        for ($i = 4; $i <= 15; $i++) {
            $this->postJson('/api/v1/hospital-admission/encounters', [
                'orderNumber' => sprintf('OI-PAGE-%04d', $i),
                'patientName' => sprintf('Paciente Demo %02d', $i),
                'documentNumber' => sprintf('700000%02d', $i),
                'originService' => 'Emergencia adultos',
                'coveragePayer' => 'SIS',
                'coverageStatus' => 'aprobada',
                'coveragePlan' => 'SIS Gratuito',
                'source' => 'manual',
            ])->assertCreated();
        }

        $page1 = $this->getJson('/api/v1/hospital-admission/encounters?page=1&per_page=10');
        $page1->assertOk()
            ->assertJsonPath('meta.total', 15)
            ->assertJsonPath('meta.lastPage', 2)
            ->assertJsonCount(10, 'encounters');

        $page2 = $this->getJson('/api/v1/hospital-admission/encounters?page=2&per_page=10');
        $page2->assertOk()
            ->assertJsonPath('meta.page', 2)
            ->assertJsonCount(5, 'encounters');
    }

    public function test_file_shows_deliverables_and_unknown_encounter_is_spanish_not_found(): void
    {
        $this->asRole('enfermera_piso');

        $this->getJson('/api/v1/hospital-admission/encounters/ENC-0001')
            ->assertOk()
            ->assertJsonPath('encounter.wristbandCode', 'BRZ-0001-ANA')
            ->assertJsonPath('encounter.recordId', 'EXP-0001')
            ->assertJsonPath('encounter.deliverables.1.id', 'brazalete')
            ->assertJsonPath('encounter.deliverables.1.done', true)
            ->assertJsonPath('encounter.deliverables.9.id', 'kardex')
            ->assertJsonPath('encounter.deliverables.9.done', false);

        $this->getJson('/api/v1/hospital-admission/encounters/ENC-9999')
            ->assertNotFound()
            ->assertJsonPath('message', 'No se encontró el ingreso.');
    }

    public function test_only_the_responsible_role_can_advance_the_current_step(): void
    {
        $this->asRole('camillero');
        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0003/advance', ['step' => 'derivacion'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Este paso corresponde a otro perfil.');

        $this->asRole('admision');
        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0002/advance', ['step' => 'brazalete'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Este no es el paso vigente del ingreso.');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0002/advance', ['step' => 'cobertura'])
            ->assertOk()
            ->assertJsonPath('encounter.currentStep', 'derivacion')
            ->assertJsonPath('encounter.statusLabel', 'Cobertura en trámite');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0002/advance', [
            'step' => 'derivacion',
            'coverageStatus' => 'aprobada',
        ])->assertOk()
            ->assertJsonPath('encounter.currentStep', 'brazalete')
            ->assertJsonPath('encounter.coverage.status', 'aprobada')
            ->assertJsonPath('encounter.nextRole', 'admision')
            ->assertJsonPath('encounter.deliverables.0.done', true);

        $this->asRole('camillero');
        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0001/advance', ['step' => 'traslado'])
            ->assertOk()
            ->assertJsonPath('encounter.currentStep', 'identidad');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0001/advance', ['step' => 'recepcion'])
            ->assertStatus(422);
    }

    public function test_approving_coverage_continues_to_wristband_instead_of_referral(): void
    {
        $this->asRole('admision');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0002/advance', [
            'step' => 'cobertura',
            'coverageStatus' => 'aprobada',
        ])->assertOk()
            ->assertJsonPath('encounter.currentStep', 'brazalete')
            ->assertJsonPath('encounter.coverage.status', 'aprobada')
            ->assertJsonPath('encounter.statusLabel', 'Brazalete por emitir')
            ->assertJsonPath('encounter.deliverables.0.done', true);
    }

    public function test_pending_patient_stays_independent_from_a_waiting_referral(): void
    {
        $this->asRole('admision');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0003/advance', ['step' => 'derivacion'])
            ->assertOk()
            ->assertJsonPath('encounter.statusLabel', 'En trámite de cobertura');

        $this->getJson('/api/v1/hospital-admission/encounters/ENC-0002')
            ->assertOk()
            ->assertJsonPath('encounter.currentStep', 'cobertura')
            ->assertJsonPath('encounter.coverage.status', 'pendiente')
            ->assertJsonPath('encounter.statusLabel', 'Cobertura por validar');
    }

    public function test_encounter_file_exposes_registered_coverage_referral(): void
    {
        $this->asRole('admision');

        $this->postJson('/api/v1/hospital-admission/coverage/referrals', [
            'encounterId' => 'ENC-0003',
            'destination' => 'caja',
            'relativeName' => 'Rosa Vega',
            'relativePhone' => '999888777',
            'note' => 'Copago pendiente',
        ])->assertCreated();

        $this->getJson('/api/v1/hospital-admission/encounters/ENC-0003')
            ->assertOk()
            ->assertJsonPath('encounter.coverageReferral.destination', 'caja')
            ->assertJsonPath('encounter.coverageReferral.destinationLabel', 'Caja')
            ->assertJsonPath('encounter.coverageReferral.status', 'derivado')
            ->assertJsonPath('encounter.coverageReferral.relativeName', 'Rosa Vega')
            ->assertJsonPath('encounter.coverageReferral.relativePhone', '999888777');
    }

    public function test_closing_the_admission_removes_it_from_the_physician_queue(): void
    {
        $this->asRole('medico_residente');
        app(AdmissionBoard::class)->ensureDemo();
        $encounter = AdmissionEncounter::query()->where('encounter_id', 'ENC-0001')->first();
        $this->assertNotNull($encounter);
        $encounter->update(['current_step' => 'indicaciones']);

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0001/advance', ['step' => 'indicaciones'])
            ->assertOk()
            ->assertJsonPath('encounter.currentStep', 'cerrado')
            ->assertJsonPath('encounter.nextRole', null)
            ->assertJsonPath('encounter.deliverables.10.done', true);
    }

    public function test_tratante_can_advance_indicaciones_step(): void
    {
        $this->asRole('medico_tratante');
        app(AdmissionBoard::class)->ensureDemo();
        $encounter = AdmissionEncounter::query()->where('encounter_id', 'ENC-0001')->first();
        $this->assertNotNull($encounter);
        $encounter->update(['current_step' => 'indicaciones']);

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0001/advance', ['step' => 'indicaciones'])
            ->assertOk()
            ->assertJsonPath('encounter.currentStep', 'cerrado')
            ->assertJsonPath('encounter.nextRole', null)
            ->assertJsonPath('encounter.deliverables.10.done', true);
    }

    public function test_rejected_coverage_does_not_open_the_wristband_step(): void
    {
        $this->asRole('admision');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0003/advance', ['step' => 'derivacion'])
            ->assertOk()
            ->assertJsonPath('encounter.currentStep', 'derivacion')
            ->assertJsonPath('encounter.nextRole', null)
            ->assertJsonPath('encounter.statusLabel', 'En trámite de cobertura');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0003/advance', ['step' => 'brazalete'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'La cobertura no permite continuar. Derive el trámite.');
    }

    public function test_opening_a_known_order_reuses_the_encounter_and_unknown_order_is_not_found(): void
    {
        $this->asRole('admision');

        $this->postJson('/api/v1/hospital-admission/encounters', ['orderNumber' => 'OI-2026-0001'])
            ->assertOk()
            ->assertJsonPath('encounter.encounterId', 'ENC-0001');

        $this->assertDatabaseCount('admission_encounters', 3);

        $this->postJson('/api/v1/hospital-admission/encounters', ['orderNumber' => 'OI-0000'])
            ->assertNotFound()
            ->assertJsonPath('message', 'No se encontró la orden.');
    }

    public function test_manual_and_external_intake_create_independent_encounters(): void
    {
        $this->asRole('admision');

        $manual = $this->postJson('/api/v1/hospital-admission/encounters', [
            'orderNumber' => 'OI-2026-0100',
            'patientName' => 'Pedro Salas Díaz',
            'documentNumber' => '77889900',
            'originService' => 'Emergencia adultos',
            'coveragePayer' => 'SIS',
            'coverageStatus' => 'aprobada',
            'coveragePlan' => 'SIS Gratuito',
            'source' => 'manual',
        ]);
        $manual->assertCreated()
            ->assertJsonPath('encounter.patientName', 'Pedro Salas Díaz')
            ->assertJsonPath('encounter.currentStep', 'orden')
            ->assertJsonPath('encounter.source', 'manual');

        $external = $this->postJson('/api/v1/hospital-admission/intake', [
            'orderNumber' => 'OI-2026-0101',
            'patientName' => 'María López Ruiz',
            'documentNumber' => '11223344',
            'originService' => 'Consulta externa',
            'coveragePayer' => 'EsSalud',
            'coverageStatus' => 'pendiente',
            'coveragePlan' => 'Regular',
        ]);
        $external->assertCreated()
            ->assertJsonPath('encounter.patientName', 'María López Ruiz')
            ->assertJsonPath('encounter.source', 'external')
            ->assertJsonPath('encounter.currentStep', 'orden');

        $this->assertDatabaseCount('admission_encounters', 5);

        $this->postJson('/api/v1/hospital-admission/intake', [
            'orderNumber' => 'OI-2026-0100',
            'patientName' => 'Duplicado',
            'documentNumber' => '00000000',
            'originService' => 'Emergencia adultos',
            'coveragePayer' => 'SIS',
            'coverageStatus' => 'aprobada',
            'coveragePlan' => 'SIS Gratuito',
        ])->assertStatus(422)->assertJsonPath('message', 'Ya existe un ingreso con esa orden.');
    }

    public function test_wristband_code_is_plain_ascii_for_patients_with_accents(): void
    {
        $encounter = AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-0006', 'order_number' => 'OI-ASCII-1', 'source' => 'manual',
            'patient_name' => 'Álvaro Óscar Úbeda Peña', 'document_type' => 'DNI', 'document_number' => '12345678',
            'origin_service' => 'Emergencia', 'coverage_payer' => 'SIS', 'coverage_status' => 'aprobada',
            'coverage_plan' => 'SIS', 'current_step' => 'brazalete', 'deliverables' => [], 'clinical_payload' => [],
        ]);

        $this->assertSame('BRZ-0006-AOU', app(AdmissionIdentifiers::class)->wristbandCode($encounter));
    }

    public function test_access_administrator_cannot_list_admission_encounters(): void
    {
        $this->asRole('administrador_accesos');

        $this->getJson('/api/v1/hospital-admission/encounters')->assertForbidden();
        $this->getJson('/api/v1/hospital-admission/encounters/ENC-0001')->assertForbidden();
    }

    public function test_registering_survives_another_registration_taking_the_same_encounter_number(): void
    {
        $this->asRole('admision');
        $taken = false;
        AdmissionEncounter::creating(function (AdmissionEncounter $encounter) use (&$taken) {
            if ($taken) {
                return;
            }
            $taken = true;
            // Otro registro simultáneo toma el mismo número justo antes de este insert.
            DB::table('admission_encounters')->insert([
                'encounter_id' => $encounter->encounter_id,
                'order_number' => 'OI-RACE-0001',
                'patient_name' => 'Paciente Simultáneo',
                'document_type' => 'DNI',
                'document_number' => '10000001',
                'origin_service' => 'Emergencia adultos',
                'coverage_payer' => 'SIS',
                'coverage_status' => 'aprobada',
                'coverage_plan' => 'SIS Gratuito',
                'current_step' => 'orden',
                'deliverables' => '{}',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        $response = $this->postJson('/api/v1/hospital-admission/encounters', [
            'orderNumber' => 'OI-RACE-0002',
            'patientName' => 'Lucía Fernández Rojas',
            'documentNumber' => '10000002',
            'originService' => 'Emergencia adultos',
            'coveragePayer' => 'SIS',
            'coverageStatus' => 'aprobada',
            'coveragePlan' => 'SIS Gratuito',
        ]);

        $response->assertCreated();
        $ids = AdmissionEncounter::query()->whereIn('order_number', ['OI-RACE-0001', 'OI-RACE-0002'])->pluck('encounter_id');
        $this->assertCount(2, $ids->unique());
    }
}
