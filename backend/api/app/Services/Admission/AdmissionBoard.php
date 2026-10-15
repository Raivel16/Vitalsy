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
        'traslado' => ['role' => 'camillero', 'next' => 'identidad', 'subprocess' => '1.2', 'label' => 'Consultar orden de traslado', 'status' => 'Listo para traslado', 'deliverable' => null],
        'identidad' => ['role' => 'camillero', 'next' => 'recepcion', 'subprocess' => '1.2', 'label' => 'Verificar identidad', 'status' => 'Identidad por confirmar', 'deliverable' => null],
        'recepcion' => ['role' => 'enfermera_piso', 'next' => 'valoracion', 'subprocess' => '1.2', 'label' => 'Confirmar recepción en piso', 'status' => 'Pendiente de recepción', 'deliverable' => 'recepcion'],
        'valoracion' => ['role' => 'enfermera_piso', 'next' => 'constantes', 'subprocess' => '1.3', 'label' => 'Registrar valoración inicial', 'status' => 'Valoración por registrar', 'deliverable' => 'valoracion'],
        'constantes' => ['role' => 'enfermera_piso', 'next' => 'conciliacion', 'subprocess' => '1.3', 'label' => 'Registrar constantes basales', 'status' => 'Constantes por registrar', 'deliverable' => 'signosVitales'],
        'conciliacion' => ['role' => 'enfermera_piso', 'next' => 'escalas', 'subprocess' => '1.3', 'label' => 'Conciliar medicamentos', 'status' => 'Conciliación por registrar', 'deliverable' => 'bpmh'],
        'escalas' => ['role' => 'enfermera_piso', 'next' => 'kardex', 'subprocess' => '1.3', 'label' => 'Completar escalas de riesgo', 'status' => 'Escalas por completar', 'deliverable' => 'escalas'],
        'kardex' => ['role' => 'enfermera_piso', 'next' => 'indicaciones', 'subprocess' => '1.3', 'label' => 'Revisar Kardex de ingreso', 'status' => 'Kardex por revisar', 'deliverable' => 'kardex'],
        'indicaciones' => ['role' => 'medico_residente', 'next' => 'cerrado', 'subprocess' => '1.3', 'label' => 'Firmar indicaciones médicas', 'status' => 'Indicaciones por firmar', 'deliverable' => 'indicaciones'],
        'cerrado' => ['role' => 'medico_residente', 'next' => null, 'subprocess' => '1.3', 'label' => 'Ingreso cerrado', 'status' => 'Ingreso cerrado', 'deliverable' => null],
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

    /**
     * @var list<string>
     */
    private const FLOW_STEPS = [
        'orden', 'filiacion', 'cobertura', 'brazalete', 'expediente', 'consentimiento',
        'traslado', 'identidad', 'recepcion', 'valoracion', 'constantes', 'conciliacion',
        'escalas', 'kardex', 'indicaciones',
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
            $this->row('ENC-0003', 'OI-2026-0003', null, 'Carmen Yolanda Vega', '09881234', 'Consulta externa', 'Particular', 'rechazada', 'Sin cobertura vigente', null, null, null, null, null, 'derivacion', null, $blank, 'demo'),
            $this->row('ENC-0002', 'OI-2026-0002', null, 'Luis Ernesto Paredes', '40112233', 'Emergencia adultos', 'EsSalud', 'pendiente', 'Regular', null, null, null, null, null, 'cobertura', null, $blank, 'demo'),
            $this->row('ENC-0001', 'OI-2026-0001', 'OT-2026-0001', 'Ana María Quispe Rojas', '45678912', 'Emergencia adultos', 'SIS', 'aprobada', 'SIS Gratuito', '312', 'B', 'Medicina interna', 'BRZ-0001-ANA', 'EXP-0001', 'traslado', null, $admitted, 'demo'),
        ]);
    }

    /**
     * @return array{encounters: list<array<string, mixed>>, meta: array{total: int, page: int, perPage: int, lastPage: int}}
     */
    public function list(?string $query = null, int $page = 1, int $perPage = 10): array
    {
        $this->ensureDemo();

        $builder = AdmissionEncounter::query()->where('current_step', '!=', 'egresado');
        $term = trim((string) $query);
        if ($term !== '') {
            $like = '%'.mb_strtolower($term).'%';
            $builder->where(function ($filter) use ($like) {
                $filter
                    ->whereRaw('LOWER(patient_name) like ?', [$like])
                    ->orWhereRaw('LOWER(document_number) like ?', [$like])
                    ->orWhereRaw('LOWER(encounter_id) like ?', [$like])
                    ->orWhereRaw('LOWER(order_number) like ?', [$like])
                    ->orWhereRaw('LOWER(wristband_code) like ?', [$like]);
            });
        }

        $sorted = $builder
            ->get()
            ->sortBy(fn (AdmissionEncounter $encounter) => $this->sortKey($encounter))
            ->values();

        $total = $sorted->count();
        $perPage = max(1, min(50, $perPage));
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = max(1, min($page, $lastPage));
        $encounters = $sorted
            ->slice(($page - 1) * $perPage, $perPage)
            ->values()
            ->map(fn (AdmissionEncounter $encounter) => $this->present($encounter))
            ->all();

        return [
            'encounters' => $encounters,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'perPage' => $perPage,
                'lastPage' => $lastPage,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function find(string $encounterId): array
    {
        $this->ensureDemo();

        return $this->present($this->locate($encounterId));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findOrder(string $orderNumber): ?array
    {
        $this->ensureDemo();
        $encounter = AdmissionEncounter::query()->where('order_number', $orderNumber)->first();
        if ($encounter) {
            $payload = $encounter->readablePayload();

            return [
                'orderNumber' => $encounter->order_number,
                'originService' => $encounter->origin_service,
                'requestingPhysician' => $payload['requestingPhysician'] ?? null,
                'reason' => $payload['reason'] ?? null,
                'patient' => [
                    'fullName' => $encounter->patient_name,
                    'documentType' => $encounter->document_type,
                    'documentNumber' => $encounter->document_number,
                ],
                'coverage' => [
                    'payer' => $encounter->coverage_payer,
                    'status' => $encounter->coverage_status,
                    'plan' => $encounter->coverage_plan,
                ],
            ];
        }

        return $this->catalogOrders()[$orderNumber] ?? null;
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

        $order = $this->catalogOrders()[$orderNumber] ?? null;
        if (! $order) {
            throw new AdmissionBoardException('No se encontró la orden.', 404);
        }

        $encounter = AdmissionEncounter::query()->create([
            'encounter_id' => $this->nextEncounterId(),
            'order_number' => $order['orderNumber'],
            'source' => 'catalog',
            'patient_name' => $order['patient']['fullName'],
            'document_type' => $order['patient']['documentType'] ?? 'DNI',
            'document_number' => $order['patient']['documentNumber'],
            'origin_service' => $order['originService'],
            'coverage_payer' => $order['coverage']['payer'],
            'coverage_status' => $order['coverage']['status'],
            'coverage_plan' => $order['coverage']['plan'],
            'current_step' => 'filiacion',
            'deliverables' => array_fill_keys(array_keys(self::DELIVERABLES), false),
            'clinical_payload' => [
                'requestingPhysician' => $order['requestingPhysician'] ?? null,
                'reason' => $order['reason'] ?? null,
            ],
        ]);

        return $this->present($encounter);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function registerIntake(array $data, string $source): array
    {
        $this->ensureDemo();
        $orderNumber = $data['orderNumber'];
        if (AdmissionEncounter::query()->where('order_number', $orderNumber)->exists()) {
            throw new AdmissionBoardException('Ya existe un ingreso con esa orden.', 422);
        }

        $encounter = AdmissionEncounter::query()->create([
            'encounter_id' => $this->nextEncounterId(),
            'order_number' => $orderNumber,
            'source' => $source,
            'patient_name' => $data['patientName'],
            'document_type' => $data['documentType'] ?? 'DNI',
            'document_number' => $data['documentNumber'],
            'origin_service' => $data['originService'],
            'coverage_payer' => $data['coveragePayer'],
            'coverage_status' => $data['coverageStatus'],
            'coverage_plan' => $data['coveragePlan'],
            'room' => $data['room'] ?? null,
            'bed' => $data['bed'] ?? null,
            'service' => $data['service'] ?? null,
            'current_step' => 'orden',
            'deliverables' => array_fill_keys(array_keys(self::DELIVERABLES), false),
            'clinical_payload' => [
                'requestingPhysician' => $data['requestingPhysician'] ?? null,
                'reason' => $data['reason'] ?? null,
            ],
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
        $allowedRoles = $step === 'indicaciones'
            ? ['medico_residente', 'medico_tratante']
            : [$definition['role']];
        if (! in_array($role, $allowedRoles, true)) {
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

        if ($step === 'consentimiento' && $next === 'traslado') {
            $this->ensureTransferReady($encounter);
        }

        $encounter->fill([
            'current_step' => $next ?? $encounter->current_step,
            'waiting_reason' => $waiting,
            'coverage_status' => $status,
            'deliverables' => $deliverables,
            'transfer_order_number' => $encounter->transfer_order_number,
            'room' => $encounter->room,
            'bed' => $encounter->bed,
            'service' => $encounter->service,
        ])->save();

        return $this->present($encounter->refresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function findTransfer(string $orderNumber): array
    {
        $this->ensureDemo();
        $encounter = AdmissionEncounter::query()->where('transfer_order_number', $orderNumber)->first();
        if (! $encounter) {
            throw new AdmissionBoardException('No se encontró la orden de traslado.', 404);
        }

        return [
            'orderNumber' => $encounter->transfer_order_number,
            'encounterId' => $encounter->encounter_id,
            'patientName' => $encounter->patient_name,
            'room' => $encounter->room,
            'bed' => $encounter->bed,
            'service' => $encounter->service,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function verifyWristband(string $code): array
    {
        $this->ensureDemo();
        $encounter = AdmissionEncounter::query()->where('wristband_code', $code)->first();
        if (! $encounter) {
            throw new AdmissionBoardException('El código no corresponde al paciente.', 422);
        }

        return [
            'patientName' => $encounter->patient_name,
            'code' => $encounter->wristband_code,
            'encounterId' => $encounter->encounter_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function issueWristband(string $encounterId): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        if (! $encounter->wristband_code) {
            $encounter->wristband_code = $this->nextWristbandCode($encounter);
            $encounter->save();
        }

        return [
            'code' => $encounter->wristband_code,
            'recordId' => $encounter->record_id,
            'patientName' => $encounter->patient_name,
            'encounterId' => $encounter->encounter_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function openRecord(string $encounterId): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        if (! $encounter->record_id) {
            $suffix = preg_replace('/\D+/', '', $encounter->encounter_id) ?: (string) $encounter->id;
            $encounter->record_id = 'EXP-'.str_pad($suffix, 4, '0', STR_PAD_LEFT);
            $encounter->save();
        }

        return [
            'recordId' => $encounter->record_id,
            'status' => 'abierto',
            'encounterId' => $encounter->encounter_id,
        ];
    }

    /**
     * @param  array<string, mixed>  $consent
     * @return array<string, mixed>
     */
    public function storeConsent(string $encounterId, array $consent): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $payload['consent'] = $consent;
        $encounter->clinical_payload = $payload;
        $encounter->save();

        return ['status' => 'firmado', 'signerName' => $consent['signerName']];
    }

    /**
     * @param  array<string, mixed>  $referral
     * @return array<string, mixed>
     */
    public function storeReferral(string $encounterId, array $referral): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $payload['referral'] = [
            ...$referral,
            'status' => 'derivado',
            'registeredAt' => now()->toIso8601String(),
        ];
        $encounter->clinical_payload = $payload;
        $encounter->save();

        return [
            'destination' => $referral['destination'],
            'status' => 'derivado',
            'relativeName' => $referral['relativeName'],
            'relativePhone' => $referral['relativePhone'] ?? null,
            'registeredAt' => $payload['referral']['registeredAt'],
        ];
    }

    /**
     * @param  array<string, mixed>  $value
     */
    public function putClinical(string $encounterId, string $key, array $value): void
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $payload[$key] = $value;
        $encounter->clinical_payload = $payload;
        if ($key === 'relocation') {
            $encounter->room = $value['requestedRoom'] ?? $encounter->room;
            $encounter->bed = $value['requestedBed'] ?? $encounter->bed;
        }
        $encounter->save();
    }

    /**
     * @return array<string, mixed>
     */
    public function kardex(string $encounterId): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $assessment = $payload['assessment'] ?? null;
        $vitals = $payload['vitals'] ?? null;
        $reconciliation = $payload['reconciliation'] ?? null;
        $risks = $payload['risks'] ?? null;

        if (! $assessment && $encounter->encounter_id !== 'ENC-0001') {
            throw new AdmissionBoardException('Kardex no disponible.', 404);
        }

        $medications = [];
        foreach ($reconciliation['medications'] ?? [['name' => 'Amoxicilina', 'dose' => '500 mg', 'frequency' => 'cada 8 horas']] as $item) {
            $medications[] = trim(($item['name'] ?? '').' '.($item['dose'] ?? '').' '.($item['frequency'] ?? ''));
        }

        return [
            'patientName' => $encounter->patient_name,
            'assessment' => $assessment['chiefComplaint'] ?? 'Disnea de dos días',
            'allergies' => $assessment['allergies'] ?? ['Penicilina'],
            'medications' => $medications,
            'vitals' => $vitals['summary'] ?? 'FR 16, SpO2 98 %, PA 120, pulso 72, 36.8 °C',
            'news2' => $vitals['news2Label'] ?? '0 puntos, riesgo bajo',
            'fallRisk' => $risks['fallRisk'] ?? 'Riesgo alto de caídas, 45 puntos',
            'pressureRisk' => $risks['pressureRisk'] ?? 'Riesgo leve de úlceras por presión, 18 puntos',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function medicalOrders(string $encounterId): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $orders = is_array($payload['medicalOrders'] ?? null) ? $payload['medicalOrders'] : [];
        $assessment = is_array($payload['assessment'] ?? null) ? $payload['assessment'] : [];
        $vitals = is_array($payload['vitals'] ?? null) ? $payload['vitals'] : [];
        $reconciliation = is_array($payload['reconciliation'] ?? null) ? $payload['reconciliation'] : [];
        $risks = is_array($payload['risks'] ?? null) ? $payload['risks'] : [];

        $medications = [];
        foreach ($reconciliation['medications'] ?? [] as $item) {
            if (! is_array($item)) {
                continue;
            }
            $medications[] = [
                'name' => trim((string) ($item['name'] ?? '')),
                'dose' => trim((string) ($item['dose'] ?? '')),
                'route' => trim((string) ($item['route'] ?? '')),
                'frequency' => trim((string) ($item['frequency'] ?? '')),
            ];
        }

        return [
            'status' => $orders['status'] ?? 'pendiente',
            'statusLabel' => $orders['statusLabel'] ?? 'Pendiente de firma',
            'items' => $this->normalizeOrderItems($orders['items'] ?? []),
            'chiefComplaint' => $assessment['chiefComplaint'] ?? null,
            'allergies' => array_values(array_filter($assessment['allergies'] ?? [], fn ($item) => is_string($item) && trim($item) !== '')),
            'history' => is_string($assessment['history'] ?? null) ? $assessment['history'] : null,
            'vitals' => [
                'summary' => is_string($vitals['summary'] ?? null) ? $vitals['summary'] : null,
                'news2Label' => is_string($vitals['news2Label'] ?? null) ? $vitals['news2Label'] : null,
            ],
            'reconciliation' => [
                'medications' => $medications,
                'noHomeMedications' => (bool) ($reconciliation['noHomeMedications'] ?? false),
                'notes' => is_string($reconciliation['notes'] ?? null) ? $reconciliation['notes'] : null,
                'alerts' => array_values(array_filter($reconciliation['alerts'] ?? [], fn ($alert) => is_string($alert) && trim($alert) !== '')),
            ],
            'risks' => [
                'fallRisk' => is_string($risks['fallRisk'] ?? null) ? $risks['fallRisk'] : null,
                'pressureRisk' => is_string($risks['pressureRisk'] ?? null) ? $risks['pressureRisk'] : null,
            ],
        ];
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<string, mixed>
     */
    public function saveMedicalOrders(string $encounterId, array $items): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $existing = is_array($payload['medicalOrders'] ?? null) ? $payload['medicalOrders'] : [];
        if (($existing['status'] ?? '') === 'firmado') {
            throw new AdmissionBoardException('Las indicaciones ya fueron firmadas.', 422);
        }

        $payload['medicalOrders'] = [
            'status' => $existing['status'] ?? 'pendiente',
            'statusLabel' => $existing['statusLabel'] ?? 'Pendiente de firma',
            'items' => $this->normalizeOrderItems($items),
        ];
        $encounter->clinical_payload = $payload;
        $encounter->save();

        return $this->medicalOrders($encounterId);
    }

    /**
     * @param  array<string, mixed>  $signature
     * @return array<string, mixed>
     */
    public function signMedicalOrders(string $encounterId, array $signature): array
    {
        $this->ensureDemo();
        $encounter = $this->locate($encounterId);
        $payload = $encounter->readablePayload();
        $existing = is_array($payload['medicalOrders'] ?? null) ? $payload['medicalOrders'] : [];
        $rawItems = $signature['items'] ?? null;
        $items = $this->normalizeOrderItems(is_array($rawItems) ? $rawItems : ($existing['items'] ?? []));
        $filled = array_values(array_filter($items, fn (array $item) => trim($item['title']) !== ''));
        if ($filled === []) {
            throw new AdmissionBoardException('Debe registrar al menos una indicación.', 422);
        }

        $payload['medicalOrders'] = [
            'status' => 'firmado',
            'statusLabel' => 'Firmado',
            'items' => $filled,
            'signature' => [
                'physicianName' => $signature['physicianName'],
                'credential' => $signature['credential'],
            ],
        ];
        $encounter->clinical_payload = $payload;
        $encounter->save();

        return [
            'status' => 'firmado',
            'physicianName' => $signature['physicianName'],
            'credential' => $signature['credential'],
        ];
    }

    /**
     * @param  array<int, mixed>  $items
     * @return list<array{title: string, detail: string, category: string}>
     */
    private function normalizeOrderItems(array $items): array
    {
        $normalized = [];
        foreach ($items as $item) {
            if (is_string($item)) {
                $normalized[] = ['title' => trim($item), 'detail' => '', 'category' => ''];

                continue;
            }
            if (! is_array($item)) {
                continue;
            }
            $normalized[] = [
                'title' => trim((string) ($item['title'] ?? '')),
                'detail' => trim((string) ($item['detail'] ?? '')),
                'category' => trim((string) ($item['category'] ?? '')),
            ];
        }

        return $normalized;
    }

    private function locate(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new AdmissionBoardException('No se encontró el ingreso.', 404);
        }

        return $encounter;
    }

    private function ensureTransferReady(AdmissionEncounter $encounter): void
    {
        if (! $encounter->transfer_order_number) {
            $encounter->transfer_order_number = $this->nextTransferOrderNumber();
        }
        if (! $encounter->room) {
            $index = AdmissionEncounter::query()->whereNotNull('room')->count() + 1;
            $encounter->room = (string) (300 + $index);
            $encounter->bed = $index % 2 === 0 ? 'B' : 'A';
            $encounter->service = $encounter->service ?: 'Medicina interna';
        }
    }

    private function nextEncounterId(): string
    {
        $max = AdmissionEncounter::query()
            ->get()
            ->map(fn (AdmissionEncounter $item) => (int) preg_replace('/\D+/', '', $item->encounter_id))
            ->max() ?? 0;

        return 'ENC-'.str_pad((string) ($max + 1), 4, '0', STR_PAD_LEFT);
    }

    private function nextTransferOrderNumber(): string
    {
        $year = now()->format('Y');
        $max = AdmissionEncounter::query()
            ->whereNotNull('transfer_order_number')
            ->get()
            ->map(fn (AdmissionEncounter $item) => (int) preg_replace('/\D+/', '', (string) $item->transfer_order_number))
            ->max() ?? 0;

        return 'OT-'.$year.'-'.str_pad((string) (($max % 10000) + 1), 4, '0', STR_PAD_LEFT);
    }

    private function nextWristbandCode(AdmissionEncounter $encounter): string
    {
        $parts = preg_split('/\s+/', trim($encounter->patient_name)) ?: [];
        $initials = '';
        foreach (array_slice($parts, 0, 3) as $part) {
            $initials .= mb_strtoupper(mb_substr($part, 0, 1));
        }
        $suffix = preg_replace('/\D+/', '', $encounter->encounter_id) ?: (string) $encounter->id;

        return 'BRZ-'.str_pad($suffix, 4, '0', STR_PAD_LEFT).'-'.($initials ?: 'PX');
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
        string $source,
    ): array {
        $now = now();

        return [
            'encounter_id' => $encounterId,
            'order_number' => $orderNumber,
            'source' => $source,
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
            'clinical_payload' => null,
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
        $step = self::STEPS[$encounter->current_step] ?? [
            'role' => null,
            'subprocess' => '1.3',
            'label' => 'Egresado',
            'status' => 'Egresado',
        ];
        $flags = $encounter->deliverables;
        $deliverables = [];
        foreach (self::DELIVERABLES as $id => $label) {
            $deliverables[] = ['id' => $id, 'label' => $label, 'done' => (bool) ($flags[$id] ?? false)];
        }

        $waiting = $encounter->waiting_reason !== null;
        // RNF-06: un payload ilegible (lectura degradada) jamas se presenta como "sin datos".
        $unreadable = $encounter->payloadUnreadable();
        $payload = $unreadable ? [] : $encounter->readablePayload();
        $assessment = is_array($payload['assessment'] ?? null) ? $payload['assessment'] : null;
        $reconciliation = is_array($payload['reconciliation'] ?? null) ? $payload['reconciliation'] : null;
        $allergies = ($unreadable || $assessment === null || ! is_array($assessment['allergies'] ?? null))
            ? null
            : array_values(array_filter($assessment['allergies'], fn ($item) => is_string($item) && trim($item) !== ''));
        $medications = null;
        if (! $unreadable && $reconciliation !== null) {
            $medications = [];
            foreach ($reconciliation['medications'] ?? [] as $item) {
                if (is_array($item) && trim((string) ($item['name'] ?? '')) !== '') {
                    $medications[] = trim($item['name'].' '.($item['dose'] ?? '').' '.($item['frequency'] ?? ''));
                }
            }
        }
        $referral = is_array($payload['referral'] ?? null) ? $payload['referral'] : null;
        $currentIndex = array_search($encounter->current_step === 'derivacion' ? 'cobertura' : $encounter->current_step, self::FLOW_STEPS, true);
        if ($currentIndex === false) {
            $currentIndex = count(self::FLOW_STEPS);
        }

        $progress = [];
        foreach (self::FLOW_STEPS as $index => $stepId) {
            $definition = self::STEPS[$stepId];
            $state = 'pending';
            if ($waiting && $stepId === 'cobertura') {
                $state = 'current';
            } elseif ($index < $currentIndex) {
                $state = 'done';
            } elseif ($index === $currentIndex) {
                $state = 'current';
            }
            $progress[] = [
                'id' => $stepId,
                'label' => $definition['label'],
                'state' => $state,
            ];
        }

        return [
            'encounterId' => $encounter->encounter_id,
            'orderNumber' => $encounter->order_number,
            'source' => $encounter->source,
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
            'unreadable' => $unreadable,
            'clinical' => [
                'unreadable' => $unreadable,
                'allergies' => $allergies,
                'medications' => $medications,
                'filiation' => is_array($payload['filiation'] ?? null) ? $payload['filiation'] : null,
                'consent' => is_array($payload['consent'] ?? null) ? $payload['consent'] : null,
            ],
            'coverageReferral' => $referral ? [
                'destination' => $referral['destination'],
                'destinationLabel' => ($referral['destination'] ?? '') === 'caja' ? 'Caja' : 'Trabajo social',
                'status' => $referral['status'] ?? 'derivado',
                'relativeName' => $referral['relativeName'] ?? '',
                'relativePhone' => $referral['relativePhone'] ?? null,
                'note' => $referral['note'] ?? null,
                'registeredAt' => $referral['registeredAt'] ?? null,
            ] : null,
            'deliverables' => $deliverables,
            'progress' => $progress,
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function catalogOrders(): array
    {
        $patient = [
            'fullName' => 'Ana María Quispe Rojas',
            'documentType' => 'DNI',
            'documentNumber' => '45678912',
            'birthDate' => '1978-04-12',
            'sex' => 'Femenino',
        ];

        return [
            'OI-2026-0001' => [
                'orderNumber' => 'OI-2026-0001',
                'originService' => 'Emergencia adultos',
                'requestingPhysician' => 'Dra. Lucía Herrera',
                'reason' => 'Neumonía adquirida en la comunidad',
                'patient' => $patient,
                'coverage' => ['payer' => 'SIS', 'status' => 'aprobada', 'plan' => 'SIS Gratuito'],
            ],
            'OI-2026-0002' => [
                'orderNumber' => 'OI-2026-0002',
                'originService' => 'Emergencia adultos',
                'requestingPhysician' => 'Dr. Mateo Salas',
                'reason' => 'Dolor abdominal',
                'patient' => [...$patient, 'fullName' => 'Luis Ernesto Paredes', 'documentNumber' => '40112233'],
                'coverage' => ['payer' => 'EsSalud', 'status' => 'pendiente', 'plan' => 'Regular'],
            ],
            'OI-2026-0003' => [
                'orderNumber' => 'OI-2026-0003',
                'originService' => 'Consulta externa',
                'requestingPhysician' => 'Dra. Lucía Herrera',
                'reason' => 'Control de insuficiencia cardíaca',
                'patient' => [...$patient, 'fullName' => 'Carmen Yolanda Vega', 'documentNumber' => '09881234'],
                'coverage' => ['payer' => 'Particular', 'status' => 'rechazada', 'plan' => 'Sin cobertura vigente'],
            ],
        ];
    }
}
