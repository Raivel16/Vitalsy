<?php

namespace Tests\Feature;

use App\Exceptions\ImmutableRecordException;
use App\Models\AlertAcknowledgement;
use App\Models\AlertEscalation;
use App\Models\AlertEvent;
use App\Models\ClinicalAlert;
use App\Models\DischargeIndicationReceipt;
use App\Models\MedicationAdministration;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/** RNF-07: historial, acuses, firmas y controles de tiempo no admiten edicion ni borrado. */
class TraceabilityImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    private function alert(): ClinicalAlert
    {
        return ClinicalAlert::query()->create([
            'encounter_id' => 'ENC-1', 'source' => 'news2', 'severity' => 'alta', 'message' => 'NEWS2 7',
            'status' => 'abierta', 'generated_at' => now(),
        ]);
    }

    public function test_alert_event_ack_and_escalation_cannot_be_updated_or_deleted(): void
    {
        $alert = $this->alert();
        $event = AlertEvent::query()->create(['alert_id' => $alert->id, 'type' => 'generada', 'occurred_at' => now()]);
        $ack = AlertAcknowledgement::query()->create(['alert_id' => $alert->id, 'role' => 'enfermera_piso', 'acknowledged_at' => now()]);
        $esc = AlertEscalation::query()->create(['alert_id' => $alert->id, 'to_role' => 'enfermera_supervisora', 'reason' => 'SLA', 'escalated_at' => now()]);

        foreach ([[$event, 'type'], [$ack, 'role'], [$esc, 'reason']] as [$record, $column]) {
            try {
                $record->update([$column => 'adulterado']);
                $this->fail(get_class($record).' admitio update');
            } catch (ImmutableRecordException) {
                $this->assertTrue(true);
            }
            try {
                $record->delete();
                $this->fail(get_class($record).' admitio delete');
            } catch (ImmutableRecordException) {
                $this->assertTrue(true);
            }
        }

        $this->expectException(ImmutableRecordException::class);
        AlertAcknowledgement::query()->update(['role' => 'x']);
    }

    public function test_database_triggers_block_raw_query_builder_mutations(): void
    {
        $alert = $this->alert();
        AlertEvent::query()->create(['alert_id' => $alert->id, 'type' => 'generada', 'occurred_at' => now()]);
        AlertEscalation::query()->create(['alert_id' => $alert->id, 'to_role' => 'x', 'reason' => 'SLA', 'escalated_at' => now()]);

        foreach (['alert_events', 'alert_escalations'] as $table) {
            try {
                DB::table($table)->update(['updated_at' => now()->addDay()]);
                $this->fail("$table admitio UPDATE crudo");
            } catch (QueryException) {
                $this->assertTrue(true);
            }
            try {
                DB::table($table)->delete();
                $this->fail("$table admitio DELETE crudo");
            } catch (QueryException) {
                $this->assertTrue(true);
            }
        }
    }

    public function test_medication_dose_is_mutable_until_signed_then_frozen(): void
    {
        $dose = MedicationAdministration::query()->create([
            'encounter_id' => 'ENC-1', 'scheduled_at' => now(), 'status' => 'pendiente',
        ]);

        $dose->update(['barcode_ok' => false]);
        $dose->update(['status' => 'administrado', 'administered_at' => now(), 'barcode_ok' => true]);

        try {
            $dose->update(['status' => 'pendiente']);
            $this->fail('dosis firmada admitio update');
        } catch (ImmutableRecordException) {
            $this->assertTrue(true);
        }
        try {
            $dose->delete();
            $this->fail('dosis firmada admitio delete');
        } catch (ImmutableRecordException) {
            $this->assertTrue(true);
        }
        try {
            DB::table('medication_administrations')->where('id', $dose->id)->update(['status' => 'cancelado']);
            $this->fail('trigger no bloqueo la dosis firmada');
        } catch (QueryException) {
            $this->assertTrue(true);
        }
    }

    public function test_pending_doses_can_still_be_cancelled_in_bulk(): void
    {
        MedicationAdministration::query()->create(['encounter_id' => 'ENC-1', 'scheduled_at' => now(), 'status' => 'pendiente']);

        $count = MedicationAdministration::query()->where('status', 'pendiente')->update(['status' => 'cancelado']);

        $this->assertSame(1, $count);
    }

    public function test_discharge_receipt_is_immutable(): void
    {
        $receipt = DischargeIndicationReceipt::query()->create([
            'encounter_id' => 'ENC-1', 'received_by_name' => 'Familiar', 'received_at' => now(),
        ]);

        $this->expectException(ImmutableRecordException::class);
        $receipt->update(['received_by_name' => 'Otro']);
    }

    public function test_no_http_route_updates_or_deletes_protected_resources(): void
    {
        $protected = '/alert-events|acknowledgements?|escalations?|medication-administrations|indication-receipts?|administrations?/i';

        foreach (Route::getRoutes() as $route) {
            $mutating = array_intersect($route->methods(), ['PUT', 'PATCH', 'DELETE']);
            if ($mutating === []) {
                continue;
            }
            $this->assertDoesNotMatchRegularExpression($protected, $route->uri(), 'Ruta mutante sobre registro inmutable: '.$route->uri());
        }
    }
}
