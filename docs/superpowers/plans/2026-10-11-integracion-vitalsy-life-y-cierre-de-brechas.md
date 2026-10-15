# Integración Vitalsy Life ↔ Clinical y cierre de brechas — Plan de implementación

> **Para agentes:** SUB-SKILL requerida: `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans`. Los pasos usan casillas `- [ ]`.
> **Proceso del repo (CLAUDE.md):** este plan debe ser aprobado explícitamente antes de editar código funcional. TDD obligatorio. Una rama `feature/RF-XX-…` por fase, desde `dev`, commits Conventional Commits `tipo(alcance): RF-XX descripción`.

**Meta:** que Vitalsy Life (Expo) hable con el backend Laravel y que admisión y alta de Clinical consuman y emitan datos reales de Life, más cerrar las brechas de RNF y marca detectadas en la auditoría del 2026-10-11.

**Arquitectura:** cuentas ciudadanas separadas de `users` (modelo `LifeAccount`, mismo Sanctum, abilidad `life`); namespace `/api/v1/life/*` para la app y rutas nuevas bajo `hospital-admission` y `discharge` para el personal. El contrato (códigos, planes, línea de base) vive en `docs/architecture/contrato-clinical-life.md` y lo prueban tests en ambos lados. La app deja de simular: sin servidor sigue diciendo «En el teléfono».

**Stack:** Laravel 12 / PHP 8.2 / Sanctum / PHPUnit; React 19 + Vite + Vitest; Expo (Jest). Reverb (WebSockets) en la fase 6.

**Spec:** `docs/requirements/requerimientos.md` (RF-06, 61, 89–98; RNF-01, 05–07, 10–13, 17–19), `docs/architecture/modulo-7-vitalsy-life.md`, `UI/Vitalsy Life/plan-implementacion.md` y la auditoría del 2026-10-11.

## Restricciones globales

- Clave de rol de personal nunca se reutiliza para ciudadanos: `LifeAccount` no tiene `role`; `EnsureUserRole` ya responde 403 si `role` es null (verificado en `app/Http/Middleware/EnsureUserRole.php`).
- Códigos de vinculación `VL-XXXX-XXXX` (formato de `formatLinkCode` en `movil/src/modules/privacy/domain/consent.ts`).
- Life es *wellness*: el servidor de Life no calcula NEWS2 ni diagnostica (RNF-10).
- `encounter_id` es string indexado **sin FK** en tablas clínicas; mismo criterio en las tablas nuevas.
- Todo texto de UI en español; validación previa al envío y feedback de éxito/error en cada formulario web.
- Sin `migrate:fresh` sobre datos a conservar.
- Registros de trazabilidad (consentimientos, importaciones, planes reclamados) son inmutables una vez confirmados (RNF-07).

## Review Focus

1. Código de vinculación vencido, ya consumido o con compartición revocada → 422 con mensaje, nunca importa datos.
2. Una cuenta de personal usando `/api/v1/life/*` y una cuenta ciudadana usando rutas clínicas → 403 en ambos sentidos.
3. Mismo lote de muestras reenviado (reintento por red) → idempotente, sin duplicados.
4. Revocar el consentimiento después de importar la línea de base → el expediente conserva la importación ya hecha, pero un código nuevo ya no funciona.
5. QR de alta de un paciente sin cuenta, reclamado dos veces → la segunda falla sin filtrar el plan.

---

## Fase 0 — Contrato y documentación (sin código funcional)

### Task 0: Contrato Clinical ↔ Life

**Archivos**
- Crear: `docs/architecture/contrato-clinical-life.md`
- Modificar: `docs/architecture/modulo-7-vitalsy-life.md`, `docs/architecture/modelo-datos.md`, `CLAUDE.md` (corregir «14 roles» → 15), `docs/agent-context.md`

**Interfaz que produce (las demás tareas la consumen):**

| Endpoint | Actor | Entrada | Salida |
|---|---|---|---|
| `POST /api/v1/life/auth/register` | ciudadano | `{name,email,password}` | `{token, account}` |
| `POST /api/v1/life/auth/login` | ciudadano | `{email,password}` | `{token, account}` |
| `POST /api/v1/life/sync` | ciudadano | `{items:[{id,kind,body,status}]}` | `{accepted:[id], rejected:[{id,reason}]}` |
| `PUT /api/v1/life/consent` | ciudadano | `{sharingEnabled}` | `{sharingEnabled, revokedAt}` |
| `POST /api/v1/life/link-codes` | ciudadano | — | `{code, expiresAt}` (409 si compartición cerrada) |
| `POST /api/v1/hospital-admission/life-links` | admision | `{encounterId, code}` | `{link:{status, importedAt, baselineSummary}}` |
| `GET /api/v1/hospital-admission/encounters/{id}/life-baseline` | enfermera_piso, médicos | — | `{baseline: null \| {importedAt, metrics:[{kind,low,high,days}]}}` |
| `POST /api/v1/discharge/encounters/{id}/life-plan` | enfermera_piso | `{mode: 'usuario'\|'invitacion'\|'rechaza'}` | `{lifePlan:{mode, code, invitationCode, payload}}` |
| `GET /api/v1/life/discharge-plans/{code}` | ciudadano | — | JSON del plan (`medications`, `comfortSigns`, `homeCare`, `validUntil`) |

