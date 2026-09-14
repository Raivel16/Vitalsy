<?php

namespace App\Services\Admission;

use App\Models\AdmissionEncounter;
use RuntimeException;

class AdmissionBoardException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status)
    {
        parent::__construct($message);
    }
}

class AdmissionBoard
{
    /**
     * @var array<string, array{role: string, next: string|null, subprocess: string, label: string, status: string, deliverable: string|null}>
     */
    private const STEPS = [
        'orden' => ['role' => 'admision', 'next' => 'filiacion', 'subprocess' => '1.1', 'label' => 'Consultar orden de internamiento', 'status' => 'Orden por consultar', 'deliverable' => null],
        'filiacion' => ['role' => 'admision', 'next' => 'cobertura', 'subprocess' => '1.1', 'label' => 'Validar filiación', 'status' => 'Filiación por validar', 'deliverable' => null],
        'cobertura' => ['role' => 'admision', 'next' => 'brazalete', 'subprocess' => '1.1', 'label' => 'Validar cobertura', 'status' => 'Cobertura por validar', 'deliverable' => 'fichaAdmision'],
        'derivacion' => ['role' => 'admision', 'next' => null, 'subprocess' => '1.1', 'label' => 'Derivar trámite de cobertura', 'status' => 'Cobertura en trámite', 'deliverable' => null],
        'brazalete' => ['role' => 'admision', 'next' => 'expediente', 'subprocess' => '1.1', 'label' => 'Emitir brazalete', 'status' => 'Brazalete por emitir', 'deliverable' => 'brazalete'],
        'expediente' => ['role' => 'admision', 'next' => 'consentimiento', 'subprocess' => '1.1', 'label' => 'Aperturar expediente', 'status' => 'Expediente por aperturar', 'deliverable' => 'expediente'],
        'consentimiento' => ['role' => 'admision', 'next' => 'traslado', 'subprocess' => '1.1', 'label' => 'Registrar consentimiento', 'status' => 'Consentimiento por firmar', 'deliverable' => 'consentimiento'],
        'traslado' => ['role' => 'celador', 'next' => 'identidad', 'subprocess' => '1.2', 'label' => 'Consultar orden de traslado', 'status' => 'Listo para traslado', 'deliverable' => null],
        'identidad' => ['role' => 'celador', 'next' => 'recepcion', 'subprocess' => '1.2', 'label' => 'Verificar identidad', 'status' => 'Identidad por confirmar', 'deliverable' => null],
        'recepcion' => ['role' => 'enfermeria', 'next' => 'valoracion', 'subprocess' => '1.2', 'label' => 'Confirmar recepción en piso', 'status' => 'Pendiente de recepción', 'deliverable' => 'recepcion'],
        'valoracion' => ['role' => 'enfermeria', 'next' => 'constantes', 'subprocess' => '1.3', 'label' => 'Registrar valoración inicial', 'status' => 'Valoración por registrar', 'deliverable' => 'valoracion'],
        'constantes' => ['role' => 'enfermeria', 'next' => 'conciliacion', 'subprocess' => '1.3', 'label' => 'Registrar constantes basales', 'status' => 'Constantes por registrar', 'deliverable' => 'signosVitales'],
        'conciliacion' => ['role' => 'enfermeria', 'next' => 'escalas', 'subprocess' => '1.3', 'label' => 'Conciliar medicamentos', 'status' => 'Conciliación por registrar', 'deliverable' => 'bpmh'],
        'escalas' => ['role' => 'enfermeria', 'next' => 'kardex', 'subprocess' => '1.3', 'label' => 'Completar escalas de riesgo', 'status' => 'Escalas por completar', 'deliverable' => 'escalas'],
        'kardex' => ['role' => 'enfermeria', 'next' => 'indicaciones', 'subprocess' => '1.3', 'label' => 'Revisar Kardex de ingreso', 'status' => 'Kardex por revisar', 'deliverable' => 'kardex'],
        'indicaciones' => ['role' => 'medico', 'next' => 'cerrado', 'subprocess' => '1.3', 'label' => 'Firmar indicaciones médicas', 'status' => 'Indicaciones por firmar', 'deliverable' => 'indicaciones'],
        'cerrado' => ['role' => 'medico', 'next' => null, 'subprocess' => '1.3', 'label' => 'Ingreso cerrado', 'status' => 'Ingreso cerrado', 'deliverable' => null],
    ];

    /**
     * @var array<string, string>
     */
    private const DELIVERABLES = [
        'fichaAdmision' => 'Ficha digital de admisión',
        'brazalete' => 'Brazalete de identificación',
        'expediente' => 'Expediente clínico electrónico',
        'consentimiento' => 'Consentimiento informado',
        'recepcion' => 'Recepción en piso',
        'valoracion' => 'Ficha de valoración inicial',
        'signosVitales' => 'Registro basal de signos vitales',
        'bpmh' => 'Conciliación farmacéutica',
        'escalas' => 'Escalas de riesgo',
        'kardex' => 'Kardex electrónico',
        'indicaciones' => 'Indicaciones médicas de ingreso',
    ];

