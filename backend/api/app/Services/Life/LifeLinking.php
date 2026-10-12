<?php

namespace App\Services\Life;

use App\Exceptions\ClinicalRuleException;
use App\Models\AdmissionEncounter;
use App\Models\LifeBaselineImport;
use App\Models\LifeBiometricSample;
use App\Models\LifeConsent;
use App\Models\LifeLinkCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Vincula una cuenta de Vitalsy Life con un ingreso mediante el código VL-XXXX-XXXX (RF-95):
 * importa la línea de base una sola vez por ingreso y consume el código en la misma transacción.
 */
class LifeLinking
{
    public function __construct(private readonly BaselineCalculator $calculator) {}

    /**
     * @return array{status: string, importedAt: string|null, baselineSummary: array{metrics: array<int, array<string, mixed>>}}
     */
    public function link(string $encounterId, string $code, User $by): array
    {
        return DB::transaction(function () use ($encounterId, $code, $by) {
            if (! AdmissionEncounter::query()->where('encounter_id', $encounterId)->exists()) {
                abort(404, 'No se encontró el ingreso.');
            }

            if (LifeBaselineImport::query()->where('encounter_id', $encounterId)->exists()) {
                throw new ClinicalRuleException('Este ingreso ya tiene una línea de base importada.', 'already_linked');
            }

            $link = LifeLinkCode::query()->where('code', strtoupper(trim($code)))->lockForUpdate()->first();
            if (! $link) {
                throw new ClinicalRuleException('El código no es válido. Verifíquelo con el paciente.', 'code_not_found');
            }
            if ($link->consumed_at !== null) {
                throw new ClinicalRuleException('Este código ya fue utilizado. Solicite uno nuevo al paciente.', 'code_consumed');
            }
            if ($link->expires_at === null || ! $link->expires_at->isFuture()) {
                throw new ClinicalRuleException('El código venció. Solicite uno nuevo al paciente.', 'code_expired');
            }

            $consent = LifeConsent::query()->where('life_account_id', $link->life_account_id)->first();
            if (! $consent || ! $consent->sharing_enabled) {
                throw new ClinicalRuleException('El paciente no tiene activado compartir datos con el hospital.', 'sharing_closed');
            }

            $samples = LifeBiometricSample::query()->where('life_account_id', $link->life_account_id)->get();
            $metrics = $this->calculator->summarize($samples);

            $import = LifeBaselineImport::query()->create([
                'encounter_id' => $encounterId,
                'life_account_id' => $link->life_account_id,
                'baseline' => $metrics,
                'imported_by' => $by->id,
                'imported_at' => now(),
            ]);

            $link->forceFill(['consumed_at' => now(), 'consumed_encounter_id' => $encounterId])->save();

            return [
                'status' => 'importada',
                'importedAt' => $import->imported_at?->toIso8601String(),
                'baselineSummary' => ['metrics' => $metrics],
            ];
        });
    }
}