- [ ] **Paso 1:** Escribir `contrato-clinical-life.md` con la tabla anterior, los códigos de error (`422 code_expired`, `422 code_consumed`, `409 sharing_closed`, `404 plan_not_found`, `409 plan_claimed`), TTL del código de vinculación (30 min, un solo uso) y la forma de `baselineSummary`.
- [ ] **Paso 2:** Reescribir en `modulo-7` la frase «Esos endpoints todavía no existen» y «Vitalsy Clinical no se modifica en este corte».
- [ ] **Paso 3:** Commit.

```bash
git add docs CLAUDE.md
git commit -m "docs(life): RF-94 contrato Clinical-Life y roles reales"
```

---

## Fase 1 — Backend de Vitalsy Life (RF-89, 90, 91, 93, 94, 92 lado servidor)

Rama: `feature/RF-89-backend-vitalsy-life`

### Task 1: Cuentas ciudadanas y autenticación

**Archivos**
- Crear: `backend/api/database/migrations/2026_10_12_100000_create_life_tables.php`
- Crear: `backend/api/app/Models/LifeAccount.php`, `backend/api/app/Http/Controllers/Api/Life/LifeAuthController.php`, `backend/api/app/Http/Middleware/EnsureLifeAccount.php`
- Modificar: `backend/api/routes/api.php`, `backend/api/bootstrap/app.php` (alias `life`)
- Test: `backend/api/tests/Feature/LifeAuthApiTest.php`

**Interfaces — produce:** modelo `LifeAccount` (`HasApiTokens`, sin `role`); middleware alias `life`; tests usan `Sanctum::actingAs($account, ['life'])`.

- [ ] **Paso 1: prueba que falla**

```php
<?php

namespace Tests\Feature;

use App\Models\LifeAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeAuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_citizen_registers_and_receives_token(): void
    {
        $this->postJson('/api/v1/life/auth/register', [
            'name' => 'Ana Rojas', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9',
        ])->assertCreated()->assertJsonStructure(['token', 'account' => ['id', 'name', 'email']]);

        $this->assertDatabaseHas('life_accounts', ['email' => 'ana@correo.pe']);
    }

    public function test_login_rejects_wrong_password(): void
    {
        LifeAccount::query()->create(['name' => 'Ana', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9']);

        $this->postJson('/api/v1/life/auth/login', ['email' => 'ana@correo.pe', 'password' => 'otra'])
            ->assertStatus(422);
    }

    public function test_staff_cannot_use_life_routes_and_citizen_cannot_use_clinical_routes(): void
    {
        $staff = User::factory()->create(['role' => 'admision']);
        $this->actingAs($staff);
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true])->assertForbidden();

        $citizen = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'a@b.pe', 'password' => 'Clave-segura-9']);
        Sanctum::actingAs($citizen, ['life']);
        $this->getJson('/api/v1/hospital-admission/encounters')->assertForbidden();
    }
}
```

- [ ] **Paso 2:** `php artisan test --filter=LifeAuthApiTest` → FAIL (404 / clase inexistente).
- [ ] **Paso 3: implementación mínima.** Migración con las tablas de abajo, modelo, controlador y rutas.

```php
// 2026_10_12_100000_create_life_tables.php (up)
Schema::create('life_accounts', function (Blueprint $t) {
    $t->id();
    $t->string('name');
    $t->string('email')->unique();
    $t->string('password');
    $t->timestamps();
});
Schema::create('life_biometric_samples', function (Blueprint $t) {
    $t->id();
    $t->foreignId('life_account_id')->constrained('life_accounts')->cascadeOnDelete();
    $t->string('client_id', 64);
    $t->string('kind', 24);
    $t->decimal('value', 8, 2);
    $t->string('unit', 16);
    $t->timestamp('started_at');
    $t->timestamp('ended_at');
    $t->string('origin', 24);
    $t->timestamps();
    $t->unique(['life_account_id', 'client_id']);
});
Schema::create('life_consents', function (Blueprint $t) {
    $t->id();
    $t->foreignId('life_account_id')->unique()->constrained('life_accounts')->cascadeOnDelete();
    $t->boolean('sharing_enabled')->default(false);
    $t->timestamp('revoked_at')->nullable();
    $t->timestamps();
});
Schema::create('life_link_codes', function (Blueprint $t) {
    $t->id();
    $t->foreignId('life_account_id')->constrained('life_accounts')->cascadeOnDelete();
    $t->string('code', 16)->unique();
    $t->timestamp('expires_at');
    $t->timestamp('consumed_at')->nullable();
    $t->string('consumed_encounter_id')->nullable()->index();
    $t->timestamps();
});
Schema::create('life_baseline_imports', function (Blueprint $t) {
    $t->id();
    $t->string('encounter_id')->index();
    $t->foreignId('life_account_id')->constrained('life_accounts');
    $t->json('baseline');
    $t->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
    $t->timestamp('imported_at');
    $t->timestamps();
});
Schema::create('life_discharge_plans', function (Blueprint $t) {
    $t->id();
    $t->string('encounter_id')->unique();
    $t->string('mode', 16);
    $t->string('code', 20)->nullable()->unique();
    $t->string('invitation_code', 20)->nullable()->unique();
    $t->json('payload');
    $t->date('valid_until');
    $t->string('status', 16)->default('pendiente'); // pendiente | activo | reclamado
    $t->foreignId('claimed_by_account_id')->nullable()->constrained('life_accounts')->nullOnDelete();
    $t->timestamp('claimed_at')->nullable();
    $t->timestamp('custody_transferred_at')->nullable();
    $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $t->timestamps();
});
```

```php
// app/Models/LifeAccount.php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class LifeAccount extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = ['name', 'email', 'password'];
    protected $hidden = ['password'];
    protected function casts(): array { return ['password' => 'hashed']; }
}
```

