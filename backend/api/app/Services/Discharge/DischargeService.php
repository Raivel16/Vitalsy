<?php

namespace App\Services\Discharge;

use App\Events\PatientExited;
use App\Exceptions\ClinicalRuleException;
use App\Models\AccountVerification;
use App\Models\AdmissionEncounter;
use App\Models\AmbulatoryPrescription;
use App\Models\DischargeIndicationReceipt;
use App\Models\DischargeOrder;
use App\Models\EpicrisisDocument;
use App\Models\ExitPass;
use App\Models\LifeDischargePlan;
use App\Models\NursingDischargeReport;
use App\Models\PatientExit;
use App\Models\PharmaDischargeReconciliation;
use App\Models\SocialAssessment;
use App\Models\User;
use App\Services\Life\DischargeLifePlan;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DischargeService
{
    public function boardFor(User $user): array
    {
        $cases = DischargeOrder::query()
            ->orderByDesc('ordered_at')
            ->get()
            ->map(fn (DischargeOrder $order) => $this->present($order->encounter_id, $user))
            ->reject(fn (array $case) => ! empty($case['exit']))
            ->values();

        return ['cases' => $cases];
    }

    public function authorizedExits(): array
    {
        $ids = ExitPass::query()->where('status', 'emitido')->pluck('encounter_id');
        $exited = PatientExit::query()->whereIn('encounter_id', $ids)->pluck('encounter_id');

        $cases = $ids
            ->reject(fn (string $id) => $exited->contains($id))
            ->map(fn (string $id) => $this->present($id))
            ->values();

        return ['cases' => $cases];
    }

    public function show(string $encounterId, ?User $viewer = null): array
    {
        return ['case' => $this->present($encounterId, $viewer)];
    }

    public function registerOrder(string $encounterId, User $user): array
    {
        $this->requireEncounter($encounterId);

        $existing = DischargeOrder::query()->where('encounter_id', $encounterId)->first();
        if ($existing) {
            throw new ClinicalRuleException('Este ingreso ya tiene una orden digital de alta.');
        }

        DischargeOrder::query()->create([
            'encounter_id' => $encounterId,
            'ordered_by' => $user->id,
            'ordered_at' => now(),
            'status' => 'registrada',
        ]);

        return ['case' => $this->present($encounterId)];
    }

    /** @param array<string, mixed> $data */
    public function storeEpicrisis(string $encounterId, array $data, User $user): array
    {
        $this->requireOrder($encounterId);

        EpicrisisDocument::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'diagnoses' => $data['diagnoses'],
                'procedures' => $data['procedures'] ?? null,
                'evolution' => $data['evolution'] ?? null,
                'authored_by' => $user->id,
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    /** @param array<string, mixed> $data */
    public function storePrescriptions(string $encounterId, array $data): array
    {
        $this->requireOrder($encounterId);

        AmbulatoryPrescription::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'content' => ['items' => $data['items'] ?? []],
                'issued_at' => now(),
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    /** @param array<string, mixed> $data */
    public function storeSocialAssessment(string $encounterId, array $data, User $user): array
    {
        $this->requireOrder($encounterId);

        SocialAssessment::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'report' => $data['report'],
                'validated' => (bool) ($data['validated'] ?? false),
                'assessed_by' => $user->id,
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    public function reconciliationContext(string $encounterId): array
    {
        $this->requireOrder($encounterId);
        $presented = $this->present($encounterId);

        return [
            'epicrisis' => $presented['epicrisis'],
            'prescriptions' => $presented['prescriptions'],
            'administered' => $presented['administered'],
            'socialAssessment' => $presented['socialAssessment'],
        ];
    }

    /** @param array<string, mixed> $data */
    public function storeReconciliation(string $encounterId, array $data): array
    {
        $this->requireOrder($encounterId);

        PharmaDischargeReconciliation::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'notes' => $data['notes'] ?? null,
                'status' => 'registrada',
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    /** @param array<string, mixed> $data */
    public function storeNursingReport(string $encounterId, array $data): array
    {
        $this->requireOrder($encounterId);
        if (! PharmaDischargeReconciliation::query()->where('encounter_id', $encounterId)->exists()) {
            throw new ClinicalRuleException('Registre primero la conciliación farmacéutica al alta.');
        }

        $social = SocialAssessment::query()->where('encounter_id', $encounterId)->first();
        $homeCare = $data['homeCare'] ?? '';
        if ($social && $social->validated === false) {
            $homeCare = trim($homeCare."\nInforme social: ".$social->report);
        } elseif ($social) {
            $homeCare = trim($homeCare."\nContinuidad social validada.");
        }

        NursingDischargeReport::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'instructions' => $data['instructions'],
                'alarm_signs' => $data['alarmSigns'] ?? null,
                'home_care' => $homeCare,
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    /** @param array<string, mixed> $data */
    public function storeIndicationReceipt(string $encounterId, array $data): array
    {
        $this->requireOrder($encounterId);
        if (! NursingDischargeReport::query()->where('encounter_id', $encounterId)->exists()) {
            throw new ClinicalRuleException('Genere primero el informe digital de alta de enfermería.');
        }

        // RNF-07: el acuse de recibo es inmutable; un reenvío conserva el primero.
        DischargeIndicationReceipt::query()->firstOrCreate(
            ['encounter_id' => $encounterId],
            [
                'received_by_name' => $data['receivedByName'],
                'received_at' => now(),
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    /** @param array<string, mixed> $data */
    public function verifyAccount(string $encounterId, array $data): array
    {
        $this->requireOrder($encounterId);

        AccountVerification::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'status' => $data['status'],
                'verified_at' => $data['status'] === 'conforme' ? now() : null,
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    public function issueExitPass(string $encounterId): array
    {
        $this->requireOrder($encounterId);
        $this->assertReadyForPass($encounterId);

        ExitPass::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'issued_at' => now(),
                'status' => 'emitido',
            ],
        );

        return ['case' => $this->present($encounterId)];
    }

    public function confirmExit(string $encounterId, User $user): array
    {
        $pass = ExitPass::query()->where('encounter_id', $encounterId)->first();
        if (! $pass || $pass->status !== 'emitido') {
            throw new ClinicalRuleException('No hay un pase de salida emitido para este ingreso.');
        }

        PatientExit::query()->updateOrCreate(
            ['encounter_id' => $encounterId],
            [
                'exited_at' => now(),
                'confirmed_by' => $user->id,
            ],
        );

        AdmissionEncounter::query()
            ->where('encounter_id', $encounterId)
            ->update(['current_step' => 'egresado']);

        PatientExited::dispatch($encounterId);

        return ['case' => $this->present($encounterId)];
    }

    /** @return array<string, mixed> */
    public function present(string $encounterId, ?User $viewer = null): array
    {
        $encounter = $this->requireEncounter($encounterId);
        $order = DischargeOrder::query()->where('encounter_id', $encounterId)->first();
        $epicrisis = EpicrisisDocument::query()->where('encounter_id', $encounterId)->first();
        $prescription = AmbulatoryPrescription::query()->where('encounter_id', $encounterId)->first();
        $social = SocialAssessment::query()->where('encounter_id', $encounterId)->first();
        $reconciliation = PharmaDischargeReconciliation::query()->where('encounter_id', $encounterId)->first();
        $nursing = NursingDischargeReport::query()->where('encounter_id', $encounterId)->first();
        $receipt = DischargeIndicationReceipt::query()->where('encounter_id', $encounterId)->first();
        $account = AccountVerification::query()->where('encounter_id', $encounterId)->first();
        $pass = ExitPass::query()->where('encounter_id', $encounterId)->first();
        $exit = PatientExit::query()->where('encounter_id', $encounterId)->first();

        $deliverables = [
            ['id' => 'order', 'label' => 'Orden de alta', 'done' => (bool) $order],
            ['id' => 'epicrisis', 'label' => 'Epicrisis', 'done' => (bool) $epicrisis],
            ['id' => 'prescriptions', 'label' => 'Recetas ambulatorias', 'done' => (bool) $prescription],
            ['id' => 'social', 'label' => 'Valoración social', 'done' => (bool) $social],
            ['id' => 'reconciliation', 'label' => 'Conciliación farmacéutica', 'done' => (bool) $reconciliation],
            ['id' => 'nursing', 'label' => 'Informe de alta de enfermería', 'done' => (bool) $nursing],
            ['id' => 'receipt', 'label' => 'Recepción de indicaciones', 'done' => (bool) $receipt],
            ['id' => 'account', 'label' => 'Estado de cuenta', 'done' => $account?->status === 'conforme'],
            ['id' => 'pass', 'label' => 'Pase de salida', 'done' => (bool) $pass],
            ['id' => 'exit', 'label' => 'Salida efectiva', 'done' => (bool) $exit],
        ];

        return [
            'encounterId' => $encounterId,
            'patientName' => $encounter->patient_name,
            'location' => trim(implode(', ', array_filter([
                $encounter->room ? "Habitación {$encounter->room}" : null,
                $encounter->bed ? "lecho {$encounter->bed}" : null,
            ]))) ?: null,
            'nextAction' => $this->nextAction($order, $epicrisis, $prescription, $social, $reconciliation, $nursing, $receipt, $account, $pass, $exit, $viewer),
            'deliverables' => $deliverables,
            'order' => $order ? [
                'status' => $order->status,
                'orderedAt' => optional($order->ordered_at)?->toIso8601String(),
            ] : null,
            'epicrisis' => $epicrisis ? [
                'diagnoses' => $epicrisis->diagnoses,
                'procedures' => $epicrisis->procedures,
                'evolution' => $epicrisis->evolution,
            ] : null,
            'prescriptions' => $prescription ? [
                'items' => $prescription->content['items'] ?? [],
                'issuedAt' => optional($prescription->issued_at)?->toIso8601String(),
            ] : null,
            'socialAssessment' => $social ? [
                'report' => $social->report,
                'validated' => $social->validated,
            ] : null,
            'reconciliation' => $reconciliation ? [
                'notes' => $reconciliation->notes,
                'status' => $reconciliation->status,
            ] : null,
            'nursingReport' => $nursing ? [
                'instructions' => $nursing->instructions,
                'alarmSigns' => $nursing->alarm_signs,
                'homeCare' => $nursing->home_care,
            ] : null,
            'indicationReceipt' => $receipt ? [
                'receivedByName' => $receipt->received_by_name,
                'receivedAt' => optional($receipt->received_at)?->toIso8601String(),
            ] : null,
            'account' => $account ? [
                'status' => $account->status,
                'verifiedAt' => optional($account->verified_at)?->toIso8601String(),
            ] : null,
            'exitPass' => $pass ? [
                'status' => $pass->status,
                'issuedAt' => optional($pass->issued_at)?->toIso8601String(),
            ] : null,
            'exit' => $exit ? [
                'confirmed' => true,
                'exitedAt' => optional($exit->exited_at)?->toIso8601String(),
            ] : null,
            // Los códigos son secretos al portador: solo la enfermera de piso los ve completos.
            'lifePlan' => app(DischargeLifePlan::class)->present(
                LifeDischargePlan::query()->where('encounter_id', $encounterId)->first(),
                $viewer?->role === 'enfermera_piso',
            ),
            'administered' => [],
        ];
    }

    private function nextAction(
        ?DischargeOrder $order,
        ?EpicrisisDocument $epicrisis,
        ?AmbulatoryPrescription $prescription,
        ?SocialAssessment $social,
        ?PharmaDischargeReconciliation $reconciliation,
        ?NursingDischargeReport $nursing,
        ?DischargeIndicationReceipt $receipt,
        ?AccountVerification $account,
        ?ExitPass $pass,
        ?PatientExit $exit,
        ?User $viewer,
    ): ?string {
        if ($exit) {
            return null;
        }
        if ($pass) {
            return match ($viewer?->role) {
                'enfermera_piso' => 'exit',
                'camillero' => 'transfer',
                default => 'await_exit',
            };
        }
        if ($account?->status === 'conforme' && $nursing && $receipt && $social) {
            return 'pass';
        }
        if ($viewer?->role === 'trabajo_social' && ! $social) {
            return 'social';
        }
        if ($viewer?->role === 'altas_caja') {
            return $account?->status === 'conforme' ? 'pass' : 'account';
        }
        if (in_array($viewer?->role, ['medico_residente', 'medico_tratante'], true)) {
            if (! $order) {
                return 'order';
            }
            if (! $epicrisis) {
                return 'epicrisis';
            }
            if (! $prescription) {
                return 'prescriptions';
            }
        }
        if ($viewer?->role === 'enfermera_piso') {
            if (! $reconciliation) {
                return 'reconciliation';
            }
            if (! $nursing) {
                return 'nursing';
            }
            if (! $receipt) {
                return 'receipt';
            }
        }
        if (! $social) {
            return 'social';
        }
        if (! $reconciliation) {
            return 'reconciliation';
        }

        return 'account';
    }

    private function assertReadyForPass(string $encounterId): void
    {
        $account = AccountVerification::query()->where('encounter_id', $encounterId)->first();
        if ($account?->status !== 'conforme') {
            throw new ClinicalRuleException('La liquidación administrativa aún no está conforme.');
        }
        if (! SocialAssessment::query()->where('encounter_id', $encounterId)->exists()) {
            throw new ClinicalRuleException('Falta la valoración social pre-egreso.');
        }
        if (! NursingDischargeReport::query()->where('encounter_id', $encounterId)->exists()) {
            throw new ClinicalRuleException('Falta el informe digital de alta de enfermería.');
        }
        if (! DischargeIndicationReceipt::query()->where('encounter_id', $encounterId)->exists()) {
            throw new ClinicalRuleException('El paciente o familiar aún no confirmó las indicaciones de alta.');
        }
    }

    private function requireOrder(string $encounterId): DischargeOrder
    {
        $this->requireEncounter($encounterId);
        $order = DischargeOrder::query()->where('encounter_id', $encounterId)->first();
        if (! $order) {
            throw new ClinicalRuleException('Registre primero la orden digital de alta.');
        }

        return $order;
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }
}
