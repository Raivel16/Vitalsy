# Suite E2E de Vitalsy Clinical — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una suite Playwright local, con entorno Docker propio, que prueba por pantalla cada función de Vitalsy Clinical con pacientes independientes y datos variados, y reporta los fallos de forma accionable.

**Architecture:** Un proyecto Compose `vitalsy-e2e` (puertos propios, BD propia, `APP_ENV=e2e`) que se reinicia en cada corrida. Las pruebas preparan escenarios por API con sesiones por rol (fábricas en `e2e/support/`) y verifican por pantalla. Las reglas temporales usan un reloj E2E del backend controlado solo por Artisan dentro del contenedor. Dos fases: `parallel` (M1–M4, acceso, permisos, piso lleno, día completo) y `serial` (reloj, M5 camas, M6 personal).

**Tech Stack:** Playwright (`@playwright/test`), `@faker-js/faker` (locale `es`), TypeScript, Laravel 12/PHP 8.2 (PHPUnit), Docker Compose v2.24+ (usa `!override`/`!reset`).

**Spec:** `docs/superpowers/specs/2026-10-23-suite-e2e-clinical-design.md` (leer junto con `docs/operacion/guia-de-pruebas-clinical.md`, que contiene los textos esperados de la interfaz).

## Global Constraints

- Rama `feature/RNF-18-suite-e2e-clinical` desde `dev`. Commits `tipo(alcance): RNF-18 descripción` (o el RF de la prueba), imperativo, minúsculas, sin punto final, terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Requisito previo: el arreglo de `pcntl` en `backend/api/Dockerfile:18` (lo aplicó el usuario en local). Va por su propia rama `bugfix/RNF-01-reverb-pcntl`; sin él, `reverb` no arranca en el stack E2E.
- TDD en backend (PHPUnit) y en el generador de datos; `./vendor/bin/pint --test` y `npm run lint` en verde antes de cada commit.
- Nada del mecanismo E2E puede tener efecto fuera de `APP_ENV=e2e` **y** `E2E_CLOCK_ENABLED=true`. Ninguna ruta HTTP nueva.
- `migrate:fresh` solo se ejecuta con `-p vitalsy-e2e` y tras comprobar que `php artisan env` dentro del contenedor responde `e2e`.
- Las pruebas siguen a la documentación (guía → `docs/architecture/modulo-N-*.md` → `requerimientos.md`). Defectos conocidos se etiquetan `@hallazgo-HP-xx` (HP-01…HP-12 de la guía, sección 9).
- Nombre de cada prueba: `RF-XX · <Módulo> · <comportamiento>`; si existe paso en la guía, añadir `[E2-07]` al final.
- Sin `waitForTimeout`/sleeps fijos: solo auto-wait, `expect.poll` o `expect(...).toPass()`.
- Puertos E2E: Nginx `18080` (único publicado). `baseURL` = `http://localhost:18080`.
- Zona horaria del servidor UTC (HP-03): toda hora esperada se calcula en UTC; `page.clock` se fija con la misma instantánea que el reloj del backend.
- Workers en `parallel`: 4 por defecto (`E2E_WORKERS` lo cambia, máximo 8). `serial`: 1.

## Review Focus

1. **Sesión compartida invalidada:** una prueba que cierra sesión con la sesión cacheada de un rol rompería las demás pruebas de ese rol → toda prueba que hace logout o cambia contraseña usa `freshLogin()` (Task 6) y hay una prueba que lo verifica.
2. **DNI duplicado entre pruebas paralelas:** dos pruebas que generan el mismo DNI chocan → el generador deriva el DNI de la semilla de la prueba más un contador y `data.test.ts` comprueba la unicidad sobre 2 000 pacientes de semillas distintas.
3. **El reloj E2E queda adelantado tras un fallo:** las pruebas siguientes heredarían una hora falsa → el fixture `clock` resetea en `afterEach` incluso si la prueba falla, y `globalSetup` resetea al inicio (Task 5 y Task 6).
4. **Reporte sin semilla:** un fallo sin la semilla no se puede repetir → el reporter CSV y el adjunto `datos.json` incluyen semilla y título; prueba en Task 7.
5. **Correr la suite contra el stack de desarrollo por error:** `globalSetup` aborta si `baseURL` no es el puerto 18080 o si el contenedor no responde `e2e` (Task 5).

---

### Task 1: Límite de login configurable (backend)

**Files:**
- Modify: `backend/api/config/vitalsy.php` (nueva clave `auth.login_throttle_per_minute` = `(int) env('VITALSY_LOGIN_THROTTLE_PER_MINUTE', 10)`)
- Modify: `backend/api/app/Providers/AppServiceProvider.php` (`boot()`: `RateLimiter::for('login', …)` con `Limit::perMinute(config('vitalsy.auth.login_throttle_per_minute'))->by($request->ip())`)
- Modify: `backend/api/routes/api.php:43` (`throttle:10,1` → `throttle:login`; las rutas de Life no cambian)
- Test: `backend/api/tests/Feature/LoginThrottleConfigTest.php`

**Interfaces:**
- Produces: variable de entorno `VITALSY_LOGIN_THROTTLE_PER_MINUTE` (Task 4 la fija en 1000).

- [ ] **Step 1: Write the failing tests**
  - `test_login_is_limited_to_ten_attempts_per_minute_by_default`: 10 POST `/api/v1/auth/login` con credenciales erróneas → 422; el 11.º → 429.
  - `test_login_limit_follows_configuration`: `config(['vitalsy.auth.login_throttle_per_minute' => 50])`; 11 intentos → ninguno 429.
- [ ] **Step 2:** `php artisan test --filter=LoginThrottleConfigTest` → FAIL en el segundo caso (el límite está fijo).
- [ ] **Step 3:** Implementar los tres cambios de **Files**.
- [ ] **Step 4:** `php artisan test --filter="LoginThrottleConfigTest|AuthApiTest"` → PASS; `./vendor/bin/pint --test` → PASS.
- [ ] **Step 5: Commit** `feat(auth): RNF-18 hace configurable el limite de intentos de login`