```php
// routes/api.php, dentro de Route::prefix('v1')
Route::prefix('life')->group(function () {
    Route::post('auth/register', [LifeAuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('auth/login', [LifeAuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware(['auth:sanctum', 'life'])->group(function () {
        Route::post('sync', [LifeSyncController::class, 'store']);
        Route::put('consent', [LifeConsentController::class, 'update']);
        Route::post('link-codes', [LifeLinkCodeController::class, 'store']);
        Route::get('discharge-plans/{code}', [LifeDischargePlanController::class, 'show']);
    });
});
```

`EnsureLifeAccount`: `abort_unless($request->user() instanceof LifeAccount, 403)`. En `bootstrap/app.php` registrar el alias `life`. Para el sentido inverso, las rutas clínicas ya devuelven 403 porque `EnsureUserRole` lee `->role` (null en `LifeAccount`); sin embargo `active` y `password.rotated` leen atributos de `User`: **añadir en esos dos middlewares `if (! $request->user() instanceof User) return response()->json(['message'=>'No tiene permiso para esta acción.'], 403);` al inicio**, y cubrirlo con el tercer test.

- [ ] **Paso 4:** `php artisan test --filter=LifeAuthApiTest` → PASS.
- [ ] **Paso 5:** `./vendor/bin/pint` y commit.

```bash
git add backend/api
git commit -m "feat(life): RF-89 cuentas ciudadanas y autenticacion con Sanctum"
```

### Task 2: Ingesta idempotente y consentimiento (RF-89, 92, 93)

**Archivos**
- Crear: `Api/Life/LifeSyncController.php`, `Api/Life/LifeConsentController.php`, `app/Services/Life/LifeSync.php`, modelos `LifeBiometricSample`, `LifeConsent`
- Test: `backend/api/tests/Feature/LifeSyncApiTest.php`

**Interfaces — consume:** `Sanctum::actingAs($account, ['life'])`. **Produce:** `LifeSync::ingest(LifeAccount $a, array $items): array{accepted: list<string>, rejected: list<array{id:string,reason:string}>}`.

- [ ] **Paso 1: pruebas que fallan**

```php
public function test_resending_same_batch_is_idempotent(): void
{
    $this->asCitizen();
    $item = [
        'id' => 'bio-1', 'kind' => 'biometrics', 'status' => 'pending',
        'body' => json_encode([[
            'id' => 's1', 'kind' => 'heart_rate', 'value' => 72, 'unit' => 'bpm',
            'startedAt' => '2026-10-10T08:00:00Z', 'endedAt' => '2026-10-10T08:01:00Z', 'origin' => 'health_connect',
        ]]),
    ];

    $this->postJson('/api/v1/life/sync', ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');
    $this->postJson('/api/v1/life/sync', ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');

    $this->assertDatabaseCount('life_biometric_samples', 1);
}

public function test_unknown_kind_and_out_of_range_values_are_rejected_not_stored(): void
{
    $this->asCitizen();
    $bad = ['id' => 'bio-2', 'kind' => 'biometrics', 'status' => 'pending', 'body' => json_encode([[
        'id' => 's2', 'kind' => 'spo2', 'value' => 400, 'unit' => '%',
        'startedAt' => '2026-10-10T08:00:00Z', 'endedAt' => '2026-10-10T08:01:00Z', 'origin' => 'manual',
    ]])];

    $this->postJson('/api/v1/life/sync', ['items' => [$bad]])
        ->assertOk()->assertJsonPath('rejected.0.id', 'bio-2');
    $this->assertDatabaseCount('life_biometric_samples', 0);
}

public function test_revoking_consent_closes_sharing(): void
{
    $account = $this->asCitizen();
    $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true])->assertOk()->assertJsonPath('sharingEnabled', true);
    $this->putJson('/api/v1/life/consent', ['sharingEnabled' => false])
        ->assertOk()->assertJsonPath('sharingEnabled', false)->assertJsonStructure(['revokedAt']);
}
```

- [ ] **Paso 2:** correr → FAIL.
- [ ] **Paso 3:** implementar. Reglas de `LifeSync`: tipos válidos = `BIOMETRIC_KINDS` de `movil/src/modules/health-sync/domain/types.ts` (heart_rate, resting_heart_rate, hrv, spo2, sleep, steps, skin_temperature, body_temperature); rango de `spo2` 50–100, pulso 20–250 (misma regla que `validateManual`); `firstOrCreate` por `(life_account_id, client_id)`; `kind: consent` y `kind: plan` se aceptan y se registran sin efecto clínico (el servidor es la fuente para consentimiento vía `PUT /consent`).
- [ ] **Paso 4:** PASS + commit `feat(life): RF-89 ingesta idempotente y consentimiento revocable`.

### Task 3: Línea de base en servidor (RF-90) y código de vinculación (RF-94)

**Archivos**
- Crear: `app/Services/Life/BaselineCalculator.php`, `Api/Life/LifeLinkCodeController.php`
- Test: `tests/Unit/BaselineCalculatorTest.php`, `tests/Feature/LifeLinkCodeApiTest.php`

**Interfaz — produce:** `BaselineCalculator::summarize(Collection $samples): array<int, array{kind:string,low:float,high:float,days:int}>` con la misma regla que `buildBaselines` del móvil: percentil 10–90, sin contar las 3 lecturas más recientes, y `days < 7` ⇒ se omite la métrica (línea de base en construcción).

- [ ] **Paso 1: pruebas que fallan**

