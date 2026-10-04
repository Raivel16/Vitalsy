<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaCoverageTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_domain_tables_and_user_flags_exist_after_migrate(): void
    {
        $tables = [
            'patients',
            'patient_contacts',
            'patient_allergies',
            'coverage_referrals',
            'informed_consents',
            'nursing_assessments',
            'vital_sign_readings',
            'medication_reconciliations',
            'risk_assessments',
            'wristband_events',
            'lab_results',
            'imaging_reports',
            'medical_evolution_notes',
            'prescriptions',
            'prescription_items',
            'medication_administrations',
            'nursing_evolution_notes',
            'care_activity_completions',
            'clinical_alerts',
            'alert_acknowledgements',
            'alert_escalations',
            'monitoring_schedules',
            'discharge_orders',
            'epicrisis_documents',
            'ambulatory_prescriptions',
            'social_assessments',
            'pharma_discharge_reconciliations',
            'nursing_discharge_reports',
            'discharge_indication_receipts',
            'account_verifications',
            'exit_passes',
            'patient_exits',
            'wards',
            'beds',
            'bed_requests',
            'bed_assignments',
            'cleaning_orders',
            'bed_readiness_checks',
            'discharge_projections',
            'staff_shift_plans',
            'staff_shifts',
            'daily_patient_assignments',
            'handovers',
            'staff_absences',
            'coverage_requests',
            'retainer_confirmations',
            'admission_encounters',
            'users',
        ];

        foreach ($tables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Expected table [{$table}] to exist.");
        }

        $this->assertTrue(Schema::hasColumn('users', 'is_active'));
        $this->assertTrue(Schema::hasColumn('users', 'deactivated_at'));
        $this->assertTrue(Schema::hasColumn('patients', 'document_number'));
        $this->assertTrue(Schema::hasColumn('beds', 'status'));
        $this->assertTrue(Schema::hasColumn('clinical_alerts', 'severity'));
        $this->assertTrue(Schema::hasColumn('prescriptions', 'status'));
        $this->assertTrue(Schema::hasColumn('discharge_orders', 'status'));
        $this->assertTrue(Schema::hasColumn('staff_shifts', 'starts_at'));
        $this->assertTrue(Schema::hasColumn('vital_sign_readings', 'rr'));
        $this->assertTrue(Schema::hasColumn('vital_sign_readings', 'sbp'));
        $this->assertTrue(Schema::hasColumn('vital_sign_readings', 'dbp'));
        $this->assertTrue(Schema::hasColumn('patient_allergies', 'is_optional'));
    }
}
