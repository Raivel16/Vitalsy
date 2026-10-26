<?php

namespace App\Services\Admission;

use App\Models\AdmissionEncounter;
use Illuminate\Database\UniqueConstraintViolationException;

class AdmissionBoard
{
    /**
     * @var array<string, array{role: string, next: string|null, subprocess: string, label: string, status: string, deliverable: string|null}>
     */
    public const STEPS = [
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
    public const DELIVERABLES = [
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
    public const SUBPROCESS = [
        '1.1' => 'Verificación y registro administrativo',
        '1.2' => 'Traslado y recepción en piso',
        '1.3' => 'Valoración inicial y conciliación',
    ];

    /**
     * @var list<string>
     */
    public const FLOW_STEPS = [
        'orden', 'filiacion', 'cobertura', 'brazalete', 'expediente', 'consentimiento',
        'traslado', 'identidad', 'recepcion', 'valoracion', 'constantes', 'conciliacion',
        'escalas', 'kardex', 'indicaciones',
    ];

    public function __construct(
        private readonly AdmissionDemoData $demo,
        private readonly AdmissionPresenter $presenter,
        private readonly AdmissionIdentifiers $identifiers,
        private readonly AdmissionStepTransitions $transitions,
        private readonly AdmissionMedicalOrderFormatter $orderFormatter,
    ) {}

    public function ensureDemo(): void
    {
        $this->demo->seed();
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
            ->sortBy(fn (AdmissionEncounter $encounter) => $this->presenter->sortKey($encounter))
            ->values();

        $total = $sorted->count();
        $perPage = max(1, min(50, $perPage));
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = max(1, min($page, $lastPage));
        $encounters = $sorted
            ->slice(($page - 1) * $perPage, $perPage)
            ->values()
            ->map(fn (AdmissionEncounter $encounter) => $this->presenter->present($encounter))
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

        return $this->presenter->present($this->locate($encounterId));
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

        return $this->demo->catalogOrders()[$orderNumber] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    public function openFromOrder(string $orderNumber): array
    {
        $this->ensureDemo();
        $existing = AdmissionEncounter::query()->where('order_number', $orderNumber)->first();
        if ($existing) {
            return $this->presenter->present($existing);
        }

        $order = $this->demo->catalogOrders()[$orderNumber] ?? null;
        if (! $order) {
            throw new AdmissionBoardException('No se encontró la orden.', 404);
        }

        $encounter = $this->createWithNextEncounterId([
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

        return $this->presenter->present($encounter);
    }

    /**
     * Crea el ingreso con el siguiente número ENC. Si otro registro simultáneo tomó el mismo
     * número entre el cálculo y el insert, se recalcula y se reintenta.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function createWithNextEncounterId(array $attributes): AdmissionEncounter
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                return AdmissionEncounter::query()->create(
                    ['encounter_id' => $this->identifiers->nextEncounterId()] + $attributes,
                );
            } catch (UniqueConstraintViolationException $e) {
                if ($attempt >= 5 || ! str_contains($e->getMessage(), 'encounter_id')) {
                    throw $e;
                }
            }
        }
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

        $encounter = $this->createWithNextEncounterId([
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

        return $this->presenter->present($encounter);
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

        $this->transitions->assertCanAdvance($encounter, $step, $definition['role'], $role, $coverageStatus);

        if ($coverageStatus !== null) {
            $encounter->coverage_status = $coverageStatus;
        }

        $status = $encounter->coverage_status;
        $deliverables = $encounter->deliverables;
        if ($definition['deliverable']) {
            $deliverables[$definition['deliverable']] = true;
        }

        [$next, $waiting, $deliverables] = $this->transitions->resolve($step, $definition['next'], $status, $deliverables);

        if ($step === 'consentimiento' && $next === 'traslado') {
            $this->identifiers->ensureTransferReady($encounter);
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

        return $this->presenter->present($encounter->refresh());
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
            $encounter->wristband_code = $this->identifiers->wristbandCode($encounter);
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
            $encounter->record_id = $this->identifiers->recordId($encounter);
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

        return $this->orderFormatter->view($encounter->readablePayload());
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
            'items' => $this->orderFormatter->normalizeItems($items),
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
        $items = $this->orderFormatter->normalizeItems(is_array($rawItems) ? $rawItems : ($existing['items'] ?? []));
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

    private function locate(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new AdmissionBoardException('No se encontró el ingreso.', 404);
        }

        return $encounter;
    }
}
