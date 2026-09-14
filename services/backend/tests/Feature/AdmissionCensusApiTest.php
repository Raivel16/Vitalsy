<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->assertJsonPath('encounters.0.patientName', 'Luis Ernesto Paredes')
            ->assertJsonPath('encounters.0.currentStep', 'cobertura')
            ->assertJsonPath('encounters.0.nextRole', 'admision')
            ->assertJsonPath('encounters.1.patientName', 'Carmen Yolanda Vega')
            ->assertJsonPath('encounters.1.currentStep', 'derivacion')
            ->assertJsonPath('encounters.2.encounterId', 'ENC-0001')
            ->assertJsonPath('encounters.2.currentStep', 'traslado')
            ->assertJsonPath('encounters.2.nextRole', 'celador')
            ->assertJsonPath('encounters.2.location.room', '312')
            ->assertJsonPath('encounters.2.deliverables.3.done', true);
    }

    public function test_file_shows_deliverables_and_unknown_encounter_is_spanish_not_found(): void
    {
        $this->asRole('enfermeria');

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
        $this->asRole('celador');
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

        $this->asRole('celador');
        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0001/advance', ['step' => 'traslado'])
            ->assertOk()
            ->assertJsonPath('encounter.currentStep', 'identidad');

        $this->postJson('/api/v1/hospital-admission/encounters/ENC-0001/advance', ['step' => 'recepcion'])
            ->assertStatus(422);
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
}
