<?php

namespace Tests\Feature;

use Tests\TestCase;

class HospitalAdmissionApiTest extends TestCase
{
    public function test_admission_order_returns_simulated_json_or_not_found(): void
    {
        $found = $this->getJson('/api/v1/hospital-admission/admission-orders/OI-2026-0001');
        $found->assertOk()
            ->assertJsonPath('simulated', true)
            ->assertJsonPath('order.patient.fullName', 'Ana María Quispe Rojas')
            ->assertJsonPath('order.coverage.status', 'aprobada');

        $this->getJson('/api/v1/hospital-admission/admission-orders/OI-0000')
            ->assertNotFound()
            ->assertJsonPath('simulated', true)
            ->assertJsonPath('message', 'No se encontró la orden.');
    }

    public function test_filiation_requires_name_and_accepts_a_valid_payload(): void
    {
        $this->postJson('/api/v1/hospital-admission/filiation/validate', [])
            ->assertStatus(422)
            ->assertJsonPath('simulated', true);

        $this->postJson('/api/v1/hospital-admission/filiation/validate', [
            'fullName' => 'Ana María Quispe Rojas',
            'documentNumber' => '45678912',
            'confirmed' => true,
        ])->assertOk()->assertJsonPath('simulated', true)->assertJsonPath('validated', true);
    }

    public function test_coverage_referral_wristband_record_and_consent_are_simulated_creates(): void
    {
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
            'signerName' => 'Rosa Quispe',
            'accepted' => false,
        ])->assertStatus(422);

        $this->postJson('/api/v1/hospital-admission/informed-consents', [
            'signerName' => 'Rosa Quispe',
            'accepted' => true,
        ])->assertCreated()->assertJsonPath('consent.status', 'firmado');
    }

    public function test_transfer_identity_reception_and_relocation(): void
    {
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
            ->assertJsonPath('simulated', true)
            ->assertJsonPath('news2.total', 0)
            ->assertJsonPath('news2.visualLabel', 'Riesgo bajo');
    }

    public function test_reconciliation_risk_kardex_and_signature(): void
    {
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
            ->assertJsonPath('simulated', true);

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
}