    /**
     * @var array<string, string>
     */
    private const SUBPROCESS = [
        '1.1' => 'Verificación y registro administrativo',
        '1.2' => 'Traslado y recepción en piso',
        '1.3' => 'Valoración inicial y conciliación',
    ];

    public function ensureDemo(): void
    {
        if (AdmissionEncounter::query()->exists()) {
            return;
        }

        $blank = array_fill_keys(array_keys(self::DELIVERABLES), false);
        $admitted = $blank;
        $admitted['fichaAdmision'] = true;
        $admitted['brazalete'] = true;
        $admitted['expediente'] = true;
        $admitted['consentimiento'] = true;

        AdmissionEncounter::query()->insert([
            $this->row('ENC-0003', 'OI-2026-0003', null, 'Carmen Yolanda Vega', '09881234', 'Consulta externa', 'Particular', 'rechazada', 'Sin cobertura vigente', null, null, null, null, null, 'derivacion', null, $blank),
            $this->row('ENC-0002', 'OI-2026-0002', null, 'Luis Ernesto Paredes', '40112233', 'Emergencia adultos', 'EsSalud', 'pendiente', 'Regular', null, null, null, null, null, 'cobertura', null, $blank),
            $this->row('ENC-0001', 'OI-2026-0001', 'OT-2026-0001', 'Ana María Quispe Rojas', '45678912', 'Emergencia adultos', 'SIS', 'aprobada', 'SIS Gratuito', '312', 'B', 'Medicina interna', 'BRZ-0001-ANA', 'EXP-0001', 'traslado', null, $admitted),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(): array
    {
        $this->ensureDemo();

        return AdmissionEncounter::query()
            ->get()
            ->sortBy(fn (AdmissionEncounter $encounter) => $this->sortKey($encounter))
            ->values()
            ->map(fn (AdmissionEncounter $encounter) => $this->present($encounter))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function find(string $encounterId): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);

        return $this->present($encounter);
    }

    /**
     * @return array<string, mixed>
     */
    public function openFromOrder(string $orderNumber): array
    {
        $this->ensureDemo();
        $existing = AdmissionEncounter::query()->where('order_number', $orderNumber)->first();
        if ($existing) {
            return $this->present($existing);
        }

        $order = $this->orders()[$orderNumber] ?? null;
        if (! $order) {
            throw new AdmissionBoardException('No se encontró la orden.', 404);
        }

        $encounter = AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-'.str_pad((string) (AdmissionEncounter::query()->count() + 1), 4, '0', STR_PAD_LEFT),
            'order_number' => $order['orderNumber'],
            'patient_name' => $order['patient']['fullName'],
            'document_type' => 'DNI',
            'document_number' => $order['patient']['documentNumber'],
            'origin_service' => $order['originService'],
            'coverage_payer' => $order['coverage']['payer'],
            'coverage_status' => $order['coverage']['status'],
            'coverage_plan' => $order['coverage']['plan'],
            'current_step' => 'filiacion',
            'deliverables' => array_fill_keys(array_keys(self::DELIVERABLES), false),
        ]);

        return $this->present($encounter);
    }

    /**
     * @return array<string, mixed>
     */
    public function advance(string $encounterId, string $step, string $role, ?string $coverageStatus = null): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $definition = self::STEPS[$step] ?? null;
        if (! $definition) {
            throw new AdmissionBoardException('Este no es el paso vigente del ingreso.', 422);
        }

        $resolvingCoverage = $coverageStatus === 'aprobada'
            && in_array($step, ['cobertura', 'derivacion'], true);

        if ($encounter->waiting_reason && ! $resolvingCoverage) {
            throw new AdmissionBoardException('La cobertura no permite continuar. Derive el trámite.', 422);
        }
        if ($encounter->current_step === 'cerrado' || $encounter->current_step !== $step) {
            throw new AdmissionBoardException('Este no es el paso vigente del ingreso.', 422);
        }
        if ($definition['role'] !== $role) {
            throw new AdmissionBoardException('Este paso corresponde a otro perfil.', 403);
        }

        if ($coverageStatus !== null) {
            $encounter->coverage_status = $coverageStatus;
        }

        $status = $encounter->coverage_status;
        $deliverables = $encounter->deliverables;
        if ($definition['deliverable']) {
            $deliverables[$definition['deliverable']] = true;
        }

        $next = $definition['next'];
        $waiting = null;

        if ($step === 'cobertura' || $step === 'derivacion') {
            if ($status === 'aprobada') {
                $next = 'brazalete';
                $waiting = null;
                $deliverables['fichaAdmision'] = true;
            } else {
                $next = 'derivacion';
                $deliverables['fichaAdmision'] = false;
                if ($step === 'derivacion') {
                    $waiting = 'cobertura';
                }
            }
        }

