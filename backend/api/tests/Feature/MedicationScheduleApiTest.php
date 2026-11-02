<?php

namespace Tests\Feature;

use App\Events\PatientExited;
use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\MedicationAdministration;
use App\Models\PatientExit;
use App\Models\Prescription;
use App\Models\User;
use App\Services\InpatientCare\CpoeService;
use App\Support\MedicationFrequency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * RF-25 / RF-32: el horario sale de la frecuencia y la primera dosis que elige el médico, no del turno.
 */
class MedicationScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    private const ENCOUNTER = 'ENC-HORARIO-1';

    private const PRESCRIPTIONS = '/api/v1/inpatient-care/encounters/ENC-HORARIO-1/prescriptions';

    private const ITEMS = self::PRESCRIPTIONS.'/active/items';

    private const EMAR = '/api/v1/inpatient-care/encounters/ENC-HORARIO-1/emar';

    private const CADA_8_HORAS = 'cada 8 horas';

    private const NOW = '2026-11-02 17:00:00';

    private const FIRST_DOSE = '2026-11-02 18:30:00';

    private const OTHER_FIRST_DOSE = '2026-11-02 20:00:00';

    private const SHOWN_FIRST_DOSE = '2026-11-02 18:30';

    private const SHOWN_OTHER_DOSE = '2026-11-02 20:00';

    private const CADA_24_HORAS = 'cada 24 horas';

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(self::NOW);
        AdmissionEncounter::query()->create([
            'encounter_id' => self::ENCOUNTER,
            'order_number' => 'OI-2026-HORARIO-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-HORARIO-1',
            'patient_name' => 'Paciente Horario',
            'document_type' => 'DNI',
            'document_number' => '44556677',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => '401',
            'bed' => 'A',
            'service' => 'Medicina',
            'wristband_code' => 'BRZ-HORARIO-1',
            'record_id' => 'EXP-HORARIO-1',
            'current_step' => 'cerrado',
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
        $this->actingAs(User::factory()->create(['role' => 'medico_tratante']));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array<string, string>
     */
    private function item(string $frequency = self::CADA_8_HORAS, string $firstDoseAt = self::FIRST_DOSE, string $drug = 'Paracetamol'): array
    {
        return ['drugName' => $drug, 'dose' => '1 g', 'route' => 'VO', 'frequency' => $frequency, 'firstDoseAt' => $firstDoseAt];
    }

    private function prescribe(array ...$items): int
    {
        return (int) $this->postJson(self::PRESCRIPTIONS, ['items' => $items])->assertCreated()->json('prescription.items.0.id');
    }

    /**
     * @return list<string>
     */
    private function scheduled(string $status = 'pendiente'): array
    {
        return MedicationAdministration::query()
            ->where('encounter_id', self::ENCOUNTER)
            ->where('status', $status)
            ->orderBy('scheduled_at')
            ->get()
            ->map(fn (MedicationAdministration $dose) => $dose->scheduled_at->format('Y-m-d H:i'))
            ->all();
    }

    private function openAlertFor(MedicationAdministration $dose): ClinicalAlert
    {
        return ClinicalAlert::query()->create([
            'encounter_id' => self::ENCOUNTER,
            'source' => 'emar',
            'compliance_key' => 'emar:'.$dose->id,
            'severity' => 'alta',
            'message' => 'Dosis pendiente de Paracetamol. Administre en e-MAR.',
            'status' => ClinicalAlert::STATUS_OPEN,
            'assigned_role' => 'enfermera_piso',
            'generated_at' => now(),
            'acknowledge_due_at' => now()->addMinutes(15),
        ]);
    }

    public function test_signing_creates_the_doses_from_the_first_dose_without_opening_the_emar(): void
    {
        $this->prescribe($this->item());

        $this->assertSame([self::SHOWN_FIRST_DOSE, '2026-11-03 02:30', '2026-11-03 10:30'], $this->scheduled());
    }

    public function test_every_interval_of_the_list_keeps_its_exact_spacing(): void
    {
        $this->prescribe($this->item('cada 6 horas'));
        $this->assertSame([self::SHOWN_FIRST_DOSE, '2026-11-03 00:30', '2026-11-03 06:30', '2026-11-03 12:30'], $this->scheduled());
    }

    public function test_daily_prescription_has_a_single_dose_per_day(): void
    {
        $this->prescribe($this->item(self::CADA_24_HORAS));

        $this->assertSame([self::SHOWN_FIRST_DOSE], $this->scheduled());
    }

    public function test_single_dose_is_never_repeated(): void
    {
        $this->prescribe($this->item('dosis única'));
        $this->assertSame([self::SHOWN_FIRST_DOSE], $this->scheduled());

        Carbon::setTestNow('2026-11-05 09:00:00');
        $this->artisan('emar:extend-doses')->assertSuccessful();

        $this->assertSame([self::SHOWN_FIRST_DOSE], $this->scheduled());
    }

    public function test_frequency_must_come_from_the_list(): void
    {
        $this->postJson(self::PRESCRIPTIONS, ['items' => [$this->item('BID')]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.frequency']);
        $this->postJson(self::ITEMS, $this->item('c/12h'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['frequency']);
    }

    public function test_first_dose_is_required_and_cannot_be_in_the_past(): void
    {
        $missing = $this->item();
        unset($missing['firstDoseAt']);

        $this->postJson(self::PRESCRIPTIONS, ['items' => [$missing]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.firstDoseAt']);
        $this->postJson(self::PRESCRIPTIONS, ['items' => [$this->item(firstDoseAt: '2026-11-02 16:00:00')]])
            ->assertUnprocessable()
            ->assertJsonPath('errors', fn (array $errors) => $errors['items.0.firstDoseAt'][0] === 'La primera dosis no puede estar en el pasado.');

        $this->assertDatabaseCount('prescriptions', 0);
    }

    public function test_the_first_dose_can_be_the_current_minute(): void
    {
        $this->prescribe($this->item(firstDoseAt: '2026-11-02 16:58:00'));

        $this->assertSame('2026-11-02 16:58', $this->scheduled()[0]);
    }

    public function test_active_plan_returns_the_first_dose(): void
    {
        $this->prescribe($this->item());

        $this->getJson(self::PRESCRIPTIONS.'/active')
            ->assertOk()
            ->assertJsonPath('prescription.items.0.firstDoseAt', Carbon::parse(self::FIRST_DOSE)->toIso8601String());
    }

    public function test_added_item_gets_its_doses_at_once(): void
    {
        $this->prescribe($this->item());
        $this->postJson(self::ITEMS, $this->item(self::CADA_24_HORAS, self::OTHER_FIRST_DOSE, 'Omeprazol'))->assertCreated();

        $this->assertContains(self::SHOWN_OTHER_DOSE, $this->scheduled());
    }

    public function test_changing_the_schedule_replaces_pending_doses_and_closes_their_alerts(): void
    {
        $itemId = $this->prescribe($this->item());
        $old = MedicationAdministration::query()->where('prescription_item_id', $itemId)->orderBy('scheduled_at')->firstOrFail();
        $alert = $this->openAlertFor($old);

        $this->putJson(self::ITEMS."/{$itemId}", $this->item('cada 12 horas', self::OTHER_FIRST_DOSE))->assertOk();

        $this->assertSame([self::SHOWN_OTHER_DOSE, '2026-11-03 08:00'], $this->scheduled());
        $this->assertCount(3, $this->scheduled('cancelado'));
        $this->assertSame(ClinicalAlert::STATUS_CLOSED, $alert->fresh()->status);
    }

    public function test_correcting_the_dose_keeps_the_schedule(): void
    {
        $itemId = $this->prescribe($this->item());
        $before = $this->scheduled();

        Carbon::setTestNow(self::OTHER_FIRST_DOSE);
        $this->putJson(self::ITEMS."/{$itemId}", [...$this->item(), 'dose' => '500 mg'])->assertOk();

        $this->assertSame([], $this->scheduled('cancelado'));
        $this->assertSame(array_slice($before, 0, 3), array_slice($this->scheduled(), 0, 3));
    }

    public function test_a_new_schedule_cannot_start_in_the_past(): void
    {
        $itemId = $this->prescribe($this->item());

        $this->putJson(self::ITEMS."/{$itemId}", $this->item('cada 12 horas', '2026-11-02 10:00:00'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['firstDoseAt']);
    }

    public function test_deleting_an_item_cancels_its_pending_doses_and_alerts(): void
    {
        $itemId = $this->prescribe($this->item(), $this->item(self::CADA_24_HORAS, self::OTHER_FIRST_DOSE, 'Omeprazol'));
        $dose = MedicationAdministration::query()->where('prescription_item_id', $itemId)->firstOrFail();
        $alert = $this->openAlertFor($dose);

        $this->deleteJson(self::ITEMS."/{$itemId}")->assertOk();

        $this->assertSame([self::SHOWN_OTHER_DOSE], $this->scheduled());
        $this->assertSame(ClinicalAlert::STATUS_CLOSED, $alert->fresh()->status);
    }

    public function test_replacing_the_plan_cancels_the_previous_pending_doses(): void
    {
        $this->prescribe($this->item());
        $this->prescribe($this->item(self::CADA_24_HORAS, self::OTHER_FIRST_DOSE, 'Omeprazol'));

        $this->assertSame([self::SHOWN_OTHER_DOSE], $this->scheduled());
    }

    public function test_extending_continues_the_same_times_without_duplicates(): void
    {
        $this->prescribe($this->item());

        Carbon::setTestNow('2026-11-03 09:00:00');
        $this->artisan('emar:extend-doses')->assertSuccessful();
        $this->artisan('emar:extend-doses')->assertSuccessful();

        $this->assertSame([
            self::SHOWN_FIRST_DOSE, '2026-11-03 02:30', '2026-11-03 10:30', '2026-11-03 18:30', '2026-11-04 02:30',
        ], $this->scheduled());
    }

    public function test_patient_exit_cancels_pending_doses_and_stops_new_ones(): void
    {
        $itemId = $this->prescribe($this->item());
        $alert = $this->openAlertFor(MedicationAdministration::query()->where('prescription_item_id', $itemId)->firstOrFail());

        PatientExit::query()->create([
            'encounter_id' => self::ENCOUNTER,
            'exited_at' => now(),
            'confirmed_by' => User::factory()->create(['role' => 'enfermera_piso'])->id,
        ]);
        PatientExited::dispatch(self::ENCOUNTER);

        $this->assertSame([], $this->scheduled());
        $this->assertSame(ClinicalAlert::STATUS_CLOSED, $alert->fresh()->status);

        Carbon::setTestNow('2026-11-04 09:00:00');
        $this->artisan('emar:extend-doses')->assertSuccessful();

        $this->assertSame([], $this->scheduled());
    }

    public function test_overdue_dose_of_an_exited_patient_opens_no_alert(): void
    {
        $this->prescribe($this->item(firstDoseAt: self::NOW));
        PatientExit::query()->create([
            'encounter_id' => self::ENCOUNTER,
            'exited_at' => now(),
            'confirmed_by' => auth()->id(),
        ]);

        Carbon::setTestNow('2026-11-02 18:00:00');
        $this->artisan('alerts:process-slas')->assertSuccessful();

        $this->assertDatabaseMissing('clinical_alerts', ['encounter_id' => self::ENCOUNTER, 'source' => 'emar']);
    }

    public function test_plan_without_first_dose_starts_now_and_does_not_backfill(): void
    {
        $prescription = Prescription::query()->create([
            'encounter_id' => self::ENCOUNTER,
            'status' => 'activo',
            'prescribed_by' => auth()->id(),
            'signed_at' => now()->subDays(3),
        ]);
        $prescription->items()->create(['drug_name' => 'Paracetamol', 'dose' => '1 g', 'route' => 'VO', 'frequency' => 'c/12h']);

        $this->artisan('emar:extend-doses')->assertSuccessful();

        $this->assertSame(['2026-11-02 17:00', '2026-11-03 05:00', '2026-11-03 17:00'], $this->scheduled());
    }

    public function test_emar_keeps_showing_an_overdue_dose_from_the_previous_shift(): void
    {
        $this->prescribe($this->item());
        $this->actingAs(User::factory()->create(['role' => 'enfermera_piso']));

        Carbon::setTestNow('2026-11-03 08:00:00');
        $response = $this->getJson(self::EMAR)->assertOk();

        $scheduled = collect($response->json('doses'))->pluck('scheduledAt')->all();
        $this->assertContains(Carbon::parse(self::FIRST_DOSE)->toIso8601String(), $scheduled);
    }

    public function test_unrecognized_frequency_creates_no_doses_and_warns_doctor_and_nurse(): void
    {
        app(CpoeService::class)->prescribe(self::ENCOUNTER, auth()->user(), [
            ['drugName' => 'Metformina', 'dose' => '850 mg', 'route' => 'oral', 'frequency' => 'una vez al día'],
        ]);
        $this->artisan('emar:extend-doses')->assertSuccessful();

        $this->assertSame([], $this->scheduled());
        $this->getJson(self::PRESCRIPTIONS.'/active')->assertJsonPath('prescription.items.0.needsSchedule', true);

        $this->actingAs(User::factory()->create(['role' => 'enfermera_piso']));
        $this->getJson(self::EMAR)->assertOk()->assertJsonPath('unscheduledDrugs', ['Metformina']);
    }

    public function test_choosing_a_listed_frequency_schedules_a_flagged_item(): void
    {
        $plan = app(CpoeService::class)->prescribe(self::ENCOUNTER, auth()->user(), [
            ['drugName' => 'Metformina', 'dose' => '850 mg', 'route' => 'oral', 'frequency' => 'BID'],
        ]);
        $itemId = $plan['prescription']['items'][0]['id'];

        $this->putJson(self::ITEMS."/{$itemId}", $this->item(self::CADA_24_HORAS))
            ->assertOk()
            ->assertJsonPath('prescription.items.0.needsSchedule', false);

        $this->assertSame([self::SHOWN_FIRST_DOSE], $this->scheduled());
    }

    public function test_only_explicit_hour_formats_are_read_from_free_text(): void
    {
        $this->assertSame(6, MedicationFrequency::intervalHours('cada 6h'));
        $this->assertSame(12, MedicationFrequency::intervalHours('c/12h'));
        $this->assertSame(8, MedicationFrequency::intervalHours('Cada 8 horas'));
        $this->assertNull(MedicationFrequency::intervalHours('BID'));
        $this->assertNull(MedicationFrequency::intervalHours('2 tabletas cada noche'));
        $this->assertNull(MedicationFrequency::intervalHours('1 hora antes de dormir'));
        $this->assertNull(MedicationFrequency::intervalHours('cada 0 horas'));
        $this->assertNull(MedicationFrequency::intervalHours(''));
    }

    public function test_continuing_the_plan_keeps_doses_and_does_not_repeat_a_given_one(): void
    {
        $itemId = $this->prescribe($this->item(firstDoseAt: self::NOW));
        $given = MedicationAdministration::query()->where('prescription_item_id', $itemId)->orderBy('scheduled_at')->firstOrFail();
        $given->update(['status' => 'administrado', 'administered_at' => now()]);
        $pending = $this->scheduled();

        $response = $this->postJson(self::PRESCRIPTIONS, [
            'continuePlan' => true,
            'items' => [$this->item(self::CADA_24_HORAS, self::OTHER_FIRST_DOSE, 'Omeprazol')],
        ])->assertCreated();

        $this->assertSame($itemId, $response->json('prescription.items.0.id'));
        $this->assertSame(['2026-11-02 17:00'], $this->scheduled('administrado'));
        $this->assertSame([], $this->scheduled('cancelado'));
        $this->assertEqualsCanonicalizing([...$pending, self::SHOWN_OTHER_DOSE], $this->scheduled());
    }

    public function test_continuing_the_plan_does_not_repeat_a_given_single_dose(): void
    {
        $itemId = $this->prescribe($this->item(MedicationFrequency::SINGLE_DOSE, self::NOW));
        MedicationAdministration::query()->where('prescription_item_id', $itemId)->firstOrFail()
            ->update(['status' => 'administrado', 'administered_at' => now()]);

        $this->postJson(self::PRESCRIPTIONS, [
            'continuePlan' => true,
            'items' => [$this->item(self::CADA_24_HORAS, self::OTHER_FIRST_DOSE, 'Omeprazol')],
        ])->assertCreated();

        $this->assertSame([self::SHOWN_OTHER_DOSE], $this->scheduled());
    }
}
