<?php

namespace Tests\Feature;

use App\Events\ClinicalAlertRaised;
use App\Events\ClinicalAlertUpdated;
use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\LifeAccount;
use App\Models\User;
use App\Services\ClinicalAlerts\AlertAudience;
use App\Services\ClinicalAlerts\AlertRecorder;
use App\Services\ClinicalAlerts\AlertWorkflow;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/** RNF-01 / RNF-12: las alertas se empujan por WebSocket a quienes las ven en su bandeja. */
class ClinicalAlertBroadcastTest extends TestCase
{
    use RefreshDatabase;

    private User $nurse;

    private User $nurse2;

    private User $supervisor;

    private User $resident;

    private User $inactiveNurse;

    private User $admission;

    protected function setUp(): void
    {
        parent::setUp();
        $this->nurse = User::factory()->create(['role' => 'enfermera_piso']);
        $this->nurse2 = User::factory()->create(['role' => 'enfermera_piso']);
        $this->supervisor = User::factory()->create(['role' => 'enfermera_supervisora']);
        $this->resident = User::factory()->create(['role' => 'medico_residente']);
        $this->inactiveNurse = User::factory()->create(['role' => 'enfermera_piso', 'is_active' => false]);
        $this->admission = User::factory()->create(['role' => 'admision']);

        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-BC-1', 'order_number' => 'OI-BC-1', 'source' => 'manual',
            'transfer_order_number' => 'OT-BC-1', 'patient_name' => 'Nombre Secreto Paciente',
            'document_type' => 'DNI', 'document_number' => '11223344', 'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud', 'coverage_status' => 'aprobada', 'coverage_plan' => 'Regular',
            'room' => '507', 'bed' => 'B', 'service' => 'Medicina', 'wristband_code' => 'BRZ-BC-1',
            'record_id' => 'EXP-BC-1', 'current_step' => 'cerrado', 'waiting_reason' => null,
            'deliverables' => [], 'clinical_payload' => [],
        ]);
    }

    /** @return list<int> */
    private function raisedTo(): array
    {
        $ids = Event::dispatched(ClinicalAlertRaised::class)->map(fn ($args) => $args[0]->userId)->values()->all();
        sort($ids);

        return $ids;
    }

    /** @return list<int> */
    private function updatedTo(): array
    {
        $ids = Event::dispatched(ClinicalAlertUpdated::class)->map(fn ($args) => $args[0]->userId)->values()->all();
        sort($ids);

        return $ids;
    }

    /** @return list<int> */
    private function sorted(int ...$ids): array
    {
        sort($ids);

        return $ids;
    }

    public function test_news2_alert_is_raised_to_active_floor_nurses_only(): void
    {
        Event::fake([ClinicalAlertRaised::class, ClinicalAlertUpdated::class]);

        app(AlertRecorder::class)->openFromMonitoring('ENC-BC-1', 8);

        $this->assertSame($this->sorted($this->nurse->id, $this->nurse2->id), $this->raisedTo());
        $this->assertSame([], $this->updatedTo());
    }

    public function test_observation_alert_is_raised_to_floor_nurses(): void
    {
        Event::fake([ClinicalAlertRaised::class, ClinicalAlertUpdated::class]);

        app(AlertWorkflow::class)->observe('ENC-BC-1', ['note' => 'Paciente pálido', 'severity' => 'alta'], $this->admission);

        $this->assertSame($this->sorted($this->nurse->id, $this->nurse2->id), $this->raisedTo());
    }

    public function test_escalation_raises_to_supervisors_and_updates_previous_recipients(): void
    {
        $alert = app(AlertRecorder::class)->openFromMonitoring('ENC-BC-1', 8);
        $alert->update(['acknowledge_due_at' => now()->subMinute()]);

        Event::fake([ClinicalAlertRaised::class, ClinicalAlertUpdated::class]);
        app(AlertWorkflow::class)->processOverdueAlerts();

        $this->assertSame([$this->supervisor->id], $this->raisedTo());
        $this->assertSame($this->sorted($this->nurse->id, $this->nurse2->id), $this->updatedTo());
    }

    public function test_acknowledge_dispatches_updates_to_every_recipient(): void
    {
        $alert = app(AlertRecorder::class)->openFromMonitoring('ENC-BC-1', 8);

        Event::fake([ClinicalAlertRaised::class, ClinicalAlertUpdated::class]);
        app(AlertWorkflow::class)->acknowledge($alert, $this->nurse);

        $this->assertSame([], $this->raisedTo());
        $this->assertSame($this->sorted($this->nurse->id, $this->nurse2->id), $this->updatedTo());

        $payload = Event::dispatched(ClinicalAlertUpdated::class)->first()[0]->broadcastWith();
        $this->assertSame($alert->id, $payload['alertId']);
        $this->assertFalse($payload['needsSiren']);
    }

    public function test_raised_payload_is_minimal_and_private_channel_per_user(): void
    {
        Event::fake([ClinicalAlertRaised::class]);
        app(AlertRecorder::class)->openFromMonitoring('ENC-BC-1', 8);

        $event = Event::dispatched(ClinicalAlertRaised::class)->first()[0];
        $payload = $event->broadcastWith();

        $this->assertEqualsCanonicalizing(
            ['alertId', 'severity', 'news2Total', 'encounterId', 'location', 'status', 'createdAt', 'needsSiren'],
            array_keys($payload),
        );
        $this->assertStringNotContainsString('Secreto', json_encode($payload));
        $this->assertSame(8, $payload['news2Total']);
        $this->assertTrue($payload['needsSiren']);
        $this->assertSame('Habitación 507, lecho B', $payload['location']);

        $channels = $event->broadcastOn();
        $this->assertCount(1, $channels);
        $this->assertInstanceOf(PrivateChannel::class, $channels[0]);
        $this->assertSame('private-alerts.'.$event->userId, $channels[0]->name);
        $this->assertSame('alert.raised', $event->broadcastAs());
    }

    public function test_audience_matches_inbox_visibility_for_every_status(): void
    {
        $users = [
            $this->nurse, $this->supervisor, $this->resident, $this->admission,
            User::factory()->create(['role' => 'camillero']),
            User::factory()->create(['role' => 'equipo_respuesta_rapida']),
        ];
        $workflow = app(AlertWorkflow::class);
        $statuses = [
            ClinicalAlert::STATUS_OPEN, ClinicalAlert::STATUS_IN_PROGRESS, ClinicalAlert::STATUS_SUPERVISOR,
            ClinicalAlert::STATUS_DOCTOR_NOTIFIED, ClinicalAlert::STATUS_DOCTOR_IN_PROGRESS,
            ClinicalAlert::STATUS_RRT_REQUESTED, ClinicalAlert::STATUS_RRT_ESCALATED,
            ClinicalAlert::STATUS_ICU_ORDERED, ClinicalAlert::STATUS_ICU_AUTHORIZED,
            ClinicalAlert::STATUS_IN_ICU, ClinicalAlert::STATUS_CLOSED,
        ];
        $roles = ['enfermera_piso', 'enfermera_supervisora', 'medico_residente', 'equipo_respuesta_rapida', null];

        foreach ($statuses as $status) {
            foreach ($roles as $role) {
                ClinicalAlert::withoutEvents(fn () => ClinicalAlert::query()->delete());
                $alert = ClinicalAlert::withoutEvents(fn () => ClinicalAlert::query()->create([
                    'encounter_id' => 'ENC-BC-1', 'source' => 'news2', 'severity' => 'alta', 'news2_total' => 8,
                    'message' => 'x', 'status' => $status, 'assigned_role' => $role, 'generated_at' => now(),
                ]));
                foreach ($users as $user) {
                    $inInbox = collect($workflow->inboxFor($user)['alerts'])->contains('id', $alert->id);
                    $this->assertSame($inInbox, AlertAudience::sees($user, $alert), "{$status}/{$role}/{$user->role}");
                }
            }
        }
    }

    public function test_channel_authorization_allows_only_own_active_staff_channel(): void
    {
        // El driver null no valida nada: se usa reverb con claves de prueba (la firma es local).
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
        Broadcast::forgetDrivers();
        require base_path('routes/channels.php');

        $auth = fn (User $user, int $id) => $this->actingAs($user->fresh())->postJson('/api/v1/broadcasting/auth', [
            'socket_id' => '1234.5678', 'channel_name' => 'private-alerts.'.$id,
        ]);

        $this->assertSame(200, $auth($this->nurse, $this->nurse->id)->status());
        $this->assertSame(403, $auth($this->nurse, $this->nurse2->id)->status());
        $this->assertContains($auth($this->inactiveNurse, $this->inactiveNurse->id)->status(), [401, 403]);
    }

    public function test_channel_callback_denies_life_accounts_and_inactive_users(): void
    {
        $this->nurse = $this->nurse->fresh();
        $this->inactiveNurse = $this->inactiveNurse->fresh();
        $callback = Broadcast::driver()->getChannels()->get('alerts.{userId}');
        $life = new LifeAccount;
        $life->id = $this->nurse->id;

        $this->assertNotNull($callback);
        $this->assertTrue((bool) $callback($this->nurse, (string) $this->nurse->id));
        $this->assertFalse((bool) $callback($life, (string) $this->nurse->id));
        $this->assertFalse((bool) $callback($this->inactiveNurse, (string) $this->inactiveNurse->id));
        $this->assertFalse((bool) $callback($this->nurse, (string) $this->nurse2->id));
    }

    public function test_event_names_match_frontend_constants(): void
    {
        $this->assertSame('alert.raised', (new ClinicalAlertRaised(1, []))->broadcastAs());
        $this->assertSame('alert.updated', (new ClinicalAlertUpdated(1, []))->broadcastAs());

        $frontend = file_get_contents(base_path('../../frontend/web/src/modules/clinical-alerts/realtime/alertEvents.ts'));
        $this->assertStringContainsString('"alert.raised"', $frontend);
        $this->assertStringContainsString('"alert.updated"', $frontend);
    }

    public function test_rolled_back_alert_never_broadcasts_and_committed_one_does_once_per_recipient(): void
    {
        Event::fake([ClinicalAlertRaised::class, ClinicalAlertUpdated::class]);

        DB::beginTransaction();
        app(AlertRecorder::class)->openFromMonitoring('ENC-BC-1', 8);
        $this->assertSame([], $this->raisedTo(), 'no debe emitir antes del commit');
        DB::rollBack();
        $this->assertSame([], $this->raisedTo());

        DB::beginTransaction();
        app(AlertRecorder::class)->openFromMonitoring('ENC-BC-1', 8);
        $this->assertSame([], $this->raisedTo());
        DB::commit();
        $this->assertSame($this->sorted($this->nurse->id, $this->nurse2->id), $this->raisedTo());
    }

    public function test_broadcast_auth_route_has_the_same_middleware_stack_as_authenticated_api_routes(): void
    {
        $routes = app('router')->getRoutes();
        $auth = $routes->match(Request::create('/api/v1/broadcasting/auth', 'POST'));
        $me = $routes->match(Request::create('/api/v1/hospital-admission/encounters', 'GET'));

        $this->assertSame(
            app('router')->gatherRouteMiddleware($me),
            app('router')->gatherRouteMiddleware($auth),
        );
    }

    public function test_real_stateful_session_flow_authorizes_only_own_channel(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
        Broadcast::forgetDrivers();
        require base_path('routes/channels.php');

        $this->nurse->forceFill(['password' => 'Clave-Segura-123', 'must_change_password' => false])->save();
        $headers = ['Origin' => 'http://localhost', 'Referer' => 'http://localhost/'];

        $login = $this->withHeaders($headers)->postJson('/api/v1/auth/login', [
            'email' => $this->nurse->email, 'password' => 'Clave-Segura-123',
        ]);
        $login->assertOk();
        $cookies = collect($login->headers->getCookies())->mapWithKeys(fn ($c) => [$c->getName() => $c->getValue()])->all();

        $call = fn (int $id, array $cookies) => $this->withHeaders($headers)->withUnencryptedCookies([])
            ->withCookies($cookies)->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678', 'channel_name' => 'private-alerts.'.$id,
            ]);

        $own = $call($this->nurse->id, $cookies);
        $own->assertOk();
        $this->assertStringStartsWith('test-key:', $own->json('auth'));
        $this->assertSame(403, $call($this->nurse2->id, $cookies)->status());

        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->assertContains($call($this->nurse->id, [])->status(), [401, 403]);
    }
}
