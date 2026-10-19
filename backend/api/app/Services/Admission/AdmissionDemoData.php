<?php

namespace App\Services\Admission;

use App\Models\AdmissionEncounter;

/** Catálogo de órdenes de internamiento y siembra de ingresos de demostración. */
class AdmissionDemoData
{
    private const EMERGENCY_ADULTS = 'Emergencia adultos';

    private const OUTPATIENT = 'Consulta externa';

    private const FULL_NAME = 'fullName';

    private const DOCUMENT_NUMBER = 'documentNumber';

    private const PHYSICIAN = 'Dra. Lucía Herrera';

    /** Siembra los ingresos de demostración solo si no existe ninguno. */
    public function seed(): void
    {
        if (AdmissionEncounter::query()->exists()) {
            return;
        }

        $blank = array_fill_keys(array_keys(AdmissionBoard::DELIVERABLES), false);
        $admitted = [...$blank, 'fichaAdmision' => true, 'brazalete' => true, 'expediente' => true, 'consentimiento' => true];

        AdmissionEncounter::query()->insert([
            $this->row([
                'encounter_id' => 'ENC-0003', 'order_number' => 'OI-2026-0003',
                'patient_name' => 'Carmen Yolanda Vega', 'document_number' => '09881234',
                'origin_service' => self::OUTPATIENT, 'coverage_payer' => 'Particular',
                'coverage_status' => 'rechazada', 'coverage_plan' => 'Sin cobertura vigente',
                'current_step' => 'derivacion', 'deliverables' => $blank,
            ]),
            $this->row([
                'encounter_id' => 'ENC-0002', 'order_number' => 'OI-2026-0002',
                'patient_name' => 'Luis Ernesto Paredes', 'document_number' => '40112233',
                'origin_service' => self::EMERGENCY_ADULTS, 'coverage_payer' => 'EsSalud',
                'coverage_status' => 'pendiente', 'coverage_plan' => 'Regular',
                'current_step' => 'cobertura', 'deliverables' => $blank,
            ]),
            $this->row([
                'encounter_id' => 'ENC-0001', 'order_number' => 'OI-2026-0001',
                'transfer_order_number' => 'OT-2026-0001',
                'patient_name' => 'Ana María Quispe Rojas', 'document_number' => '45678912',
                'origin_service' => self::EMERGENCY_ADULTS, 'coverage_payer' => 'SIS',
                'coverage_status' => 'aprobada', 'coverage_plan' => 'SIS Gratuito',
                'room' => '312', 'bed' => 'B', 'service' => 'Medicina interna',
                'wristband_code' => 'BRZ-0001-ANA', 'record_id' => 'EXP-0001',
                'current_step' => 'traslado', 'deliverables' => $admitted,
            ]),
        ]);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function catalogOrders(): array
    {
        $patient = [
            self::FULL_NAME => 'Ana María Quispe Rojas',
            'documentType' => 'DNI',
            self::DOCUMENT_NUMBER => '45678912',
            'birthDate' => '1978-04-12',
            'sex' => 'Femenino',
        ];

        return [
            'OI-2026-0001' => [
                'orderNumber' => 'OI-2026-0001',
                'originService' => self::EMERGENCY_ADULTS,
                'requestingPhysician' => self::PHYSICIAN,
                'reason' => 'Neumonía adquirida en la comunidad',
                'patient' => $patient,
                'coverage' => ['payer' => 'SIS', 'status' => 'aprobada', 'plan' => 'SIS Gratuito'],
            ],
            'OI-2026-0002' => [
                'orderNumber' => 'OI-2026-0002',
                'originService' => self::EMERGENCY_ADULTS,
                'requestingPhysician' => 'Dr. Mateo Salas',
                'reason' => 'Dolor abdominal',
                'patient' => [...$patient, self::FULL_NAME => 'Luis Ernesto Paredes', self::DOCUMENT_NUMBER => '40112233'],
                'coverage' => ['payer' => 'EsSalud', 'status' => 'pendiente', 'plan' => 'Regular'],
            ],
            'OI-2026-0003' => [
                'orderNumber' => 'OI-2026-0003',
                'originService' => self::OUTPATIENT,
                'requestingPhysician' => self::PHYSICIAN,
                'reason' => 'Control de insuficiencia cardíaca',
                'patient' => [...$patient, self::FULL_NAME => 'Carmen Yolanda Vega', self::DOCUMENT_NUMBER => '09881234'],
                'coverage' => ['payer' => 'Particular', 'status' => 'rechazada', 'plan' => 'Sin cobertura vigente'],
            ],
        ];
    }

    /**
     * Fila de inserción con los valores por defecto de un ingreso de demostración.
     *
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    private function row(array $fields): array
    {
        $now = now();
        $row = [
            'encounter_id' => null,
            'order_number' => null,
            'source' => 'demo',
            'transfer_order_number' => null,
            'patient_name' => null,
            'document_type' => 'DNI',
            'document_number' => null,
            'origin_service' => null,
            'coverage_payer' => null,
            'coverage_status' => null,
            'coverage_plan' => null,
            'room' => null,
            'bed' => null,
            'service' => null,
            'wristband_code' => null,
            'record_id' => null,
            'current_step' => null,
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => null,
            'created_at' => $now,
            'updated_at' => $now,
            ...$fields,
        ];
        $row['deliverables'] = json_encode($row['deliverables'], JSON_THROW_ON_ERROR);

        return $row;
    }
}
