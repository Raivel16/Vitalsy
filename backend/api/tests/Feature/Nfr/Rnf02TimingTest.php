<?php

namespace Tests\Feature\Nfr;

use App\Models\AdmissionEncounter;
use App\Models\User;
use App\Services\Clinical\ButterworthFilter;
use App\Services\Clinical\News2Calculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RNF-02: Butterworth de 4º orden + NEWS2 en <= 1 s por registro (servidor).
 *
 * Mide en sqlite en memoria; el hardware de CI varía, por eso el umbral es el
 * del requisito (1 s) sobre el promedio y el p95 se imprime para inspección.
 * Una medición real contra PostgreSQL y hardware objetivo sigue pendiente.
 */
#[Group('nfr')]
class Rnf02TimingTest extends TestCase
{
    use RefreshDatabase;

    private const RECORDS = 20;

    public function test_butterworth_and_news2_alone_stay_within_100_ms_for_a_realistic_window(): void
    {
        $filter = new ButterworthFilter;
        $news2 = new News2Calculator;
        $window = [];
        for ($i = 0; $i < 300; $i++) { // 5 min a 1 Hz
            $window[] = 72 + 6 * sin($i / 5) + (($i * 7) % 5);
        }

        $start = hrtime(true);
        $filtered = $filter->zeroPhaseFourthOrder($window);
        $score = $news2->calculate([
            'respiratoryRate' => 16, 'oxygenSaturation' => 97, 'systolicBloodPressure' => 118,
            'pulse' => round(end($filtered)), 'temperature' => 36.8, 'consciousness' => 'alert',
        ]);
        $elapsedMs = (hrtime(true) - $start) / 1e6;

        $this->assertCount(300, $filtered);
        $this->assertArrayHasKey('total', $score);
        fwrite(STDERR, sprintf("\n[RNF-02] filtro+NEWS2 ventana 300: %.2f ms\n", $elapsedMs));
        $this->assertLessThan(100.0, $elapsedMs);
    }

    public function test_full_telemetry_path_averages_under_one_second_per_record(): void
    {
        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-NFR-0001', 'order_number' => 'OI-NFR-1', 'source' => 'manual',
            'transfer_order_number' => 'OT-NFR-1', 'patient_name' => 'Paciente NFR',
            'document_type' => 'DNI', 'document_number' => '11223344', 'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud', 'coverage_status' => 'aprobada', 'coverage_plan' => 'Regular',
            'room' => '401', 'bed' => 'A', 'service' => 'Medicina', 'wristband_code' => 'BRZ-NFR-1',
            'record_id' => 'EXP-NFR-1', 'current_step' => 'cerrado', 'waiting_reason' => null,
            'deliverables' => [], 'clinical_payload' => [],
        ]);
        $this->actingAs(User::factory()->create(['role' => 'enfermera_piso']));

        $samples = [];
        for ($i = 0; $i < 60; $i++) {
            $samples[] = [
                'pulse' => 130 + ($i % 3), 'oxygenSaturation' => 90, 'respiratoryRate' => 26,
                'systolicBloodPressure' => 95, 'temperature' => 38.9,
            ];
        }

        $times = [];
        for ($i = 0; $i < self::RECORDS; $i++) {
            $start = hrtime(true);
            $this->postJson('/api/v1/inpatient-care/encounters/ENC-NFR-0001/vital-signs/telemetry', [
                'samples' => $samples, 'consciousness' => 'alert',
                'supplementalOxygen' => false, 'spo2Scale' => 'scale1',
            ])->assertCreated();
            $times[] = (hrtime(true) - $start) / 1e9;
        }

        sort($times);
        $mean = array_sum($times) / count($times);
        $p95 = $times[(int) ceil(0.95 * count($times)) - 1];
        fwrite(STDERR, sprintf("\n[RNF-02] %d registros: media %.3f s, p95 %.3f s, max %.3f s\n", count($times), $mean, $p95, max($times)));

        $this->assertLessThan(1.0, $mean, 'RNF-02: el registro completo debe procesarse en < 1 s en promedio');
    }
}