### Task 2: Reloj E2E (backend)

**Files:**
- Create: `backend/api/app/Support/E2EClock.php`
- Create: `backend/api/app/Providers/E2EClockServiceProvider.php`
- Create: `backend/api/app/Console/Commands/E2EClockCommand.php`
- Modify: `backend/api/bootstrap/providers.php` (añadir el proveedor)
- Modify: `backend/api/config/vitalsy.php` (clave `e2e` => `clock_enabled` = `(bool) env('E2E_CLOCK_ENABLED', false)`, `clock_file` = `env('E2E_CLOCK_FILE', '/tmp/vitalsy-e2e-clock.json')`)
- Test: `backend/api/tests/Feature/E2EClockTest.php`

**Interfaces:**
- Produces:
  - `E2EClock::isActive(Application $app): bool`: `environment('e2e') && config('vitalsy.e2e.clock_enabled') === true`.
  - `E2EClock::offsetSeconds(): int` (0 si el archivo no existe o no se puede leer), `E2EClock::setOffsetSeconds(int $s): void`, `E2EClock::reset(): void` (borra el archivo).
  - Proveedor: en `register()` no hace nada si `! isActive`; si está activo, en `boot()` registra el comando y, si el desplazamiento ≠ 0, aplica `Carbon::setTestNow(Carbon::now()->addSeconds($offset))` (y lo mismo con `CarbonImmutable`).
  - Comando `e2e:clock {action : advance|set|reset|show} {--minutes=0} {--at= : ISO-8601 UTC}`. Imprime exactamente `Reloj E2E: <ISO-8601 UTC del now() desplazado>` (Task 6 lo parsea). `set --at` guarda `at - tiempo real` como desplazamiento.
  - El archivo vive en `/tmp` del contenedor y **no** en `storage/`, que el bind mount comparte con el stack de desarrollo.

- [ ] **Step 1: Write the failing tests** (cada prueba restaura `Carbon::setTestNow(null)`, el entorno y borra el archivo en `tearDown`)
  - `test_clock_inactive_in_testing_environment`: `E2EClock::isActive($this->app)` es `false` y `Artisan::all()` no contiene `e2e:clock`.
  - `test_clock_inactive_in_e2e_without_flag`: `$this->app['env'] = 'e2e'`, flag `false`; arrancar el proveedor a mano → sin comando y `now()` sin desplazar con un archivo de +600 s.
  - `test_clock_inactive_in_production_even_with_flag_and_file`: env `production`, flag `true`, archivo +600 s → `now()` sin desplazar (tolerancia 5 s).
  - `test_clock_shifts_now_in_e2e_with_flag`: env `e2e`, flag `true`, `setOffsetSeconds(600)`, arrancar el proveedor → `now()` ≈ real + 600 s (±5 s).
  - `test_command_advance_set_reset`: en e2e activo, `e2e:clock advance --minutes=6` → desplazamiento 360 y la salida empieza por `Reloj E2E: `; `reset` → el archivo no existe.
- [ ] **Step 2:** `php artisan test --filter=E2EClockTest` → FAIL (clases inexistentes).
- [ ] **Step 3:** Implementar según **Interfaces**.
- [ ] **Step 4:** `php artisan test` (suite completa, para confirmar que nada más cambia) y `pint --test` → PASS.
- [ ] **Step 5: Commit** `feat(e2e): RNF-18 agrega reloj de pruebas solo para el entorno e2e`

### Task 3: `E2ESeeder` con catálogo ampliado

**Files:**
- Create: `backend/api/database/seeders/E2ESeeder.php`
- Test: `backend/api/tests/Feature/E2ESeederTest.php`

**Interfaces:**
- Produces: `php artisan migrate:fresh --seeder=E2ESeeder --force`. Llama primero a `DatabaseSeeder` (cuentas de los 15 roles, catálogo base, ingresos demo, `DemoPeopleSeeder`) y luego crea los pabellones E2E:

| Código | Nombre | Especialidad | Camas (sala-lecho · política · estado) |
|---|---|---|---|
| `MED-E2E-1`, `MED-E2E-2`, `MED-E2E-3` | Medicina E2E 1/2/3 | `medicina_interna` | 14 por pabellón: 4 `mixed`, 3 `male`, 3 `female`, 2 `mixed` con aislamiento, todas `available`; además 1 `mixed` `blocked` y 1 `mixed` `cleaning` |
| `CIR-E2E-1`, `CIR-E2E-2` | Cirugía E2E 1/2 | `cirugia` | igual |

  Salas numeradas `5NN`/`6NN` para no chocar con 101–202.
- Lanza `RuntimeException('E2ESeeder solo se ejecuta con APP_ENV=e2e.')` en cualquier otro entorno.

- [ ] **Step 1: Write the failing tests**: `test_refuses_outside_e2e` (entorno `testing` → excepción con ese mensaje); `test_seeds_extended_catalog_in_e2e` (env `e2e`, `DEMO_PASSWORD` definido → 7 pabellones, 76 camas = 6 base + 70, 15 usuarios `{rol}@vitalsy.local`, y 10 camas de aislamiento `available`).
- [ ] **Step 2:** `php artisan test --filter=E2ESeederTest` → FAIL.
- [ ] **Step 3:** Implementar con `updateOrCreate`, siguiendo el estilo de `CatalogSeeder`.
- [ ] **Step 4:** Tests y pint → PASS.
- [ ] **Step 5: Commit** `test(e2e): RNF-18 agrega seeder con catalogo ampliado de camas`

### Task 4: Stack Docker `vitalsy-e2e`

**Files:**
- Create: `docker-compose.e2e.yml`
- Create: `.env.e2e.example` (raíz; `.env.e2e` ya lo ignora `.gitignore` con `.env.*`)

