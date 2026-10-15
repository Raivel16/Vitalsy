<?php

namespace Tests\Feature;

use App\Exceptions\InteropUnavailableException;
use App\Models\AdmissionEncounter;
use App\Models\LabResult;
use App\Models\User;
use App\Services\Interoperability\FhirLisClient;
use App\Services\Interoperability\FhirPacsClient;
use App\Services\Interoperability\InteropMetrics;
use App\Services\Interoperability\LisClient;
use App\Services\Interoperability\PacsClient;
use App\Services\Interoperability\StubLisClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FhirInteroperabilityTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(string $name): array
    {
        return json_decode(file_get_contents(base_path("tests/Fixtures/fhir/{$name}.json")), true);
    }

    private function useFhir(): void
    {
        config([
            'interop.driver' => 'fhir',
            'interop.fhir.base_url' => 'https://lis.example.test/fhir',
            'interop.fhir.token' => 'SECRET-TOKEN',
            'interop.fhir.retry_sleep_ms' => 0,
        ]);
    }

    private function fakeLis(): void
    {
        Http::fake([
            '*/Encounter*' => Http::response($this->fixture('encounter-bundle'), 200),
            '*/Observation?page=2' => Http::response($this->fixture('lab-observations-page2'), 200),
            '*/Observation*' => Http::response($this->fixture('lab-observations-page1'), 200),
        ]);
    }

    public function test_default_driver_is_stub(): void
    {
        $this->assertInstanceOf(StubLisClient::class, app(LisClient::class));
    }

    public function test_fhir_driver_without_base_url_fails_fast_at_resolution(): void
    {
        config(['interop.driver' => 'fhir', 'interop.fhir.base_url' => null]);
        $this->expectException(\RuntimeException::class);
        app(LisClient::class);
    }

    public function test_lis_client_maps_observation_bundle_with_pagination_and_skips_malformed(): void
    {
        $this->useFhir();
        $this->fakeLis();

        $client = app(LisClient::class);
        $this->assertInstanceOf(FhirLisClient::class, $client);
        $items = $client->fetchLabResults('ENC-HOSP-0001');

        $this->assertCount(2, $items);
        $this->assertSame('obs-1', $items[0]['externalId']);
        $this->assertStringContainsString('Hemoglobina', $items[0]['summary']);
        $this->assertStringContainsString('11.2 g/dL', $items[0]['summary']);
        $this->assertStringContainsString('Low', $items[0]['summary']);
        $this->assertSame('2026-09-21T08:15:00+00:00', $items[0]['resultedAt']);
        $this->assertSame('obs-2', $items[1]['externalId']);
        $this->assertStringContainsString('Sin crecimiento', $items[1]['summary']);
        $encoded = json_encode($items[0]['payload']);
        $this->assertStringNotContainsString('JUAN PEREZ', $encoded);
        $this->assertStringNotContainsString('Dra. Secreta', $encoded);
        $this->assertArrayHasKey('referenceRange', $items[0]['payload']);

        Http::assertSent(fn ($r) => $r->hasHeader('Authorization', 'Bearer SECRET-TOKEN')
            && str_contains($r->header('Accept')[0] ?? '', 'application/fhir+json'));
    }

    public function test_metrics_count_ok_and_malformed_entries_without_phi(): void
    {
        $this->useFhir();
        $this->fakeLis();
        app(LisClient::class)->fetchLabResults('ENC-HOSP-0001');

        $this->assertSame(2, DB::table('interop_message_logs')->where('system', 'lis')->where('outcome', 'ok')->count());
        $this->assertSame(1, DB::table('interop_message_logs')->where('system', 'lis')->where('outcome', 'error')->count());
        $this->assertStringNotContainsString('JUAN', json_encode(DB::table('interop_message_logs')->get()));
    }

    public function test_pagination_is_bounded(): void
    {
        $this->useFhir();
        config(['interop.fhir.max_pages' => 1]);
        $this->fakeLis();
        $items = app(LisClient::class)->fetchLabResults('ENC-HOSP-0001');
        $this->assertCount(1, $items);
    }

    public function test_remote_failure_raises_controlled_503_after_retries(): void
    {
        $this->useFhir();
        Http::fake(['*' => Http::response('boom', 500)]);

        try {
            app(LisClient::class)->fetchLabResults('ENC-HOSP-0001');
            $this->fail('Debio lanzar excepcion');
        } catch (InteropUnavailableException $e) {
            $this->assertSame('No se pudo consultar el laboratorio. Intente de nuevo.', $e->getMessage());
        }
        Http::assertSentCount(3);
        $this->assertDatabaseHas('interop_message_logs', ['system' => 'lis', 'outcome' => 'error']);
    }

    public function test_pacs_client_maps_diagnostic_reports(): void
    {
        $this->useFhir();
        Http::fake([
            '*/Encounter*' => Http::response($this->fixture('encounter-bundle'), 200),
            '*/DiagnosticReport*' => Http::response($this->fixture('imaging-reports'), 200),
        ]);

        $client = app(PacsClient::class);
        $this->assertInstanceOf(FhirPacsClient::class, $client);
        $items = $client->fetchImagingReports('ENC-HOSP-0001');

        $this->assertCount(1, $items);
        $this->assertSame('dr-1', $items[0]['externalId']);
        $this->assertSame('CR', $items[0]['modality']);
        $this->assertStringContainsString('Sin consolidaciones', $items[0]['summary']);
        $this->assertStringNotContainsString('AAAA', json_encode($items[0]['payload']));
        $this->assertStringNotContainsString('JUAN', json_encode($items[0]['payload']));
    }

    public function test_api_returns_503_and_still_serves_stored_results_when_lis_is_down(): void
    {
        $this->useFhir();
        Http::fake(['*' => Http::response('', 503)]);
        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-HOSP-0001', 'order_number' => 'OI-1', 'source' => 'manual',
            'transfer_order_number' => 'OT-1', 'patient_name' => 'X', 'document_type' => 'DNI',
            'document_number' => '99887766', 'origin_service' => 'Medicina', 'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada', 'coverage_plan' => 'Regular', 'room' => '401', 'bed' => 'A',
            'service' => 'Medicina', 'wristband_code' => 'BRZ-1', 'record_id' => 'EXP-1', 'current_step' => 'cerrado',
            'waiting_reason' => null, 'deliverables' => [], 'clinical_payload' => [],
        ]);
        LabResult::query()->create([
            'encounter_id' => 'ENC-HOSP-0001', 'external_id' => 'OLD-1', 'summary' => 'Previo',
            'payload' => [], 'resulted_at' => now(),
        ]);
        $this->actingAs(User::factory()->create(['role' => 'medico_residente']));

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/lab-results/sync')
            ->assertStatus(503)
            ->assertJsonPath('message', 'No se pudo consultar el laboratorio. Intente de nuevo.');
        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/lab-results')
            ->assertOk();
    }

    public function test_success_rate_command_reports_and_fails_below_threshold(): void
    {
        $this->artisan('interop:success-rate')->assertExitCode(0);
        $m = app(InteropMetrics::class);
        for ($i = 0; $i < 99; $i++) {
            $m->record('lis', 'Observation', true, "o{$i}");
        }
        $this->artisan('interop:success-rate')->assertExitCode(0);
        $m->record('lis', 'Observation', false, null, 'malformed');
        $m->record('lis', 'Observation', false, null, 'malformed');
        $this->artisan('interop:success-rate')->assertExitCode(1);
    }
}