```php
public function test_baseline_is_omitted_with_less_than_seven_days_of_history(): void
{
    $samples = $this->hrSamples(days: 5);
    $this->assertSame([], (new BaselineCalculator)->summarize($samples));
}

public function test_baseline_excludes_three_most_recent_readings(): void
{
    $samples = $this->hrSamples(days: 10, values: [60,61,62,63,64,65,66,67,68,69,200,200,200]);
    $metric = (new BaselineCalculator)->summarize($samples)[0];
    $this->assertSame('heart_rate', $metric['kind']);
    $this->assertLessThan(100, $metric['high']);
}
```

```php
public function test_link_code_requires_open_sharing(): void
{
    $this->asCitizen();
    $this->postJson('/api/v1/life/link-codes')->assertStatus(409)->assertJsonPath('code', 'sharing_closed');
}

public function test_link_code_has_expected_format_and_expiry(): void
{
    $this->asCitizen();
    $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true]);
    $this->postJson('/api/v1/life/link-codes')->assertCreated()
        ->assertJsonPath('code', fn ($c) => preg_match('/^VL-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $c) === 1);
}
```

- [ ] **Paso 2:** FAIL → **Paso 3:** implementar (código con `Str::upper(Str::random(8))`, TTL 30 min, un código activo por cuenta: emitir uno nuevo invalida los anteriores no consumidos) → **Paso 4:** PASS → commit `feat(life): RF-90 linea de base y RF-94 codigo de vinculacion en servidor`.

### Task 4: Nudges del sistema (RF-91)

**Archivos:** `app/Services/Life/NudgeEngine.php`, `Api/Life/LifeNoticesController.php` (`GET /api/v1/life/notices`), test `LifeNoticesApiTest.php`.

- [ ] **Paso 1:** prueba: con 3 lecturas consecutivas de pulso fuera del rango personal, `GET /life/notices` devuelve un aviso `kind: preventivo` con texto sin la palabra «crítico», «grave» ni «NEWS2» (regla del kit de marca).
- [ ] **Paso 2–4:** FAIL → implementar regla espejo de `draftNudge` → PASS. Commit `feat(life): RF-91 notificaciones preventivas desde servidor`.

---

## Fase 2 — Admisión consume Life (RF-06, RF-95, RF-18, RF-38)

Rama: `feature/RF-95-admision-vincula-life`

### Task 5: Backend — importar línea de base

**Archivos**
- Modificar: `HospitalAdmissionController.php` (nuevos `linkLife`, `showLifeBaseline`), `routes/api.php`, `AdmissionBoard.php` (`storeConsent` guarda `lifeUser`), `PatientClinicalChart.php` (incluir `lifeBaseline`)
- Crear: `app/Services/Life/LifeLinking.php`
- Test: `tests/Feature/LifeAdmissionLinkApiTest.php`

**Interfaces — consume:** `life_link_codes`, `BaselineCalculator`. **Produce:** `LifeLinking::link(string $encounterId, string $code, User $by): array`.

- [ ] **Paso 1: pruebas que fallan**

```php
public function test_admission_imports_baseline_with_valid_code(): void
{
    [$account, $code] = $this->citizenWithCodeAndHistory();
    $this->encounter('ENC-LIFE-1');
    $this->asRole('admision');

    $this->postJson('/api/v1/hospital-admission/life-links', ['encounterId' => 'ENC-LIFE-1', 'code' => $code])
        ->assertCreated()
        ->assertJsonPath('link.status', 'importada');

    $this->asRole('enfermera_piso');
    $this->getJson('/api/v1/hospital-admission/encounters/ENC-LIFE-1/life-baseline')
        ->assertOk()->assertJsonPath('baseline.metrics.0.kind', 'heart_rate');
}

public function test_consumed_or_expired_code_is_rejected(): void
{
    [$account, $code] = $this->citizenWithCodeAndHistory();
    $this->encounter('ENC-LIFE-1');
    $this->encounter('ENC-LIFE-2');
    $this->asRole('admision');
    $this->postJson('/api/v1/hospital-admission/life-links', ['encounterId' => 'ENC-LIFE-1', 'code' => $code])->assertCreated();

    $this->postJson('/api/v1/hospital-admission/life-links', ['encounterId' => 'ENC-LIFE-2', 'code' => $code])
        ->assertStatus(422)->assertJsonPath('code', 'code_consumed');

    $this->travel(31)->minutes();
    $this->postJson('/api/v1/hospital-admission/life-links', ['encounterId' => 'ENC-LIFE-2', 'code' => 'VL-ZZZZ-ZZZZ'])
        ->assertStatus(422);
}

public function test_revoked_sharing_blocks_import(): void { /* revocar y esperar 422 sharing_closed */ }
```

- [ ] **Paso 2:** FAIL → **Paso 3:** implementar (transacción: bloquear fila del código, verificar `consumed_at`, `expires_at`, consentimiento abierto; crear `life_baseline_imports`; marcar código consumido; lanzar `ClinicalRuleException` con `code`) → **Paso 4:** PASS.
- [ ] **Paso 5:** `storeConsent` acepta `lifeUser` (bool) y lo guarda en `clinical_payload['consent']['lifeUser']`; test que lo verifica en `AdmissionCensusApiTest`.
- [ ] **Paso 6:** commit `feat(admision): RF-95 importa linea de base de Vitalsy Life con codigo de vinculacion`.

### Task 6: Frontend — consentimiento y valoración con datos reales