**Interfaces:**
- Produces: `docker compose -p vitalsy-e2e -f docker-compose.yml -f docker-compose.e2e.yml --env-file .env.e2e …`
- Contenido del override:
  - `nginx.ports: !override ["18080:80"]`; `backend.ports: !reset []`; `postgres.ports: !reset []`.
  - `backend.environment` y `reverb.environment`: `APP_ENV: e2e`, `E2E_CLOCK_ENABLED: "true"`, `VITALSY_LOGIN_THROTTLE_PER_MINUTE: "1000"`, `APP_URL: http://localhost:18080`; `SANCTUM_STATEFUL_DOMAINS` = el valor base más `localhost:18080,127.0.0.1:18080`.
  - `frontend.environment.VITE_HMR_CLIENT_PORT: "18080"`.
  - El volumen `postgres_data` queda aislado por el nombre del proyecto (`vitalsy-e2e_postgres_data`).
- `.env.e2e.example`: `APP_KEY=` (con la instrucción de generarla), `POSTGRES_PASSWORD`/`DB_PASSWORD` iguales, `DEMO_PASSWORD=Demo-E2E-2026`, `POSTGRES_DB`/`DB_NAME=vitalsy_e2e`, y las claves Reverb de la plantilla.

- [ ] **Step 1:** Copiar `.env.e2e.example` a `.env.e2e` con una `APP_KEY` generada y levantar con `up -d --build`.
- [ ] **Step 2: Verify:** `curl -s http://localhost:18080/api/health` → `{"status":"ok","db":"ok"}`; `docker compose -p vitalsy-e2e … exec backend php artisan env` → `The application environment is [e2e]`; `… exec backend php artisan e2e:clock show` imprime `Reloj E2E: …`; `docker compose ps` del stack de desarrollo no cambia (8080 sigue siendo el de desarrollo).
- [ ] **Step 3: Commit** `chore(e2e): RNF-18 agrega stack docker aislado para pruebas e2e`

### Task 5: Infraestructura Playwright (dependencias, config, entorno)

**Files:**
- Modify: `frontend/web/package.json` (devDeps `@playwright/test`, `@faker-js/faker`; scripts abajo)
- Modify: `frontend/web/playwright.config.ts`
- Modify: `frontend/web/tsconfig.node.json` (`include` añade `playwright.config.ts`, `e2e/**/*.ts`)
- Modify: `frontend/web/eslint.config.js` (para `e2e/**`: desactivar `react-hooks/rules-of-hooks`, porque los fixtures de Playwright llaman a `use`)
- Modify: `frontend/web/vitest.config.ts` (excluir solo `e2e/**/*.spec.ts`, para que corran los `e2e/**/*.test.ts` unitarios)
- Modify: `frontend/web/.gitignore` (`e2e-results/`, `e2e/.auth/`)
- Create: `frontend/web/e2e/support/env.ts`, `frontend/web/e2e/global-setup.ts`
- Move: `frontend/web/e2e/critical-paths.spec.ts` → `frontend/web/e2e/acceso/humo.spec.ts` (sin cambiar sus pruebas)

**Interfaces:**
- Produces (`env.ts`):
  - `E2E_PROJECT = "vitalsy-e2e"`, `E2E_BASE_URL = "http://localhost:18080"`.
  - `compose(args: string[]): string`: `execFileSync('docker', ['compose','-p',E2E_PROJECT,'-f',<repo>/docker-compose.yml,'-f',<repo>/docker-compose.e2e.yml,'--env-file',<repo>/.env.e2e, ...args])`, con el proyecto fijo en el código.
  - `artisan(...args: string[]): string` = `compose(['exec','-T','backend','php','artisan',...args])`.
  - `ensureStack(): Promise<void>` (`up -d` si no está arriba; espera hasta 5 min a `/api/health` = ok).
  - `resetData(): void` (aborta si `artisan('env')` no contiene `[e2e]`; luego `migrate:fresh --seeder=E2ESeeder --force` y `e2e:clock reset`).
- `global-setup.ts`: aborta si `baseURL` ≠ `E2E_BASE_URL`; `ensureStack()`, `resetData()`; imprime `Semilla E2E: <n>` (Task 6) y genera las sesiones por rol (Task 6).
- `playwright.config.ts`: `testDir: './e2e'`, `outputDir: 'e2e-results/artifacts'`, `globalSetup`, `use: { baseURL: E2E_BASE_URL, trace:'retain-on-failure', screenshot:'only-on-failure', video:'retain-on-failure', locale:'es-PE', timezoneId:'UTC' }`, `reporter: [['list'], ['html',{outputFolder:'e2e-results/html',open:'never'}], ['./e2e/support/findings-reporter.ts']]`. Proyectos:
  - `parallel`: Chromium, `testIgnore: ['**/serial/**']`, `fullyParallel: true`.
  - `serial`: Chromium, `testMatch: '**/serial/**/*.spec.ts'`, `dependencies: ['parallel']`.
  - `firefox` y `webkit`: el mismo `testIgnore` que `parallel`.
- Scripts:
  - `e2e`: `playwright test --project=parallel --workers=${E2E_WORKERS:-4} && playwright test --project=serial --workers=1 --no-deps`. Usar `cross-env-shell` o un pequeño `e2e/run.mjs` que lance ambas fases y pase los argumentos a las dos.
  - `e2e:ui`: `playwright test --ui`.
  - `e2e:report`: `playwright show-report e2e-results/html`.
  - `e2e:down`: `docker compose -p vitalsy-e2e … down -v`.
  - `e2e:browsers`: `--project=firefox --project=webkit`.

- [ ] **Step 1:** `npm i -D @playwright/test @faker-js/faker` y `npx playwright install chromium firefox webkit`.
- [ ] **Step 2:** Implementar los archivos de **Files**.
- [ ] **Step 3: Verify:** `npm run e2e -- acceso/humo` → las 3 pruebas de humo PASS contra 18080; ejecutar con `BASE_URL=http://localhost:8080` → aborta con un mensaje que nombra el puerto esperado; `npm run lint` y `npm run build` → PASS.
- [ ] **Step 4: Commit** `chore(e2e): RNF-18 configura playwright con entorno aislado y dos fases`

