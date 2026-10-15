<?php

namespace App\Support\Security;

use App\Models\AdmissionEncounter;
use App\Models\AmbulatoryPrescription;
use App\Models\ClinicalAlert;
use App\Models\EpicrisisDocument;
use App\Models\Handover;
use App\Models\ImagingReport;
use App\Models\LabResult;
use App\Models\LifeBaselineImport;
use App\Models\LifeBiometricSample;
use App\Models\LifeDischargePlan;
use App\Models\MedicalEvolutionNote;
use App\Models\NursingDischargeReport;
use App\Models\NursingEvolutionNote;
use App\Models\PatientAllergy;
use App\Models\PharmaDischargeReconciliation;
use App\Models\PrescriptionItem;
use App\Models\SocialAssessment;

/**
 * Registro único de columnas cifradas (RNF-06). Lo usan el respaldo
 * `vitalsy:encrypt-existing`, la migración de tipos y las pruebas.
 * Documentado en docs/architecture/seguridad-datos.md.
 */
final class EncryptedColumns
{
    /** @return array<string, array{model: class-string, columns: list<string>}> */
    public static function map(): array
    {
        return [
            'admission_encounters' => ['model' => AdmissionEncounter::class, 'columns' => ['clinical_payload']],
            'nursing_evolution_notes' => ['model' => NursingEvolutionNote::class, 'columns' => ['body']],
            'medical_evolution_notes' => ['model' => MedicalEvolutionNote::class, 'columns' => ['body']],
            'patient_allergies' => ['model' => PatientAllergy::class, 'columns' => ['substance', 'notes']],
            'epicrisis_documents' => ['model' => EpicrisisDocument::class, 'columns' => ['diagnoses', 'procedures', 'evolution']],
            'social_assessments' => ['model' => SocialAssessment::class, 'columns' => ['report']],
            'ambulatory_prescriptions' => ['model' => AmbulatoryPrescription::class, 'columns' => ['content']],
            'prescription_items' => ['model' => PrescriptionItem::class, 'columns' => ['drug_name', 'dose', 'route', 'frequency']],
            'nursing_discharge_reports' => ['model' => NursingDischargeReport::class, 'columns' => ['instructions', 'alarm_signs', 'home_care']],
            'pharma_discharge_reconciliations' => ['model' => PharmaDischargeReconciliation::class, 'columns' => ['notes']],
            'lab_results' => ['model' => LabResult::class, 'columns' => ['summary', 'payload']],
            'imaging_reports' => ['model' => ImagingReport::class, 'columns' => ['summary', 'payload']],
            'clinical_alerts' => ['model' => ClinicalAlert::class, 'columns' => ['message', 'closure_note']],
            'handovers' => ['model' => Handover::class, 'columns' => ['payload']],
            'life_biometric_samples' => ['model' => LifeBiometricSample::class, 'columns' => ['value']],
            'life_baseline_imports' => ['model' => LifeBaselineImport::class, 'columns' => ['baseline']],
            'life_discharge_plans' => ['model' => LifeDischargePlan::class, 'columns' => ['payload']],
        ];
    }
}