**Archivos**
- Modificar: `frontend/web/src/modules/admission/pages/IdentityPages.tsx` (líneas ~296–346), `frontend/web/src/modules/nursing-assessment/pages/NursingPages.tsx` (~106–110), `frontend/web/src/modules/patient-chart/**` (pestaña Admisión)
- Test: `identity-pages.life.test.tsx`, `nursing-assessment.life.test.tsx`

- [ ] **Paso 1: prueba que falla** — al marcar «es usuario de Life», introducir código y enviar, se llama `POST hospital-admission/life-links` y se muestra «Línea de base importada»; con 422 se muestra el mensaje del servidor y no se avanza.
- [ ] **Paso 2:** FAIL → **Paso 3:** reemplazar el hint «pendiente de backend» por el flujo real: validar formato `/^VL-[A-Z0-9]{4}-[A-Z0-9]{4}$/` antes de enviar (regla en `shared/validation/inputRules.ts`), estado de éxito/error con `Feedback`.
- [ ] **Paso 4:** `NursingPages.tsx` carga `life-baseline`; si hay datos, muestra una `MetricRow` por métrica con rango personal y fecha de importación; si no, el texto actual. Test de ambos estados.
- [ ] **Paso 5:** `npm test -- --run src/modules/admission src/modules/nursing-assessment` → PASS. Commit `feat(admision): RF-06 vincula Vitalsy Life y muestra la linea de base`.

---

## Fase 3 — Alta y custodia (RF-61, RF-96, RF-97, RF-98)

Rama: `feature/RF-96-alta-qr-life`

### Task 7: Backend — plan de seguimiento y QR patrocinado

**Archivos**
- Crear: `app/Services/Life/DischargeLifePlan.php`, `Api/Life/LifeDischargePlanController.php`, modelo `LifeDischargePlan`
- Modificar: `DischargeController.php` (`storeLifePlan`), `DischargeService::present` (campo `lifePlan` estructurado), `routes/api.php`
- Test: `tests/Feature/LifeDischargePlanApiTest.php`

**Interfaz — produce:** `DischargeLifePlan::issue(string $encounterId, string $mode, User $by): LifeDischargePlan`; payload exacto que acepta la app: `{id, medications:[{name,dose,schedule:'HH:mm'}], comfortSigns:[string], homeCare:[string], validUntil:'YYYY-MM-DD'}`.

- [ ] **Paso 1: pruebas que fallan**

```php
public function test_nurse_issues_structured_plan_from_prescriptions(): void
{
    $this->dischargeReady('ENC-ALTA-0001'); // receta con 1 ítem + informe de enfermería
    $this->asRole('enfermera_piso');

    $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/life-plan', ['mode' => 'invitacion'])
        ->assertCreated()
        ->assertJsonPath('lifePlan.mode', 'invitacion')
        ->assertJsonPath('lifePlan.payload.medications.0.schedule', '08:00')
        ->assertJsonStructure(['lifePlan' => ['code', 'invitationCode']]);
}

public function test_plan_requires_prescription_and_reconciliation(): void
{
    $this->inpatientEncounter('ENC-ALTA-0002');
    $this->asRole('enfermera_piso');
    $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0002/life-plan', ['mode' => 'usuario'])
        ->assertStatus(422);
}

public function test_citizen_claims_plan_once(): void
{
    $code = $this->issuedPlanCode();
    $this->asCitizen();
    $this->getJson("/api/v1/life/discharge-plans/{$code}")->assertOk()->assertJsonStructure(['medications', 'validUntil']);
    $other = $this->asCitizen('otra@correo.pe');
    $this->getJson("/api/v1/life/discharge-plans/{$code}")->assertStatus(409)->assertJsonPath('code', 'plan_claimed');
}

public function test_exit_transfers_custody_and_activates_plan(): void
{
    $code = $this->issuedPlanCode();
    $this->asRole('enfermera_piso');
    $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/exit')->assertOk();

    $this->assertNotNull(\App\Models\LifeDischargePlan::query()->first()->custody_transferred_at);
    $this->assertSame('activo', \App\Models\LifeDischargePlan::query()->first()->status);
}
```

- [ ] **Paso 2:** FAIL → **Paso 3:** implementar. Mapeo receta → medicaciones: leer `ambulatory_prescriptions.content` (estructura ya usada en `storePrescriptions`; **verificar la forma exacta leyendo `DischargeService::storePrescriptions` antes de codificar el mapeo**); `schedule` por defecto `08:00` si la receta no trae hora; `validUntil` = hoy + 30 días; `comfortSigns` ← `alarm_signs` separado por saltos de línea; `homeCare` ← `home_care` sin las líneas «Vitalsy Life: …».
- [ ] **Paso 4:** nuevo listener `ActivateLifePlanOnExit` (RF-98) escuchando `PatientExited`: `status = 'activo'`, `custody_transferred_at = now()`. Registrar junto a `DispatchCleaningOnPatientExit` en `AppServiceProvider`.
- [ ] **Paso 5:** PASS + `./vendor/bin/pint --test`. Commit `feat(alta): RF-96 plan y codigo de invitacion estructurados para Vitalsy Life`.

### Task 8: Frontend — ficha de egreso con QR real

**Archivos:** `frontend/web/src/modules/discharge/pages/DischargeCasePage.tsx` (`LifeQr` en ~329, selector ~288–326), `discharge/hooks` o `api` del módulo, test `discharge-life-qr.test.tsx`.