### Task 6: Datos variados, sesiones por rol y fixtures

**Files:**
- Create: `frontend/web/e2e/support/data.ts`, `frontend/web/e2e/support/data.test.ts` (Vitest)
- Create: `frontend/web/e2e/support/api.ts`, `frontend/web/e2e/support/sessions.ts`
- Create: `frontend/web/e2e/support/fixtures.ts`
- Create: `frontend/web/e2e/acceso/sesiones.spec.ts`

**Interfaces:**
- `data.ts`:
  - `runSeed(): number`: `E2E_SEED` si está definida; si no, una semilla aleatoria generada **una vez en global-setup** y pasada por la variable de entorno a los workers.
  - `testSeed(runSeed: number, titlePath: string[]): number` (hash FNV-1a estable).
  - `class DataGen { constructor(seed: number); patient(o?: Partial<Patient>): Patient; vitals(p: VitalsProfile): Vitals; orderNumber(): string; phone(): string; pick<T>(xs: T[]): T }`.
  - `Patient = { fullName, givenNames, surnames, dni /*8 dígitos*/, birthDate /*YYYY-MM-DD, 18–95 años*/, sex: 'male'|'female', payer: 'SIS'|'EsSalud'|'Privado', plan, coverage: 'aprobada'|'pendiente'|'rechazada', origin, reason, allergies: string[], homeMeds: {name, dose, frequency, route}[], relative: {name, phone} }`. Catálogos de diagnósticos, alergias (incluida `Penicilina`), medicamentos (incluida `Amoxicilina`) y servicios de origen de la guía §5.
  - `VitalsProfile = 'normal'|'news2_bajo'|'news2_medio'|'news2_alto'`; `Vitals = { respiratoryRate, spo2, spo2Scale: 1|2, supplementalO2: boolean, systolic, diastolic, pulse, temperature, consciousness: 'A'|'C'|'V'|'P'|'U' }`.
  - `news2(v: Vitals): number`: puntuación de referencia del apéndice A de la guía.
- `api.ts`: `class ApiSession { static login(email: string, password: string): Promise<ApiSession>; static fromStorage(file: string): Promise<ApiSession>; get<T>(path: string): Promise<T>; post<T>(path: string, body?: unknown): Promise<T>; put<T>; delete<T>; raw(method, path, body?): Promise<APIResponse> }`. Usa `request.newContext` con `Accept: application/json`, `Origin`/`Referer` = baseURL; antes del login hace `GET /sanctum/csrf-cookie`; envía `X-XSRF-TOKEN` (cookie `XSRF-TOKEN` decodificada y leída en cada petición). Las rutas son relativas a `/api/v1`. Si la respuesta no es 2xx, lanza un error con método, ruta, estado y `message`.
- `sessions.ts`: `createRoleSessions(): Promise<void>` guarda `e2e/.auth/<rol>.json` para los 15 roles de `ROLES` (importado de `src/app/roles.ts`); `rolePassword()` lee `DEMO_PASSWORD` de `.env.e2e`.
- `fixtures.ts`, que exporta `test` y `expect`:
  - `data: DataGen` sembrado con `testSeed`; al terminar adjunta `datos.json` (semilla, título y entidades creadas, registradas con `data.track(label, value)`).
  - `api(role: Role): Promise<ApiSession>` (sesión cacheada).
  - `asRole(role: Role): Promise<Page>`: nuevo `BrowserContext` con el `storageState` del rol.
  - `freshLogin(role: Role): Promise<Page>`: login real por la UI, sin sesión cacheada.
  - `clock: { advance(minutes: number): Promise<Date>; set(at: Date): Promise<Date>; reset(): Promise<void> }`: llama a `artisan('e2e:clock', …)`, parsea `Reloj E2E: <ISO>` y aplica `page.clock.setSystemTime` a todas las páginas abiertas del test. El reset ocurre en el teardown del fixture, también si la prueba falla.
  - Fixture automático `noServerErrors`: la prueba falla si alguna respuesta `/api/` devuelve 5xx o si la consola emite un `error` no esperado (lista blanca opcional por prueba).

- [ ] **Step 1: Write the failing unit tests** (`data.test.ts`):
  - `news2 del ejemplo E3-01 vale 19` (FR 28, SpO2 89, escala 1, O2 sí, PAS 85, pulso 135, conciencia V, temp 39.5 → 19).
  - `news2 de constantes normales E1-27 vale 0`.
  - `perfil normal siempre da 0, bajo 1–4 sin parámetro en 3, medio 5–6, alto ≥ 7` (50 semillas por perfil).
  - `la misma semilla produce el mismo paciente`, y `semillas distintas producen pacientes distintos`.
  - `dni de 8 dígitos y único en 2 000 pacientes de semillas distintas`.
  - `testSeed es estable para el mismo título`.