        $encounter->fill([
            'current_step' => $next ?? $encounter->current_step,
            'waiting_reason' => $waiting,
            'coverage_status' => $status,
            'deliverables' => $deliverables,
        ])->save();

        return $this->present($encounter->refresh());
    }

    private function locate(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new AdmissionBoardException('No se encontró el ingreso.', 404);
        }

        return $encounter;
    }

    /**
     * @param  array<string, bool>  $deliverables
     * @return array<string, mixed>
     */
    private function row(
        string $encounterId,
        string $orderNumber,
        ?string $transfer,
        string $name,
        string $document,
        string $origin,
        string $payer,
        string $coverage,
        string $plan,
        ?string $room,
        ?string $bed,
        ?string $service,
        ?string $wristband,
        ?string $record,
        string $step,
        ?string $waiting,
        array $deliverables,
    ): array {
        $now = now();

        return [
            'encounter_id' => $encounterId,
            'order_number' => $orderNumber,
            'transfer_order_number' => $transfer,
            'patient_name' => $name,
            'document_type' => 'DNI',
            'document_number' => $document,
            'origin_service' => $origin,
            'coverage_payer' => $payer,
            'coverage_status' => $coverage,
            'coverage_plan' => $plan,
            'room' => $room,
            'bed' => $bed,
            'service' => $service,
            'wristband_code' => $wristband,
            'record_id' => $record,
            'current_step' => $step,
            'waiting_reason' => $waiting,
            'deliverables' => json_encode($deliverables, JSON_THROW_ON_ERROR),
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function sortKey(AdmissionEncounter $encounter): string
    {
        $index = array_search($encounter->current_step, array_keys(self::STEPS), true);

        return str_pad((string) $index, 2, '0', STR_PAD_LEFT).$encounter->patient_name;
    }

    /**
     * @return array<string, mixed>
     */
    private function present(AdmissionEncounter $encounter): array
    {
        $step = self::STEPS[$encounter->current_step];
        $flags = $encounter->deliverables;
        $deliverables = [];
        foreach (self::DELIVERABLES as $id => $label) {
            $deliverables[] = ['id' => $id, 'label' => $label, 'done' => (bool) ($flags[$id] ?? false)];
        }

        $waiting = $encounter->waiting_reason !== null;

        return [
            'encounterId' => $encounter->encounter_id,
            'orderNumber' => $encounter->order_number,
            'transferOrderNumber' => $encounter->transfer_order_number,
            'patientName' => $encounter->patient_name,
            'documentType' => $encounter->document_type,
            'documentNumber' => $encounter->document_number,
            'originService' => $encounter->origin_service,
            'coverage' => [
                'payer' => $encounter->coverage_payer,
                'status' => $encounter->coverage_status,
                'plan' => $encounter->coverage_plan,
            ],
            'location' => [
                'room' => $encounter->room,
                'bed' => $encounter->bed,
                'service' => $encounter->service,
            ],
            'wristbandCode' => $encounter->wristband_code,
            'recordId' => $encounter->record_id,
            'subprocess' => $step['subprocess'],
            'subprocessLabel' => self::SUBPROCESS[$step['subprocess']],
            'currentStep' => $encounter->current_step,
            'currentStepLabel' => $waiting ? 'Esperar regularización de cobertura' : $step['label'],
            'nextRole' => $waiting || $encounter->current_step === 'cerrado' ? null : $step['role'],
            'statusLabel' => $waiting ? 'En trámite de cobertura' : $step['status'],
            'deliverables' => $deliverables,
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function orders(): array
    {
        return [
            'OI-2026-0001' => [
                'orderNumber' => 'OI-2026-0001',
                'originService' => 'Emergencia adultos',
                'patient' => ['fullName' => 'Ana María Quispe Rojas', 'documentNumber' => '45678912'],
                'coverage' => ['payer' => 'SIS', 'status' => 'aprobada', 'plan' => 'SIS Gratuito'],
            ],
            'OI-2026-0002' => [
                'orderNumber' => 'OI-2026-0002',
                'originService' => 'Emergencia adultos',
                'patient' => ['fullName' => 'Luis Ernesto Paredes', 'documentNumber' => '40112233'],
                'coverage' => ['payer' => 'EsSalud', 'status' => 'pendiente', 'plan' => 'Regular'],
            ],
            'OI-2026-0003' => [
                'orderNumber' => 'OI-2026-0003',
                'originService' => 'Consulta externa',
                'patient' => ['fullName' => 'Carmen Yolanda Vega', 'documentNumber' => '09881234'],
                'coverage' => ['payer' => 'Particular', 'status' => 'rechazada', 'plan' => 'Sin cobertura vigente'],
            ],
        ];
    }
}
