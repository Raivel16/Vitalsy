<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HospitalAdmissionApiTest extends TestCase
{
    use RefreshDatabase;

    private function asRole(string $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]));
    }

    public function test_admission_order_returns_the_order_or_a_spanish_not_found(): void
    {
        $this->asRole('admision');
        $found = $this->getJson('/api/v1/hospital-admission/admission-orders/OI-2026-0001');
        $found->assertOk()
            ->assertJsonMissingPath('simulated')
            ->assertJsonPath('order.patient.fullName', 'Ana María Quispe Rojas')
            ->assertJsonPath('order.coverage.status', 'aprobada');

        $this->getJson('/api/v1/hospital-admission/admission-orders/OI-0000')
            ->assertNotFound()
            ->assertJsonMissingPath('simulated')
            ->assertJsonPath('message', 'No se encontró la orden.');
    }

    public function test_filiation_requires_name_in_spanish_and_accepts_a_valid_payload(): void
    {
        $this->asRole('admision');
        $this->postJson('/api/v1/hospital-admission/filiation/validate', [])
            ->assertStatus(422)
            ->assertJsonMissingPath('simulated')
            ->assertJsonPath('message', 'El campo nombre completo es obligatorio.');

        $this->postJson('/api/v1/hospital-admission/filiation/validate', [
            'fullName' => 'Ana María Quispe Rojas',
            'documentNumber' => '45678912',
            'confirmed' => true,
        ])->assertOk()->assertJsonMissingPath('simulated')->assertJsonPath('validated', true);
    }

    public function test_coverage_referral_wristband_record_and_consent_are_created(): void
    {
        $this->asRole('admision');
        $this->postJson('/api/v1/hospital-admission/coverage/validate', [
            'orderNumber' => 'OI-2026-0002',
        ])->assertOk()->assertJsonPath('coverage.status', 'pendiente');

        $this->postJson('/api/v1/hospital-admission/coverage/referrals', [
            'destination' => 'trabajo_social',
            'relativeName' => 'Rosa Quispe',
            'relativePhone' => '999111222',
        ])->assertCreated()->assertJsonPath('referral.status', 'derivado');

        $this->postJson('/api/v1/hospital-admission/wristbands', [
            'encounterId' => 'ENC-0001',
        ])->assertCreated()->assertJsonPath('wristband.code', 'BRZ-0001-ANA');

        $this->postJson('/api/v1/hospital-admission/clinical-records', [
            'encounterId' => 'ENC-0001',
        ])->assertCreated()->assertJsonPath('record.status', 'abierto');

        $this->postJson('/api/v1/hospital-admission/informed-consents', [
            'encounterId' => 'ENC-0001',
            'signerName' => 'Rosa Quispe',
            'accepted' => false,
        ])->assertStatus(422);

        $this->postJson('/api/v1/hospital-admission/informed-consents', [
            'encounterId' => 'ENC-0001',
            'signerName' => 'Rosa Quispe',
            'accepted' => true,
        ])->assertCreated()->assertJsonPath('consent.status', 'firmado');
    }

    public function test_referral_phone_rejects_letters(): void
    {
        $this->asRole('admision');
        $this->postJson('/api/v1/hospital-admission/coverage/referrals', [
            'destination' => 'caja',
            'relativeName' => 'Rosa Quispe',
            'relativePhone' => 'abc123',
        ])->assertStatus(422);
    }

    public function test_transfer_and_wristband_codes_are_independent_per_patient(): void
    {
        $this->asRole('camillero');
        app(AdmissionBoard::class)->ensureDemo();
        $admitted = array_fill_keys([
            'fichaAdmision', 'brazalete', 'expediente', 'consentimiento', 'recepcion',
            'valoracion', 'signosVitales', 'bpmh', 'escalas', 'kardex', 'indicaciones',
        ], false);
        $admitted['fichaAdmision'] = true;
        $admitted['brazalete'] = true;
        $admitted['expediente'] = true;
        $admitted['consentimiento'] = true;

        AdmissionEncounter::query()->where('encounter_id', 'ENC-0002')->update([
            'current_step' => 'traslado',
            'waiting_reason' => null,
            'coverage_status' => 'aprobada',
            'transfer_order_number' => 'OT-2026-0002',
            'wristband_code' => 'BRZ-0002-LEP',
            'room' => '210',
            'bed' => 'A',
            'service' => 'Cirugía',
            'deliverables' => $admitted,
        ]);

        $this->getJson('/api/v1/hospital-admission/transfer-orders/OT-2026-0002')
            ->assertOk()
            ->assertJsonPath('transfer.patientName', 'Luis Ernesto Paredes')
            ->assertJsonPath('transfer.room', '210');

        $this->getJson('/api/v1/hospital-admission/transfer-orders/OT-2026-0001')
            ->assertOk()
            ->assertJsonPath('transfer.patientName', 'Ana María Quispe Rojas');

        $this->postJson('/api/v1/hospital-admission/wristbands/verify', ['code' => 'BRZ-0002-LEP'])
            ->assertOk()
            ->assertJsonPath('identity.patientName', 'Luis Ernesto Paredes');

        $this->postJson('/api/v1/hospital-admission/wristbands/verify', ['code' => 'BRZ-0001-ANA'])
            ->assertOk()
            ->assertJsonPath('identity.patientName', 'Ana María Quispe Rojas');
    }

    public function test_transfer_identity_reception_and_relocation(): void
    {
        $this->asRole('camillero');
        $this->getJson('/api/v1/hospital-admission/transfer-orders/OT-2026-0001')
            ->assertOk()
            ->assertJsonPath('transfer.room', '312')
            ->assertJsonPath('transfer.bed', 'B');

        $this->postJson('/api/v1/hospital-admission/wristbands/verify', ['code' => 'BRZ-MALO'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'El código no corresponde al paciente.');

        $this->postJson('/api/v1/hospital-admission/wristbands/verify', ['code' => 'BRZ-0001-ANA'])
            ->assertOk()
            ->assertJsonPath('identity.patientName', 'Ana María Quispe Rojas');

        $this->asRole('enfermera_piso');
        $this->postJson('/api/v1/hospital-admission/floor-receptions', [
            'encounterId' => 'ENC-0001',
            'confirmed' => true,
        ])->assertCreated()->assertJsonPath('reception.status', 'ingresado');

        $this->postJson('/api/v1/hospital-admission/relocations', [
            'encounterId' => 'ENC-0001',
            'reason' => 'Lecho ocupado',
            'requestedRoom' => '314',
            'requestedBed' => 'A',
        ])->assertCreated()->assertJsonPath('relocation.status', 'notificada');
    }

    public function test_nursing_vitals_calculate_news2_and_reject_impossible_values(): void
    {
        $this->asRole('enfermera_piso');
        $this->postJson('/api/v1/hospital-admission/nursing-assessments', [
            'chiefComplaint' => 'Disnea de dos días',
            'allergies' => ['Penicilina'],
        ])->assertCreated()->assertJsonPath('assessment.status', 'registrada');

        $this->postJson('/api/v1/hospital-admission/vital-signs', [
            'respiratoryRate' => 2,
            'oxygenSaturation' => 98,
            'systolicBloodPressure' => 120,
            'pulse' => 72,
            'temperature' => 36.8,
        ])->assertStatus(422);

        $this->postJson('/api/v1/hospital-admission/vital-signs', [
            'respiratoryRate' => 16,
            'oxygenSaturation' => 98,
            'spo2Scale' => 'scale1',
            'supplementalOxygen' => false,
            'systolicBloodPressure' => 120,
            'pulse' => 72,
            'consciousness' => 'alert',
            'temperature' => 36.8,
        ])->assertCreated()
            ->assertJsonMissingPath('simulated')
            ->assertJsonPath('news2.total', 0)
            ->assertJsonPath('news2.visualLabel', 'Riesgo bajo');
    }

    public function test_reconciliation_risk_kardex_and_signature(): void
    {
        $this->asRole('enfermera_piso');
        $this->postJson('/api/v1/hospital-admission/medication-reconciliations', [
            'allergies' => 'Penicilina',
            'medications' => [[
                'name' => 'Amoxicilina',
                'dose' => '500 mg',
                'frequency' => 'cada 8 horas',
                'route' => 'oral',
            ]],
        ])->assertCreated()
            ->assertJsonPath('reconciliation.status', 'con_observaciones')
            ->assertJsonPath('reconciliation.statusLabel', 'Con observaciones');

        $this->postJson('/api/v1/hospital-admission/risk-scales', [
            'morse' => [
                'historyOfFalling' => true,
                'secondaryDiagnosis' => false,
                'ambulatoryAid' => 'none',
                'intravenousAccess' => false,
                'gait' => 'impaired',
                'mentalStatus' => 'oriented',
            ],
            'braden' => [
                'sensoryPerception' => 1,
                'moisture' => 1,
                'activity' => 1,
                'mobility' => 1,
                'nutrition' => 1,
                'frictionShear' => 1,
            ],
        ])->assertCreated()
            ->assertJsonPath('morse.total', 45)
            ->assertJsonPath('braden.level', 'severe');

        $this->getJson('/api/v1/hospital-admission/kardex/ENC-0001')
            ->assertOk()
            ->assertJsonPath('kardex.patientName', 'Ana María Quispe Rojas')
            ->assertJsonMissingPath('simulated');

        $this->asRole('medico_residente');
        $this->getJson('/api/v1/hospital-admission/medical-orders/ENC-0001')
            ->assertOk()
            ->assertJsonPath('orders.statusLabel', 'Pendiente de firma');

        $this->postJson('/api/v1/hospital-admission/medical-orders/ENC-0001/sign', [
            'physicianName' => 'Dr. Mateo Salas',
            'confirmed' => false,
        ])->assertStatus(422);

        $this->postJson('/api/v1/hospital-admission/medical-orders/ENC-0001/sign', [
            'physicianName' => 'Dr. Mateo Salas',
            'credential' => 'CMP 12345',
            'confirmed' => true,
        ])->assertCreated()->assertJsonPath('signature.status', 'firmado');
    }

    public function test_tratante_can_sign_medical_orders(): void
    {
        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-TRAT-ORD',
            'order_number' => 'OI-2026-TRAT-1',
            'source' => 'manual',
            'patient_name' => 'Paciente Tratante Demo',
            'document_type' => 'DNI',
            'document_number' => '11223344',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'current_step' => 'indicaciones',
            'deliverables' => [],
            'clinical_payload' => [
                'medicalOrders' => [
                    'status' => 'pendiente',
                    'statusLabel' => 'Pendiente de firma',
                    'items' => ['Reposo relativo'],
                ],
            ],
        ]);

        $this->asRole('medico_tratante');
        $this->getJson('/api/v1/hospital-admission/medical-orders/ENC-TRAT-ORD')
            ->assertOk()
            ->assertJsonPath('orders.statusLabel', 'Pendiente de firma');

        $this->postJson('/api/v1/hospital-admission/medical-orders/ENC-TRAT-ORD/sign', [
            'physicianName' => 'Dra. Tratante Demo',
            'credential' => 'CMP 55443',
            'confirmed' => true,
        ])->assertCreated()->assertJsonPath('signature.status', 'firmado');
    }

    public function test_medical_orders_default_template_without_prior_payload(): void
    {
        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-ORD-EMPTY',
            'order_number' => 'OI-2026-ORD-EMPTY',
            'source' => 'manual',
            'patient_name' => 'Paciente Sin Indicaciones Previas',
            'document_type' => 'DNI',
            'document_number' => '55667788',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'SIS',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'SIS',
            'current_step' => 'indicaciones',
            'deliverables' => [],
            'clinical_payload' => [],
        ]);

        $this->asRole('medico_residente');
        $this->getJson('/api/v1/hospital-admission/medical-orders/ENC-ORD-EMPTY')
            ->assertOk()
            ->assertJsonPath('orders.statusLabel', 'Pendiente de firma')
            ->assertJsonFragment(['Reposo relativo']);
    }
}