- [ ] **Step 2:** `npx vitest run e2e/support/data.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `data.ts`.
- [ ] **Step 4:** Vitest → PASS.
- [ ] **Step 5:** Implementar `api.ts`, `sessions.ts` y `fixtures.ts`; conectar `createRoleSessions` en `global-setup.ts`.
- [ ] **Step 6: Write `acceso/sesiones.spec.ts`**:
  - `RNF-08 · Acceso · la sesión cacheada de cada rol abre Inicio`: para los 15 roles, `asRole` → encabezado con la etiqueta de `ROLE_LABEL`.
  - `RF-100 · Acceso · cerrar sesión con freshLogin no invalida la sesión cacheada del rol`: logout con `freshLogin('admision')` y después `api('admision').get('/auth/me')` → 200.
  - `RNF-18 · Reloj · avanzar 10 min desplaza servidor y navegador`: `clock.advance(10)`; `GET /auth/me` sin error y `page.evaluate(() => Date.now())` dentro de ±5 s del ISO devuelto. Va en `e2e/serial/reloj.spec.ts`.
- [ ] **Step 7:** `npm run e2e -- acceso` → PASS.
- [ ] **Step 8: Commit** `test(e2e): RNF-18 agrega generador de datos, sesiones por rol y fixtures`

### Task 7: Reporter de hallazgos CSV

**Files:**
- Create: `frontend/web/e2e/support/findings-reporter.ts`, `frontend/web/e2e/support/findings-reporter.test.ts` (Vitest)

**Interfaces:**
- Produces: `e2e-results/hallazgos.csv` (UTF-8 con BOM, como `docs/operacion/registro-de-hallazgos.csv`) con las columnas de ese archivo: `ID,Fecha,Módulo,Rol / cuenta,Paso de la guía,Pasos para reproducir,Resultado esperado,Resultado obtenido,Severidad (Bloqueante/Mayor/Menor/Mejora),Categoría,Evidencia,Estado,Responsable / observaciones`.
- Una fila por prueba `failed`/`timedOut`:
  - `ID` = `E2E-<n>`, o `HP-xx` si la prueba tiene la etiqueta `@hallazgo-HP-xx`.
  - `Módulo` y `RF` salen del título (`RF-XX · Módulo · …`); `Paso de la guía` sale de `[Ex-yy]`.
  - `Pasos para reproducir` = `E2E_SEED=<semilla> npm run e2e -- -g "<título>"`.
  - `Resultado esperado`/`Resultado obtenido` salen del mensaje del error (`Expected:`/`Received:`), o el mensaje completo si no tiene ese formato.
  - `Evidencia` = ruta relativa del `trace.zip`; `Estado` = `Abierto`; `Severidad` vacía.
- Al terminar imprime `Hallazgos: e2e-results/hallazgos.csv (<n> filas)`.
- La lógica de filas es una función pura `toFindingRow(test: TestCase, result: TestResult, seed: number): string[]`, para poder probarla.

- [ ] **Step 1: Write the failing tests**: `toFindingRow` de un error `toHaveText` produce esperado y obtenido separados; título con `[E2-07]` → `Paso de la guía` = `E2-07`; etiqueta `@hallazgo-HP-02` → `ID` = `HP-02`; campos con comas, comillas o saltos de línea se escapan como CSV; la reproducción incluye la semilla.
- [ ] **Step 2:** Vitest → FAIL. **Step 3:** Implementar. **Step 4:** Vitest → PASS. Verificar a mano con una prueba que falle a propósito y no se commitea.
- [ ] **Step 5: Commit** `test(e2e): RNF-18 agrega reporter de hallazgos en csv`

### Task 8: Fábricas de escenarios

**Files:**
- Create: `frontend/web/e2e/support/scenarios/admission.ts`, `care.ts`, `alerts.ts`, `discharge.ts`, `beds.ts`, `staff.ts`, `index.ts`
- Create: `frontend/web/e2e/support/scenarios.spec.ts`

**Interfaces:**
- Las cargas útiles (payloads) **se copian de las llamadas que hace el propio frontend** en `src/modules/<dominio>/domain/*.ts` y en sus páginas (por ejemplo, cada paso de admisión llama a su endpoint y después a `advanceEncounter(id, step)` de `admission-census/domain/advance.ts`). El orden de pasos y los roles salen de `ROLE_STEPS` en `admission-census/domain/steps.ts`. No se inventan campos.
- `Ctx = { api: (r: Role) => Promise<ApiSession>; data: DataGen }`.
- `admission.ts`:
  - `registerEncounter(ctx, p?: Patient): Promise<Enc>`, con `Enc = { encounterId, orderNumber, patient }`.
  - `advanceAdmission(ctx, enc, until: AdmissionStep): Promise<Enc & { wristband?: string; room?: string; bed?: string }>`, con `AdmissionStep` = los pasos de `ROLE_STEPS` en orden. La prueba deja el ingreso **en** ese paso, todavía sin completarlo.
  - `hospitalize(ctx, opts?: { patient?: Patient; withBed?: boolean; lifeCode?: string }): Promise<Hosp>`. `withBed` hace la solicitud y la asignación M5 antes del consentimiento (E1b); por defecto es `false`.
- `care.ts`:
  - `prescribe(ctx, enc, items: {drug, dose, route, frequency}[]): Promise<{ codes: string[] }>`.
  - `recordVitals(ctx, enc, v: Vitals, role?: 'enfermera_piso'|'auxiliar_enfermeria'): Promise<{ news2: number; alertId?: string }>`.
- `alerts.ts`:
  - `raiseAlert(ctx, enc, profile: 'news2_medio'|'news2_alto'): Promise<{ alertId: string }>`.
  - `driveAlert(ctx, alertId, until: 'confirmada'|'medico'|'err'|'orden_uci'|'uci_autorizada'|'en_uci'): Promise<void>`.
- `discharge.ts`: `advanceDischarge(ctx, enc, until: DischargeStep): Promise<{ inviteCode?: string; activationCode?: string }>`, con `DischargeStep = 'orden'|'epicrisis'|'recetas'|'social'|'conciliacion'|'informe'|'recepcion'|'cuenta'|'pase'|'salida'` (cada valor deja hecho ese paso y todos los anteriores).
- `beds.ts`:
  - `requestBed(ctx, o: { encounterId?, patientName?, specialty, gender, isolationType, priority, source }): Promise<{ requestId: string }>`.
  - `assignBed(ctx, requestId, bedId?): Promise<{ assignmentId, bedId, room, bedCode }>`.
  - `bedsOf(ctx, wardCode): Promise<Bed[]>`.
- `staff.ts`:
  - `publishPlan(ctx, yearMonth, rows: {userEmail, service, days: Record<string,'D'|'N'|'L'|'R'>}[]): Promise<void>`.
  - `assignDaily(ctx, date, nurseEmails[], overrides?)`.
  - `registerAbsence(ctx, email, date, reason): Promise<{ coverageRequestId?: string; uncovered: string[] }>`.
  - `driveCoverage(ctx, id, until: 'aprobada_jefatura'|'autorizada'|'confirmada')`.
- `life` (en `admission.ts`): `lifeLinkCode(ctx): Promise<string>` registra una cuenta Life nueva con un correo único derivado de la semilla, da el consentimiento, sincroniza 10 días de `heart_rate` y genera el `VL-…` (como en §1.9 de la guía).

- [ ] **Step 1: Write the failing smoke specs** (`scenarios.spec.ts`):
  - `hospitalize deja el ingreso cerrado y visible con «Atención»`: `GET hospital-admission/encounters/{id}` con el estado de hospitalizado que usa el censo.
  - `hospitalize con withBed ocupa un lecho E2E`.
  - `advanceAdmission hasta 'identidad' deja el ingreso en ese paso`.
  - `advanceDischarge hasta 'pase' aparece en authorized-exits del camillero`.
  - `raiseAlert news2_alto aparece en el inbox de enfermera_piso`.
  - `registerAbsence de una enfermera con pacientes devuelve reasignaciones`. Va en `e2e/serial/escenarios-staff.spec.ts`.
- [ ] **Step 2:** `npm run e2e -- scenarios` → FAIL. **Step 3:** Implementar las fábricas. **Step 4:** → PASS.
- [ ] **Step 5: Commit** `test(e2e): RNF-18 agrega fabricas de escenarios por api`

---

**Regla común para las Tasks 9–15:** cada prueba prepara lo que necesita con las fábricas de la Task 8, abre la pantalla con `asRole` y afirma los textos exactos de la columna «Resultado esperado» del paso de la guía que se indica entre corchetes. Esos textos son las aserciones. Cuando un caso usa datos variados, se itera sobre `for (const perfil of [...])` dentro de un `test.describe` con un `test` por perfil, para que cada uno tenga su propio nombre y su propia semilla. Cada Task termina con `npm run e2e -- <carpeta>` en verde, salvo las etiquetadas `@hallazgo-HP-xx`, que pueden fallar mientras el defecto siga abierto, y con su commit `test(e2e): RF-XX …`.

### Task 9: Acceso y permisos

**Files:** `e2e/acceso/login.spec.ts`, `e2e/permisos/rutas-web.spec.ts`, `e2e/permisos/api-403.spec.ts`, `e2e/permisos/matriz.ts`

- `login.spec.ts`: E0-01…E0-06 (`[E0-0x]`), N-18 (cuenta desactivada creada por `administrador_accesos` por API) y N-19 (cuenta con contraseña temporal creada por API → 403 «Debe cambiar la contraseña temporal para continuar.» y solo se muestra la pantalla de cambio). Todas usan `freshLogin` o una página sin sesión.
- `matriz.ts`: `forbiddenRoutes(role: Role): string[]` = las rutas de `NAV` (importado de `src/app/navigation.tsx`) que `navFor(role)` no incluye, más las pantallas de ingreso de §2.1 de la guía que no son de su rol.
- `rutas-web.spec.ts`: un `test` por rol: cada ruta prohibida muestra «Esta vista no está disponible para su perfil». Aserción adicional fija para N-01…N-17.
- `api-403.spec.ts`: N-11, N-12, N-14, N-15, N-16, N-17 y `GET /users` para los 14 roles no administradores → 403 «No tiene permiso para esta acción.»; sin sesión → 401 «Debe iniciar sesión para continuar.». Incluye: N-17, ninguna ruta PUT/PATCH/DELETE sobre alertas → 404/405.
- Commit: `test(e2e): RF-99 agrega pruebas de acceso y matriz de permisos`

### Task 10: M1 Admisión

**Files:** `e2e/m1-admision/registro.spec.ts`, `cobertura.spec.ts`, `brazalete-traslado.spec.ts`, `enfermeria.spec.ts`, `medico.spec.ts`, `life.spec.ts`

- `registro`: E1-01, E1-02, E1-03 con 4 perfiles de paciente (pagador × sexo × edad); E1-04/E1-05/E1-06; filiación E1-07/E1-08. HP-08: el texto engañoso de «Registrar ingreso» no aparece (`@hallazgo-HP-08`).
- `cobertura`: perfiles `aprobada` (E1-09), `pendiente` y `rechazada` (E1c-02/E1c-03 con teléfonos `91AB` y `123`, E1c-04); con cobertura pendiente o rechazada no se puede emitir brazalete.
- `brazalete-traslado`: E1-10 (formato `BRZ-<n>-<iniciales>` calculado a partir de los datos generados), E1-11, consentimiento E1-12…E1-15, traslado E1-16…E1-19, E1-21; HP-02 (brazalete de otro paciente rechazado, `@hallazgo-HP-02`) usando dos pacientes propios.
- `enfermeria`: E1-23, E1-24 (reubicación con su propio paciente), E1-25/E1-26, E1-27 con perfiles `normal` y `news2_medio` (este último muestra el aviso de alerta de E1d), E1-28 (límites), E1-29, conciliación con alergia cruzada Penicilina/Amoxicilina (E1d P3), E1-30 con dos combinaciones Morse/Braden cuyos puntajes se calculan en la prueba, E1-31.
- `medico`: E1-32, E1-33 → el ingreso queda hospitalizado y se crea el CPOE basal con el medicamento domiciliario generado.
- `life`: E1c-06…E1c-09 con `lifeLinkCode`; el código consumido devuelve `code_consumed`. Para el código vencido (`code_expired`) se usa `clock.advance(31)` y por eso esta prueba va en `e2e/serial/life-vencido.spec.ts`.
- Commit: `test(e2e): RF-01 agrega pruebas de admision por pantalla`

### Task 11: M2 Monitoreo y atención

**Files:** `e2e/m2-atencion/cpoe.spec.ts`, `constantes.spec.ts`, `emar.spec.ts`, `paraclinicos.spec.ts`, `notas-cuidados.spec.ts`, `expediente.spec.ts`, `controles.spec.ts`

- `cpoe`: E2-02, E2-03 con 3 medicamentos del catálogo; el código mostrado sigue el patrón `DRUG-<NOMBRE>-<DOSIS>` del ejemplo.
- `constantes`: E2-04, E2-05; los perfiles `normal`/`news2_bajo`/`news2_medio`/`news2_alto` muestran el NEWS2 de `news2(v)` y el color o banner que le corresponde; E2-15 con la auxiliar como autora.
- `emar`: E2-06, E2-07 (bloqueo), E2-08 (éxito e inmutabilidad: un segundo intento sobre la misma dosis es rechazado). HP-04 (no se muestran los códigos esperados, `@hallazgo-HP-04`).
- `paraclinicos`: E2-09, E2-10, E2-11.
- `notas-cuidados`: E2-12, E2-13, E2-14 (filtros «Hoy» y «7 días»).
- `expediente`: E2-01, E2-16 (pestañas y filtro de fechas).
- `controles`: E2-17.
- Commit: `test(e2e): RF-21 agrega pruebas de monitoreo y atencion`

### Task 12: M3 Alertas

**Files:** `e2e/m3-alertas/generacion.spec.ts`, `flujo-medico-err-uci.spec.ts`, `deterioro.spec.ts`, `historial.spec.ts`, `e2e/serial/sla.spec.ts`

- `generacion`: E3-01 con `news2_alto` (el NEWS2 del banner coincide con `news2(v)`), E3-02 (campana con conteo y aviso «Abrir el evento»; el audio se considera activo si `HTMLMediaElement.play` fue llamado, espiado con `page.addInitScript`), E3-03 (tras «Confirmar recepción» el audio se pausa), E3-04. Se usan dos páginas, enfermera y médico, y la llegada de la alerta se espera con `expect.poll` (≤ 20 s).
- `flujo-medico-err-uci`: E3-05…E3-11 en un único test con un paciente propio.
- `deterioro`: E3-13, E3-14, E3-15.
- `historial`: E3-12 sobre una alerta preparada con `driveAlert(…,'en_uci')` y retorno; el orden de los eventos es correcto y no hay botones de edición.
- `serial/sla.spec.ts`: E3-16 (`clock.advance(6)` + `artisan('alerts:process-slas')` → salida con `Escalamientos de enfermería: 1` y la alerta en el inbox de la supervisora; otros 6 min → la ve el residente), E3-17, E3-18 (control vencido, origen `control`), E3-19 (dosis vencida tras 31 min, origen `emar`). Usa los plazos de `config/vitalsy.php` (5/5/15/15/30).
- Commit: `test(e2e): RF-39 agrega pruebas de alertas y sla`

### Task 13: M4 Alta

**Files:** `e2e/m4-alta/gates.spec.ts`, `pasos.spec.ts`, `life.spec.ts`, `salida.spec.ts`

- `gates`: por cada paso de `DischargeStep`, un paciente preparado con `advanceDischarge` hasta el paso anterior al previo intenta ese paso por pantalla y recibe el mensaje de secuencia (E4-09 y E4-13 incluidos). HP-06 (orden de alta por API sobre un ingreso en paso «orden» → rechazo, `@hallazgo-HP-06`).
- `pasos`: E4-01…E4-08. E4-05 con `si` (validado) y `Sí` (HP-12, `@hallazgo-HP-12`: debería aceptarse). Las recetas usan medicamentos generados.
- `life`: tres variantes en E4-07: invitación (`VLI-…`, vigencia 30 días calculada desde la hora del servidor), ya es usuario (`VLA-…`, con `GET /life/discharge-plans/<código>` → 200 la primera vez y 409 `plan_claimed` con otra cuenta) y rechaza.
- `salida`: E4-10…E4-12; E4-11 (el camillero ve la salida autorizada); tras la salida el paciente desaparece de Pacientes.
- Commit: `test(e2e): RF-54 agrega pruebas de alta y egreso`

### Task 14: M6 Personal (serial, en profundidad)

**Files:** `e2e/serial/m6-personal/rol-mensual.spec.ts`, `distribucion.spec.ts`, `relevo.spec.ts`, `contingencias.spec.ts`

Cada prueba trabaja en un **mes propio y futuro** (`yearMonth` derivado del índice de la prueba, para que publicar no pise el de otra) o fija la fecha con `clock.set`. Una prueba por regla de `modulo-6-personal.md`:
- `rol-mensual` (RF-78): E6-05, E6-06, E6-07; publicar de nuevo reemplaza el mes (los turnos anteriores desaparecen); `GET shift-plans` lista los últimos 12 meses; los retenes solo los ven jefatura, supervisora y RR. HH. (por API con `enfermera_piso` no aparecen); el buscador encuentra por nombre y por correo; N-11 (RR. HH. no ve «Publicar rol mensual oficial»).
- `distribucion` (RF-79/80): con 3 enfermeras y 6 pacientes hospitalizados con perfiles NEWS2 distintos (alto, medio, bajo y normal), la sugerencia reparte la suma NEWS2 de modo que la diferencia entre la enfermera más cargada y la menos cargada no supera el mayor NEWS2 individual, y ninguna enfermera queda sin pacientes si hay ≥ 3. Más E6-08 (sin enfermeras → mensaje), E6-09 (cambiar una enfermera y aprobar), aprobar con una enfermera desconocida → rechazo, y la UI no afirma que se notificó (RF-80 parcial).
- `relevo` (RF-81–83): publicar un plan con dos turnos consecutivos del mismo servicio y `clock.set` a 30 min antes del cambio. E6-01…E6-03 (la consolidación incluye NEWS2, dosis pendientes y alertas de pacientes propios; tras firmar, los pacientes pasan a la entrante y el reporte no se puede modificar), E6-04, ventana fuera de rango (`clock.set` a 3 h después → «No hay un relevo disponible ahora») y servicios distintos → rechazo.
- `contingencias` (RF-84–88): E6-10 (validaciones vacías y registro), inasistencia duplicada → rechazo, rebalanceo ponderado (los pacientes de la ausente pasan a las demás según NEWS2) y sin receptoras → pacientes sin cubrir más solicitud de retén. E6-11, E6-12, E6-13, y cada transición fuera de orden o repetida → 422 por API.
- Commit: `test(e2e): RF-78 agrega pruebas en profundidad de personal`

### Task 15: M5 Camas (serial, en profundidad)

**Files:** `e2e/serial/m5-camas/solicitudes.spec.ts`, `compatibilidad.spec.ts`, `censo-proyecciones.spec.ts`, `limpieza.spec.ts`

Se usan solo los pabellones `*-E2E-*`, y las aserciones son sobre las camas y solicitudes propias de cada prueba. Una prueba por regla de `modulo-5-camas.md`:
- `solicitudes` (RF-68, RF-70, RF-73): E1b-01…E1b-03 (validaciones), solicitud con paciente seleccionado y con nombre libre. La lista de espera se ordena por prioridad `critica > alta > media > baja` (4 solicitudes sin lecho compatible creadas en orden inverso). Más E1b-04, E1b-05 (notificación y acuse; un segundo acuse → rechazo).
- `compatibilidad` (RF-72), una tabla de casos sobre un pabellón E2E:
  - femenina → nunca sugiere un lecho `male`;
  - masculino → nunca un lecho `female`;
  - `mixed` admite ambos sexos;
  - con aislamiento → solo lechos de aislamiento;
  - sin aislamiento → nunca un lecho de aislamiento;
  - especialidad `cirugia` → solo pabellones `cirugia`;
  - lechos `blocked` y `cleaning` nunca sugeridos;
  - E5-03, asignar a la fuerza un lecho incompatible por API → «El lecho no es compatible con el paciente: …»;
  - E5-02, sin lecho compatible → queda en espera.
- `censo-proyecciones` (RF-69, RF-71): los KPI y filtros por pabellón reflejan los cambios propios (asignar una cama de `MED-E2E-2` cambia sus contadores en ±1); E5-01; E5-04 (fecha pasada → mensaje; fecha futura → registrada y visible en «Proyección de altas»).
- `limpieza` (RF-74–77): un paciente `hospitalize({withBed:true})` pasa por `advanceDischarge(…,'salida')`, aparece la orden para su cama y la cama queda `cleaning`. Después E5-05 (checklist incompleto → rechazo; completo → completada), E5-06, E5-07 (cama `available` en `/camas`). E5-08 (por API: equipar sin desinfectar y habilitar sin equipar → 422). Quedan registrados quién y cuándo (`disinfected_by`, `equipped_by`, `enabled_by`) en la respuesta o la vista. E5-09 / HP-07: egreso sin cama M5 → debería avisar o generar la orden (`@hallazgo-HP-07`).
- Commit: `test(e2e): RF-68 agrega pruebas en profundidad de camas y limpieza`

### Task 16: Día completo y piso lleno

**Files:** `e2e/dia-completo/paciente-neumonia.spec.ts`, `paciente-alergico-critico.spec.ts`, `e2e/piso-lleno/piso-lleno.spec.ts`

- Día completo (todo por pantalla, sin fábricas salvo la sesión, `test.slow()`):
  1. Paciente SIS con cobertura aprobada recorre E1 (con E1b) → E2 (CPOE, constantes y una dosis) → E4 → E5 limpieza.
  2. Paciente alérgico con cobertura pendiente y derivación hace la admisión, constantes `news2_alto`, alerta hasta UCI y retorno, y alta con invitación Life.
- `piso-lleno`: en `beforeAll` crea 25 pacientes hospitalizados por API con perfiles variados (5 con alerta abierta, 4 en egreso en distintos pasos y 3 con cama M5). Comprueba:
  - Pacientes: búsqueda por nombre y DNI de 3 pacientes al azar; el conteo incluye ≥ 25.
  - Bandeja de alertas: las 5 aparecen ordenadas por severidad.
  - Tablero de egreso: los 4 en su columna o paso.
  - Inicio de `enfermera_piso`: las tarjetas «Alertas abiertas» y «Pacientes en turno» con valores ≥ los creados.
  - Ninguna pantalla tarda más de 5 s en mostrar la lista (`expect(...).toBeVisible({ timeout: 5000 })`).
- Commit: `test(e2e): RNF-18 agrega recorridos de dia completo y piso lleno`

### Task 17: Documentación y cierre

**Files:**
- Create: `docs/operacion/pruebas-e2e.md` (cómo preparar `.env.e2e`; comandos de la spec §6; cómo leer el reporte, la traza y `hallazgos.csv`; cómo repetir con la semilla; qué no se cubre)
- Modify: `docs/operacion/guia-de-pruebas-clinical.md` (una línea al inicio que remite a `pruebas-e2e.md` para la versión automática)
- Modify: `AGENTS.md` (nota final de la iteración; solo se agrega texto)

- [ ] **Step 1:** Escribir los documentos.
- [ ] **Step 2: Verify:** `npm run e2e:down` y después `npm run e2e` desde cero, con el entorno apagado: termina, imprime la semilla y la ruta de `hallazgos.csv`, y las únicas pruebas rojas tienen la etiqueta `@hallazgo-HP-xx`. Las nuevas se reportan al usuario con su fila del CSV, sin corregir la aplicación en esta rama. Además: `php artisan test`, `pint --test`, `npm test`, `npm run lint` y `npm run build` → PASS.
- [ ] **Step 3:** `graphify update .`
- [ ] **Step 4: Commit** `docs(e2e): RNF-18 documenta la suite e2e local`