- [ ] **Paso 1: prueba que falla:** al elegir «invitación» y guardar, se llama `POST …/life-plan`, y el QR codifica `lifePlan.invitationCode` (no el `encounterId`); en modo «usuario» el QR codifica `lifePlan.code`; en «rechaza» no hay QR.
- [ ] **Paso 2–4:** reemplazar `value={encounterId}` por el código devuelto; retirar la concatenación `Vitalsy Life: …` dentro de `homeCare` y leer el modo desde `case.lifePlan.mode`; imprimir el QR en la hoja de alta (`shared/print/`). Estado de carga y error con `Feedback`.
- [ ] **Paso 5:** `npm test` PASS → commit `feat(alta): RF-61 QR de Vitalsy Life emitido por el servidor`.

---

## Fase 4 — App móvil contra el backend (RF-89–98, RNF-12, RNF-19)

Rama: `feature/RF-92-movil-api-real`

### Task 9: Cliente API autenticado

**Archivos**
- Modificar: `movil/src/shared/api/lifeClient.ts`, `lifeClient.test.ts`, `movil/src/modules/life/LifeProvider.tsx`
- Crear: `movil/src/shared/api/tokenStore.ts` (expo-secure-store), `movil/src/shared/api/lifeClient.errors.ts`

**Interfaces — produce:**

```ts
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code?: string; message: string };
export function createLifeClient(baseUrl: string, getToken: () => Promise<string | null>): {
  register(i: {name: string; email: string; password: string}): Promise<ApiResult<{token: string; account: {id: number; name: string; email: string}}>>;
  login(i: {email: string; password: string}): Promise<ApiResult<{token: string; account: {id: number; name: string; email: string}}>>;
  sync(items: SyncItem[]): Promise<ApiResult<{accepted: string[]; rejected: {id: string; reason: string}[]}>>;
  setConsent(sharingEnabled: boolean): Promise<ApiResult<{sharingEnabled: boolean; revokedAt: string | null}>>;
  issueLinkCode(): Promise<ApiResult<{code: string; expiresAt: string}>>;
  fetchDischargePlan(code: string): Promise<ApiResult<string>>;
};
```

- [ ] **Paso 1: prueba que falla** (`lifeClient.test.ts`): `sync` envía `Authorization: Bearer <token>` a `${base}/api/v1/life/sync`; un 401 devuelve `{ok:false,status:401}`; una red caída devuelve `{ok:false,status:0,message:'Sin conexión'}`; `accepted` marca elementos como `synced`, `rejected` los deja `pending` con motivo.
- [ ] **Paso 2–4:** implementar; sustituir `postLifeBatch`/`fetchDischargeBody` (que usan `/api/life/...` sin token) por el cliente; **el item solo pasa a `synced` si su `id` está en `accepted`** (hoy se marca todo el lote con un `response.ok`).
- [ ] **Paso 5:** `npm test` en `movil/` → PASS. Commit `feat(movil): RF-89 cliente API autenticado con v1/life`.

### Task 10: Login y registro reales

**Archivos:** `movil/src/modules/auth/domain/auth.ts` (+ test), `AuthScreen.tsx`, `LifeProvider.tsx`.

- [ ] **Paso 1: prueba que falla:** con API configurada, `registerAccount` llama al servidor y guarda solo el token (no el hash); sin API configurada se conserva el modo local actual y el banner dice «Cuenta solo en este teléfono».
- [ ] **Paso 2–4:** mantener `validateRegister`/`validateLogin` como validación previa; eliminar el mensaje `PASSWORD_RECOVERY_MESSAGE` cuando hay servidor (RF-99 equivalente móvil). Cerrar sesión borra token y cola sensible.
- [ ] **Paso 5:** commit `feat(movil): RF-99 inicio de sesion de ciudadano contra el servidor`.

### Task 11: Privacidad, código y plan desde servidor

**Archivos:** `consent.ts`, `PrivacyScreens.tsx`, `plan.ts`, `PlanScreens.tsx`, `lifeApp.ts`.

- [ ] **Paso 1: pruebas que fallan:** `issueLinkingCode` con servidor llama `issueLinkCode()` y muestra el código y `expiresAt` (cuenta regresiva); sin servidor sigue sin inventar código válido (hoy `formatLinkCode(randomHex)` genera uno local que el servidor nunca conocerá — **se elimina la generación local cuando hay API**); `activateFromCode` consume `fetchDischargePlan`, trata 409 `plan_claimed` con mensaje «Este plan ya fue activado en otra cuenta».
- [ ] **Paso 2–4:** implementar; revocar llama `setConsent(false)`; encolar `consent` solo como respaldo offline.
- [ ] **Paso 5:** commit `feat(movil): RF-93 RF-94 RF-97 privacidad y plan post-alta desde el servidor`.

### Task 12: Apple HealthKit (RNF-19) y ejecución en segundo plano (RF-89)

**Archivos:** `movil/src/modules/health-sync/HealthKitSource.ts`, `HealthDataSource.ts` (fábrica `createHealthSource`), `app.json` (plugin + `NSHealthShareUsageDescription`), tests de mapeo `mapHealthKitRecords.test.ts`.

- [ ] **Paso 1:** prueba de mapeo HealthKit → `BiometricSample` (`origin: 'health_kit'`, ya presente en `SampleOrigin`).
- [ ] **Paso 2–4:** implementar fuente de solo lectura; en Android registrar tarea de fondo con `expo-background-task`/`expo-task-manager` que llame a `syncHealth` (máx. cada 15 min).
- [ ] **Paso 5:** documentar en `movil/documento.md` la prueba manual en development build iOS/Android y la medición de batería (criterio ≤5 %/día, RNF-19). Commit `feat(movil): RNF-19 HealthKit y sincronizacion en segundo plano`.

