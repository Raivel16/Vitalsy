<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\User;
use App\Models\VitalSignReading;
use App\Services\Admission\AdmissionBoard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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
            'birthDate' => '1978-04-12',
            'confirmed' => true,
            'encounterId' => 'ENC-0001',
        ])->assertOk()->assertJsonMissingPath('simulated')->assertJsonPath('validated', true);

        $this->getJson('/api/v1/hospital-admission/encounters/ENC-0001')
            ->assertOk()
            ->assertJsonPath('encounter.clinical.filiation.birthDate', '1978-04-12')
            ->assertJsonPath('encounter.clinical.filiation.fullName', 'Ana María Quispe Rojas');
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

    public function test_consent_stores_life_user_flag(): void
    {
        $this->asRole('admision');
        $this->postJson('/api/v1/hospital-admission/informed-consents', [
            'encounterId' => 'ENC-0001',
            'signerName' => 'Rosa Quispe',
            'accepted' => true,
            'lifeUser' => true,
        ])->assertCreated();

        $payload = AdmissionEncounter::query()->where('encounter_id', 'ENC-0001')->first()->clinical_payload;
        $this->assertTrue($payload['consent']['lifeUser']);

        $this->postJson('/api/v1/hospital-admission/informed-consents', [
            'encounterId' => 'ENC-0001',
            'signerName' => 'Rosa Quispe',
            'accepted' => true,
            'lifeUser' => 'tal vez',
        ])->assertStatus(422);
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
            'encounterId' => 'ENC-0001',
            'respiratoryRate' => 16,
            'oxygenSaturation' => 98,
            'spo2Scale' => 'scale1',
            'supplementalOxygen' => false,
            'systolicBloodPressure' => 120,
            'pulse' => 72,
            'consciousness' => 'alert',
            'temperature' => 36.8,
        ])->assertStatus(422);

        $stored = $this->postJson('/api/v1/hospital-admission/vital-signs', [
            'encounterId' => 'ENC-0001',
            'respiratoryRate' => 16,
            'oxygenSaturation' => 98,
            'spo2Scale' => 'scale1',
            'supplementalOxygen' => false,
            'systolicBloodPressure' => 120,
            'diastolicBloodPressure' => 80,
            'pulse' => 72,
            'consciousness' => 'alert',
            'temperature' => 36.8,
        ]);
        $stored->assertCreated()
            ->assertJsonMissingPath('simulated')
            ->assertJsonPath('news2.total', 0)
            ->assertJsonPath('news2.visualLabel', 'Riesgo bajo')
            ->assertJsonPath('alertActivated', false);
        $this->assertNotNull($stored->json('nextControlAt'));

        $this->assertDatabaseHas('vital_sign_readings', [
            'encounter_id' => 'ENC-0001',
            'sbp' => 120,
            'dbp' => 80,
        ]);
        $this->assertSame(1, VitalSignReading::query()->where('encounter_id', 'ENC-0001')->count());
        $this->assertDatabaseMissing('clinical_alerts', [
            'encounter_id' => 'ENC-0001',
            'source' => 'news2',
        ]);
        $this->assertDatabaseHas('monitoring_schedules', [
            'encounter_id' => 'ENC-0001',
            'frequency_minutes' => 720,
        ]);
    }

    public function test_admission_vitals_with_news2_open_a_clinical_alert(): void
    {
        $this->seedEncounter('ENC-ALERT', 'OI-2026-ALERT');
        $this->asRole('enfermera_piso');

        $this->postJson('/api/v1/hospital-admission/vital-signs', [
            'encounterId' => 'ENC-ALERT',
            'respiratoryRate' => 25,
            'oxygenSaturation' => 98,
            'spo2Scale' => 'scale1',
            'supplementalOxygen' => false,
            'systolicBloodPressure' => 120,
            'diastolicBloodPressure' => 80,
            'pulse' => 72,
            'consciousness' => 'alert',
            'temperature' => 36.8,
        ])->assertCreated()
            ->assertJsonPath('alertActivated', true)
            ->assertJsonPath('nextControlAt', null);

        $this->assertDatabaseHas('clinical_alerts', [
            'encounter_id' => 'ENC-ALERT',
            'source' => 'news2',
        ]);
        $this->assertDatabaseMissing('monitoring_schedules', [
            'encounter_id' => 'ENC-ALERT',
        ]);
        $this->assertSame(1, VitalSignReading::query()->where('encounter_id', 'ENC-ALERT')->count());
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

        $this->postJson('/api/v1/hospital-admission/medication-reconciliations', [
            'encounterId' => 'ENC-0001',
            'allergies' => null,
            'medications' => [],
            'noHomeMedications' => true,
        ])->assertCreated()
            ->assertJsonPath('reconciliation.status', 'validada')
            ->assertJsonPath('reconciliation.statusLabel', 'Validada: sin medicación habitual');

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

        $this->putJson('/api/v1/hospital-admission/medical-orders/ENC-0001', [
            'items' => [
                ['title' => 'Reposo relativo', 'detail' => 'Cabecera a 30 grados', 'category' => 'Cuidados'],
            ],
        ])->assertOk()
            ->assertJsonPath('orders.items.0.title', 'Reposo relativo');

        $this->postJson('/api/v1/hospital-admission/medical-orders/ENC-0001/sign', [
            'physicianName' => 'Dr. Mateo Salas',
            'credential' => 'CMP 12345',
            'confirmed' => true,
            'items' => [
                ['title' => 'Reposo relativo', 'detail' => 'Cabecera a 30 grados', 'category' => 'Cuidados'],
            ],
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
            ->assertJsonPath('orders.items', []);

        $this->postJson('/api/v1/hospital-admission/medical-orders/ENC-ORD-EMPTY/sign', [
            'physicianName' => 'Dr. Mateo Salas',
            'credential' => 'CMP 12345',
            'confirmed' => true,
            'items' => [],
        ])->assertStatus(422);

        $this->asRole('admision');
        $this->putJson('/api/v1/hospital-admission/medical-orders/ENC-ORD-EMPTY', [
            'items' => [['title' => 'Reposo relativo']],
        ])->assertForbidden();
    }

    public function test_signing_orders_creates_basal_emar_plan_from_bpmh(): void
    {
        Carbon::setTestNow('2026-09-21 14:30:00');
        $this->seedEncounter('ENC-BPMH', 'OI-2026-BPMH', [
            'assessment' => [
                'chiefComplaint' => 'Disnea de dos días',
                'allergies' => ['Penicilina'],
                'history' => 'HTA controlada',
            ],
            'vitals' => [
                'summary' => 'FR 22, SpO2 94 %, PA 150/90, pulso 98, 37.4 °C',
                'news2Label' => '5 puntos, riesgo medio',
            ],
            'risks' => [
                'fallRisk' => 'Riesgo alto de caídas, 45 puntos',
                'pressureRisk' => 'Riesgo leve de úlceras por presión, 18 puntos',
            ],
            'reconciliation' => [
                'noHomeMedications' => false,
                'medications' => [[
                    'name' => 'Losartán',
                    'dose' => '50 mg',
                    'frequency' => 'cada 8 horas',
                ]],
                'alerts' => ['Revisar presión arterial.'],
                'notes' => 'Toma matutina',
            ],
        ]);

        $this->asRole('medico_residente');
        $this->getJson('/api/v1/hospital-admission/medical-orders/ENC-BPMH')
            ->assertOk()
            ->assertJsonPath('orders.chiefComplaint', 'Disnea de dos días')
            ->assertJsonPath('orders.history', 'HTA controlada')
            ->assertJsonPath('orders.vitals.news2Label', '5 puntos, riesgo medio')
            ->assertJsonPath('orders.risks.fallRisk', 'Riesgo alto de caídas, 45 puntos')
            ->assertJsonPath('orders.reconciliation.medications.0.name', 'Losartán')
            ->assertJsonPath('orders.reconciliation.notes', 'Toma matutina')
            ->assertJsonPath('orders.reconciliation.alerts.0', 'Revisar presión arterial.');

        $this->postJson('/api/v1/hospital-admission/medical-orders/ENC-BPMH/sign', [
            'physicianName' => 'Dr. Mateo Salas',
            'credential' => 'CMP 12345',
            'confirmed' => true,
            'items' => [
                ['title' => 'Reposo relativo', 'detail' => 'Cabecera a 30 grados', 'category' => 'Cuidados'],
            ],
        ])->assertCreated()->assertJsonPath('signature.status', 'firmado');

        $this->assertDatabaseHas('prescriptions', [
            'encounter_id' => 'ENC-BPMH',
            'status' => 'activo',
        ]);
        $this->assertDatabaseHas('prescription_items', [
            'drug_name' => 'Losartán',
            'dose' => '50 mg',
            'route' => 'oral',
            'frequency' => 'cada 8 horas',
        ]);
        $this->assertDatabaseMissing('prescription_items', [
            'drug_name' => 'Reposo relativo',
        ]);

        $this->asRole('enfermera_piso');
        $this->getJson('/api/v1/inpatient-care/encounters/ENC-BPMH/emar')
            ->assertOk()
            ->assertJsonPath('hasActivePrescription', true)
            ->assertJsonFragment(['drugName' => 'Losartán', 'status' => 'pendiente']);

        Carbon::setTestNow();
    }

    public function test_signing_without_home_medications_does_not_create_a_plan(): void
    {
        $this->seedEncounter('ENC-NOMED', 'OI-2026-NOMED', [
            'reconciliation' => [
                'noHomeMedications' => true,
                'medications' => [],
            ],
        ]);

        $this->asRole('medico_tratante');
        $this->postJson('/api/v1/hospital-admission/medical-orders/ENC-NOMED/sign', [
            'physicianName' => 'Dra. Tratante Demo',
            'credential' => 'CMP 55443',
            'confirmed' => true,
            'items' => [
                ['title' => 'Dieta blanda', 'detail' => '', 'category' => 'Dieta'],
            ],
        ])->assertCreated()->assertJsonPath('signature.status', 'firmado');

        $this->assertDatabaseMissing('prescriptions', [
            'encounter_id' => 'ENC-NOMED',
        ]);
    }

    /**
     * @param  array<string, mixed>  $clinical
     */
    private function seedEncounter(string $encounterId, string $orderNumber, array $clinical = []): void
    {
        AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => $orderNumber,
            'source' => 'manual',
            'patient_name' => 'Paciente de prueba',
            'document_type' => 'DNI',
            'document_number' => '99887766',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'SIS',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'SIS',
            'current_step' => 'indicaciones',
            'deliverables' => [],
            'clinical_payload' => $clinical,
        ]);
    }
}
