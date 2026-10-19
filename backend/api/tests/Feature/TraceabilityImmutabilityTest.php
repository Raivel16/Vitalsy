<?php

namespace Tests\Feature;

use App\Exceptions\ImmutableRecordException;
use App\Models\AlertAcknowledgement;
use App\Models\AlertEscalation;
use App\Models\AlertEvent;
use App\Models\ClinicalAlert;
use App\Models\DischargeIndicationReceipt;
use App\Models\Handover;
use App\Models\MedicalEvolutionNote;
use App\Models\MedicationAdministration;
use App\Models\User;
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
        $protected = [
            'alert-events', 'acknowledg', 'escalation', 'medication-administrations', 'administrations',
            'indication-receipt', 'medical-evolution-notes', 'handover',
        ];
        $inspected = 0;

        foreach (Route::getRoutes()->getRoutes() as $route) {
            $methods = $route->methods();
            $uri = $route->uri();
            foreach ($protected as $needle) {
                if (! str_contains($uri, $needle)) {
                    continue;
                }
                $inspected++;
                $this->assertSame(
                    [],
                    array_values(array_intersect($methods, ['PUT', 'PATCH', 'DELETE'])),
                    "Ruta mutante sobre registro inmutable: {$uri}",
                );
            }
        }

        $this->assertGreaterThan(0, $inspected, 'El escaneo debe encontrar rutas de los recursos protegidos');
    }

    public function test_user_reference_cannot_be_nulled_while_the_user_exists(): void
    {
        $user = User::factory()->create();
        $alert = $this->alert();
        $ack = AlertAcknowledgement::query()->create([
            'alert_id' => $alert->id, 'user_id' => $user->id, 'role' => 'enfermera_piso', 'acknowledged_at' => now(),
        ]);

        try {
            $ack->update(['user_id' => null]);
            $this->fail('el modelo admitió anular el autor');
        } catch (ImmutableRecordException) {
            $this->assertTrue(true);
        }
        try {
            DB::table('alert_acknowledgements')->where('id', $ack->id)->update(['user_id' => null]);
            $this->fail('el trigger admitió anular el autor');
        } catch (QueryException) {
            $this->assertTrue(true);
        }

        // Al eliminarse el usuario, ON DELETE SET NULL sigue funcionando.
        $user->delete();
        $this->assertNull(DB::table('alert_acknowledgements')->where('id', $ack->id)->value('user_id'));
    }

    public function test_signed_dose_keeps_nurse_until_the_user_is_deleted(): void
    {
        $nurse = User::factory()->create();
        $dose = MedicationAdministration::query()->create([
            'encounter_id' => 'ENC-1', 'scheduled_at' => now(), 'status' => 'administrado',
            'administered_at' => now(), 'nurse_user_id' => $nurse->id,
        ]);

        $this->expectException(ImmutableRecordException::class);
        try {
            $dose->update(['nurse_user_id' => null]);
        } finally {
            $this->assertSame($nurse->id, (int) DB::table('medication_administrations')->value('nurse_user_id'));
            $nurse->delete();
            $this->assertNull(DB::table('medication_administrations')->value('nurse_user_id'));
        }
    }

    public function test_signed_medical_note_is_frozen_but_unsigned_one_is_editable(): void
    {
        $draft = MedicalEvolutionNote::query()->create(['encounter_id' => 'E', 'body' => 'borrador']);
        $draft->update(['body' => 'borrador corregido']);
        $draft->update(['signed_at' => now()]);

        try {
            $draft->update(['body' => 'adulterado']);
            $this->fail('nota firmada admitió update');
        } catch (ImmutableRecordException) {
            $this->assertTrue(true);
        }
        try {
            $draft->delete();
            $this->fail('nota firmada admitió delete');
        } catch (ImmutableRecordException) {
            $this->assertTrue(true);
        }
        try {
            DB::table('medical_evolution_notes')->where('id', $draft->id)->update(['signed_at' => null]);
            $this->fail('trigger admitió des-firmar');
        } catch (QueryException) {
            $this->assertTrue(true);
        }
        try {
            DB::table('medical_evolution_notes')->where('id', $draft->id)->delete();
            $this->fail('trigger admitió borrar');
        } catch (QueryException) {
            $this->assertTrue(true);
        }
    }

    public function test_signed_handover_is_frozen_but_unsigned_one_is_editable(): void
    {
        $from = User::factory()->create();
        $to = User::factory()->create();
        $draft = Handover::query()->create(['from_user_id' => $from->id, 'to_user_id' => $to->id, 'payload' => ['a' => 1]]);
        $draft->update(['payload' => ['a' => 2]]);
        $draft->update(['signed_at' => now()]);

        try {
            $draft->update(['payload' => ['a' => 3]]);
            $this->fail('entrega firmada admitió update');
        } catch (ImmutableRecordException) {
            $this->assertTrue(true);
        }
        try {
            $draft->delete();
            $this->fail('entrega firmada admitió delete');
        } catch (ImmutableRecordException) {
            $this->assertTrue(true);
        }
        try {
            DB::table('handovers')->where('id', $draft->id)->update(['to_user_id' => $from->id]);
            $this->fail('trigger admitió update');
        } catch (QueryException) {
            $this->assertTrue(true);
        }
    }
}
