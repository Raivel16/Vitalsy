<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RNF-06: el texto cifrado (base64 + MAC) no cabe en string(255) ni es JSON válido
 * para una columna json de PostgreSQL. Las columnas clínicas cifradas pasan a `text`
 * conservando su nulabilidad. Los datos existentes se conservan (conversión a texto);
 * su cifrado lo hace `php artisan vitalsy:encrypt-existing`.
 */
return new class extends Migration
{
    /** Lista propia de la migración (no depende de la clase viva EncryptedColumns). */
    private const COLUMNS = [
        'admission_encounters' => ['clinical_payload'],
        'nursing_evolution_notes' => ['body'],
        'medical_evolution_notes' => ['body'],
        'patient_allergies' => ['substance', 'notes'],
        'epicrisis_documents' => ['diagnoses', 'procedures', 'evolution'],
        'social_assessments' => ['report'],
        'ambulatory_prescriptions' => ['content'],
        'prescription_items' => ['drug_name', 'dose', 'route', 'frequency'],
        'nursing_discharge_reports' => ['instructions', 'alarm_signs', 'home_care'],
        'pharma_discharge_reconciliations' => ['notes'],
        'lab_results' => ['summary', 'payload'],
        'imaging_reports' => ['summary', 'payload'],
        'clinical_alerts' => ['message', 'closure_note'],
        'handovers' => ['payload'],
        'life_biometric_samples' => ['value'],
        'life_baseline_imports' => ['baseline'],
        'life_discharge_plans' => ['payload'],
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $existing = collect(Schema::getColumns($table))->keyBy('name');

            foreach ($columns as $column) {
                $meta = $existing->get($column);
                if ($meta === null || $meta['type_name'] === 'text') {
                    continue;
                }

                $nullable = (bool) $meta['nullable'];
                Schema::table($table, function (Blueprint $t) use ($column, $nullable) {
                    $definition = $t->text($column);
                    if ($nullable) {
                        $definition->nullable();
                    }
                    $definition->change();
                });
            }
        }
    }

    public function down(): void
    {
        // Irreversible a propósito: volver a string/json truncaría o rechazaría texto cifrado.
    }
};