---

## Fase 5 — Marca y diseño

Rama: `chore/marca-vitalsy-life`

### Task 13: Ícono, splash y wordmark de la app

**Archivos:** `movil/assets/icon.png`, `splash-icon.png`, `android-icon-{foreground,background,monochrome}.png`, `favicon.png`, `movil/src/shared/ui/Wordmark.tsx`, `movil/src/shared/theme/tokens.ts`, `movil/app.json`.

**Hallazgos verificados:** `icon.png` es el chevron azul genérico de la plantilla de Expo; `Wordmark.tsx` usa `#E6F4F3` (el kit define `#E6F6F3`); `tokens.ts` define `aire` con canvas `#F6F9FF` y `chalk` con `#FAF9F6`, mientras la maqueta «Aire cotidiano» pide canvas `#FAF9F6`, acento `#2B8A88`, soft wash `#E6F6F3`, OK `#2E7D52`.

- [ ] **Paso 1 (decisión del usuario):** la marca oficial es el logo que ya usan las interfaces del proyecto Expo (`movil/src/shared/ui/Wordmark.tsx`, usado en `AppHeader`, `WelcomeScreen` y `AuthScreen`), **no** los mocks de `UI/`. No rediseñar el logo; solo reproducirlo fielmente.
- [ ] **Paso 2:** generar los assets (`icon.png` 1024×1024, `android-icon-foreground.png` con zona segura 66 %, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png`) a partir de ese mismo wordmark (texto «Vitalsy», pastilla «Life», colores de `tokens.ts`) mediante un script reproducible `movil/scripts/generate-brand-assets.mjs` (usar `sharp` o `@resvg/resvg-js` como devDependency) que dibuje el SVG y lo exporte. Reemplazar los PNG de plantilla de Expo. El script queda versionado.
- [ ] **Paso 3:** alinear `Wordmark.tsx` y `tokens.ts` con el kit; test de snapshot de `Wordmark` y verificación de contraste AA en `tokens.test.ts` (nuevo).
- [ ] **Paso 4:** verificar que los assets generados coinciden con el wordmark en pantalla. Commit `fix(movil): marca e iconografia oficial de Vitalsy Life`.

### Task 14: Marca web y pantallas de integración

**Archivos:** `frontend/web/public/favicon.svg`, `frontend/web/src/shared/ui/Icons.tsx` (`SealIcon`), `clinical.css` (`.life-panel`, `.ops-life-card`).

- [ ] **Paso 1–3:** unificar favicon con el wordmark «Vitalsy + línea vital» que documenta `agent-context.md` (hoy es una cruz con insignia roja); revisar `.life-panel` y `.ops-life-card` contra `screen_b_consentimiento_informado` y `screen_2_ficha_de_egreso`; estados vacíos honestos («Aún no hay línea de base importada»).
- [ ] **Paso 4:** commit `fix(web): RNF-16 marca e identidad visual unificadas`.

---

## Fase 6 — Requerimientos no funcionales

Cada tarea es una rama propia; ninguna depende de las fases 1–5 salvo la 17.

### Task 15: Alertas por WebSocket (RNF-01, RNF-12, RF-53)

**Archivos:** `backend/api/composer.json` (`laravel/reverb`), `config/reverb.php`, `app/Events/ClinicalAlertRaised.php` (`ShouldBroadcast`, canal privado `alerts.{userId}`), `routes/channels.php`, `AlertRecorder.php` (disparar evento), `frontend/web/src/modules/clinical-alerts/hooks/useAlertInbox.ts` (reemplazar `setInterval` por suscripción con *fallback* a polling), `docker-compose*.yml` (servicio `reverb`), nginx (`/app` upgrade).

- [ ] **Paso 1: prueba que falla (backend):** `Event::fake()`; al crearse una alerta NEWS2 ≥ 7 se despacha `ClinicalAlertRaised` hacia la enfermera responsable.
- [ ] **Paso 2: prueba que falla (frontend):** con un cliente Echo falso, `useAlertInbox` actualiza el contador sin esperar al temporizador y, tras desconexión, reintenta en ≤ 5 s y hace un refresh completo al reconectar.
- [ ] **Paso 3–5:** implementar y medir con script `scripts/measure-alert-latency.php` (RNF-01 ≤ 2 s) registrando p95. Commit `feat(alertas): RNF-01 despacho por WebSocket con reconexion`.

### Task 16: Cifrado en reposo e inmutabilidad (RNF-06, RNF-07)

**Archivos:** modelos clínicos con texto sensible (`NursingEvolutionNote`, `MedicalEvolutionNote`, `PatientAllergy`, `EpicrisisDocument`, `SocialAssessment`, `Prescription*`, `LifeBiometricSample`), migraciones de columnas a `text`, `AlertEvent`, `AlertAcknowledgement`, `AlertEscalation`, `MedicationAdministration`.

- [ ] **Paso 1: pruebas que fallan:** (a) leer la columna cruda con `DB::table(...)` no contiene el texto en claro; (b) `update()`/`delete()` sobre `AlertEvent`, `AlertAcknowledgement` y `MedicationAdministration` lanzan excepción (hook `updating`/`deleting` en un *trait* `Immutable`).
- [ ] **Paso 2–4:** casts `encrypted` / `encrypted:array`, `APP_KEY` rotación documentada, comando `php artisan vitalsy:encrypt-existing` idempotente para datos previos (con `--dry-run`). **Riesgo alto: probar en copia de BD antes de producción.**
- [ ] **Paso 5:** commit `feat(seguridad): RNF-06 RNF-07 cifrado en reposo e inmutabilidad de trazabilidad`.

### Task 17: TLS 1.3 y datos entre Clinical y Life (RNF-05, RNF-10)

**Archivos:** `docker/nginx/prod.conf` (o equivalente), `docker-compose.prod.yml`, `AppServiceProvider` (`URL::forceHttps` en producción).

- [ ] **Paso 1:** prueba de humo `scripts/check-tls.sh` (`curl -sI http://…` ⇒ 301 a https; `openssl s_client -tls1_3`).
- [ ] **Paso 2:** `ssl_protocols TLSv1.3;`, HSTS, redirección 80→443; la app móvil rechaza `http://` fuera de `__DEV__`.
- [ ] **Paso 3:** commit `chore(seguridad): RNF-05 solo TLS 1.3 en produccion`.

### Task 18: Interoperabilidad real LIS/PACS (RNF-17)

**Archivos:** `app/Services/Interoperability/FhirLisClient.php`, `FhirPacsClient.php`, `config/interop.php`, binding por entorno en `AppServiceProvider`, tests con `Http::fake()`.

- [ ] **Paso 1: prueba que falla:** `FhirLisClient` transforma un `Bundle` de `Observation` en la forma que `LabResultsIntegrator` ya consume, y cuenta éxito/fracaso en una métrica `interop_messages_total`.
- [ ] **Paso 2–4:** mantener los `Stub*` como valor por defecto en `local/testing`; cliente real activado por `INTEROP_DRIVER=fhir`. **Depende de que el cliente entregue endpoint y credenciales del HIS/LIS/PACS.**
- [ ] **Paso 5:** commit `feat(interop): RNF-17 clientes FHIR para LIS y PACS`.

### Task 19: Disponibilidad, respaldos y carga (RNF-02, 03, 04, 11, 13)

**Archivos:** `scripts/backup-db.sh`, `docs/operacion/recuperacion-ante-desastres.md`, `scripts/load/k6-alertas.js`, `backend/api/tests/Feature/Nfr/Rnf02TimingTest.php`.

- [ ] **Paso 1: prueba que falla:** `Rnf02TimingTest` mide Butterworth + NEWS2 sobre un registro y exige `< 1.0 s`.
- [ ] **Paso 2:** `pg_dump` diario con retención y verificación de restauración (RPO ≤ 24 h) + runbook con pasos y tiempos (RTO ≤ 4 h).
- [ ] **Paso 3:** escenario k6 con 200 usuarios virtuales sobre censo, alertas y signos vitales; umbral p95 y degradación ≤ 10 %.
- [ ] **Paso 4:** matriz de navegadores (RNF-18) con Playwright en Chromium, Firefox y WebKit contra los recorridos críticos; añadir job a `.github/workflows/ci.yml`.
- [ ] **Paso 5:** commit `chore(calidad): RNF-02 RNF-04 RNF-13 mediciones, carga y respaldos`.

---

## Fase 7 — Cierre

### Task 20: Documentación, grafo y pruebas de punta a punta

- [ ] **Paso 1:** prueba de extremo a extremo `LifeEndToEndTest` (backend): registro ciudadano → consentimiento → código → admisión importa → alta emite plan → salida activa custodia → ciudadano reclama el plan.
- [ ] **Paso 2:** actualizar `modulo-1-admision.md`, `modulo-4-alta.md`, `modulo-7-vitalsy-life.md`, `modelo-datos.md`, colección Yaak para `life/*` y admisión/alta.
- [ ] **Paso 3:** anexar nota final en `AGENTS.md` y `docs/agent-context.md` (solo se agrega).
- [ ] **Paso 4:** `scripts/pre-push.sh` y `graphify update .`.
- [ ] **Paso 5:** commit `docs(life): RF-98 cierre de la integracion Clinical-Life`.

---

## Orden y dependencias

```
Tarea 0 ─► 1 ─► 2 ─► 3 ─► 5 ─► 6
                      │      └──────► 7 ─► 8 ─► 20
                      └► 4
        9 ─► 10 ─► 11 ─► 12   (requiere 1–3 y 7 en servidor)
        13 ∥ 14               (independientes; 13 requiere el logo maestro)
        15, 16, 18, 19 independientes entre sí; 17 antes de producción
```

Estimación gruesa: Fases 0–3 ≈ 2 semanas; Fase 4 ≈ 1.5 semanas; Fase 5 ≈ 3 días (depende del logo); Fase 6 ≈ 2–3 semanas (Tarea 18 bloqueada por insumos externos).

## Autorrevisión

- **Cobertura:** RF-06, 61, 89–98 → Tareas 1–12; marca → 13–14; RNF-01, 05, 06, 07, 10, 11, 12, 13, 17, 18, 19 → 15–19. RNF-14 (responsivo) y RNF-15/16 no tienen brechas halladas en la auditoría; **no se verificaron en ejecución**, conviene incluirlas en la matriz de la Tarea 19.
- **Supuestos que requieren confirmación antes de ejecutar:** (1) cuentas ciudadanas en tabla separada `life_accounts`; (2) TTL de 30 min y un solo uso para el código de vinculación; (3) vigencia de 30 días para el plan post-alta; (4) Reverb como servidor WebSocket; (5) la forma de `ambulatory_prescriptions.content` (se lee en la Tarea 7, Paso 3 antes de codificar).
- **Riesgos:** Tarea 16 (migración de datos cifrados), Tarea 15 (nueva pieza de infraestructura), Tarea 18 (dependencia externa).
