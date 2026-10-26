# Diseño: suite E2E automática de Vitalsy Clinical

**Fecha:** 2026-10-23 · **Estado:** borrador para aprobación · **Requisito base:** RNF-18 (pruebas de recorridos críticos) y `docs/operacion/guia-de-pruebas-clinical.md`.

## 1. Intención

Hoy cada cambio obliga a repetir a mano la guía de pruebas funcionales, que es una sola historia encadenada (E0 → E1 → … → E7) con datos fijos. Es agotador y por eso no se repite en cada cambio.

Se quiere una suite que, con un comando en la máquina local, compruebe que **la interfaz y el funcionamiento esperado** de Vitalsy Clinical siguen correctos, simulando el día a día real de un hospital con **datos variados**, y que diga con claridad qué falló para poder corregirlo.

## 2. Objetivos, no objetivos y anti-objetivos

**Objetivos**

- Cada prueba es **independiente**: crea sus propios pacientes y datos; ninguna depende de que otra haya corrido antes ni del orden.
- Datos **realistas y variados** en cada corrida (nombres, DNI, edad, sexo, pagador, diagnóstico, alergias, medicamentos, constantes normales y alteradas), reproducibles con una **semilla**.
- Verificar por **pantalla real** (Playwright, rol correcto) los textos, validaciones, mensajes de éxito/error y permisos que describen la guía y los docs de módulo.
- Prioridad: **core** (M1 admisión, M2 monitoreo/atención, M3 alertas, M4 alta), luego **M6 personal y M5 camas con mayor profundidad** (son los menos probados a mano; cada regla de `modulo-5-camas.md` / `modulo-6-personal.md` y sus RF debe tener al menos una prueba).
- Reporte de fallos accionable (sección 7).

**No objetivos**

- No corre en GitHub Actions ni bloquea PR/push (decisión del usuario: solo local).
- No reemplaza las pruebas unitarias existentes (Vitest, PHPUnit, Jest).
- No prueba la app móvil Vitalsy Life; su lado servidor solo se usa por API cuando un escenario Clinical lo necesita (código `VL-…`, plan `VLA-…`).
- No mide rendimiento/carga (RNF-04), latencia ≤ 2 s concluyente, TLS 1.3 real, disponibilidad ni DR.
- No verifica sonido audible de la sirena (solo que se activa el aviso/audio) ni la cámara real (se escribe el código).

**Anti-objetivos (sería un fracaso aunque "funcione")**

- Pruebas que codifican lo que hace hoy el código en lugar de lo que exige la documentación: si difieren, la prueba sigue a la documentación y el fallo se reporta como hallazgo.
- Pruebas frágiles o aleatoriamente rojas (flaky): un fallo debe significar un defecto real o reproducible con su semilla.
- Cualquier mecanismo de prueba accesible fuera del entorno E2E (ver 5.3).
- Ensuciar la base de datos de desarrollo diaria.

## 3. Decisiones tomadas por el usuario

1. **Herramienta:** Playwright (ya existe `frontend/web/playwright.config.ts` y `e2e/critical-paths.spec.ts`, aunque `@playwright/test` no está en `package.json`).
2. **Estrategia "atajo por API + verificación por pantalla":** cada prueba deja al paciente en el punto necesario llamando a la API y prueba por pantalla solo la función que le corresponde. Unas pocas pruebas de **día completo** recorren todo por pantalla.
3. **Solo local**, sin CI.
4. **Entorno propio y aislado**, con base de datos que se reinicia en cada corrida.
5. **Se autoriza** un mecanismo de "reloj de pruebas" en el backend, **solo para el entorno E2E y con cuidado**.

## 4. Restricciones conocidas (del código actual)

- Auth web: Sanctum en modo SPA con cookie de sesión (`statefulApi()`, `session()->regenerate()`); las llamadas por API desde Playwright necesitan `GET /sanctum/csrf-cookie`, cabecera `X-XSRF-TOKEN` y `Origin`/`Referer` del dominio stateful.
- `POST /api/v1/auth/login` tiene `throttle:10,1`: una suite con decenas de inicios de sesión lo supera.
- La sesión web caduca por inactividad a los 5 min (timer del frontend).
- Catálogo sembrado mínimo: 2 pabellones, 6 camas (una bloqueada, una en limpieza). Pruebas en paralelo de camas competirían por los mismos lechos.
- El tiempo del backend se obtiene con `now()`/Carbon en ~31 archivos de `app/`; solo 2 migraciones usan `CURRENT_TIMESTAMP` de la BD. El frontend usa `Date.now()`/`new Date()` en ~10 archivos.
- El escalamiento SLA, controles vencidos y dosis vencidas los ejecuta `php artisan alerts:process-slas`; ningún contenedor corre el planificador.
- Roles: 15, cuentas demo `{rol}@vitalsy.local` + `DEMO_PASSWORD`.

## 5. Diseño

### 5.1 Entorno E2E aislado

- Un proyecto de Compose separado (`docker compose -p vitalsy-e2e -f docker-compose.yml -f docker-compose.e2e.yml`) con **puertos distintos** a los de desarrollo (p. ej. Nginx 18080, Postgres 15432; sin 8443/8000 publicados) y **volumen de Postgres propio**.
- `APP_ENV=e2e` en backend y reverb. Variables propias en `.env.e2e` (no versionado; plantilla `.env.e2e.example`).
- Script único `npm run e2e` (en `frontend/web`) que: levanta el entorno si no está arriba, espera `/api/health` = ok, reinicia datos (`migrate:fresh --seed` **solo** dentro del proyecto `vitalsy-e2e`, con comprobación explícita del nombre de proyecto antes de ejecutar), corre Playwright y deja el entorno arriba para repetir. `npm run e2e:down` lo apaga y borra su volumen.
- Seeder específico `E2ESeeder` (solo se invoca en `APP_ENV=e2e`): cuentas demo de los 15 roles, personal con nombre, y **catálogo ampliado de pabellones/camas** (varios pabellones por especialidad, camas masculinas/femeninas/mixtas, de aislamiento, bloqueadas y en limpieza) para que las pruebas de camas tengan lechos sin competir.

### 5.2 Capa de preparación por API ("fábricas de escenarios")

En `frontend/web/e2e/support/`:

- `api.ts`: cliente por rol (csrf-cookie + login + XSRF) sobre `request` de Playwright, con sesiones cacheadas por rol (`storageState`) generadas en `globalSetup` para no repetir login.
- `data.ts`: generador de datos con `@faker-js/faker` (locale `es`) + reglas propias peruanas: DNI de 8 dígitos único, teléfono 9 dígitos, pagadores `SIS`/`EsSalud`/privado, diagnósticos, alergias y medicamentos de catálogos realistas, constantes por perfil (normal, NEWS2 bajo/medio/alto). **Semilla**: se toma de `E2E_SEED` o se genera; se imprime al inicio y se anexa a cada prueba en el reporte.
- `scenarios.ts`: funciones que llevan un paciente a un punto del flujo usando las rutas reales de `routes/api.php`: `admitted()`, `untilConsent()`, `hospitalized()` (admisión completa M1 → firma médica), `withCpoe()`, `withAlert(severidad)`, `inDischarge(hastaPaso)`, `withBedRequest()`, etc. Cada función devuelve los identificadores (`ENC-…`, brazalete, cama, alerta) y los datos generados.
- Ninguna prueba depende de IDs fijos (`ENC-0004`): usa los que devuelve su escenario.

### 5.3 Reloj de pruebas (backend, solo E2E)

Necesario para reglas temporales: SLA de alertas (5 min supervisora, luego médico), controles vencidos, dosis e-MAR con 30 min de gracia, ventana de relevo de turno.

- **Sin rutas HTTP.** El reloj se controla con comandos Artisan ejecutados desde Playwright vía `docker compose -p vitalsy-e2e exec backend php artisan e2e:clock …` (`advance --minutes=N`, `set`, `reset`).
- El desplazamiento se guarda en un archivo/cache local del contenedor; un proveedor (`E2EClockServiceProvider`) aplica `Carbon::setTestNow()` al iniciar cada petición y cada comando.
- **Triple candado:** el comando y el proveedor solo se registran si `app()->environment('e2e')` **y** `E2E_CLOCK_ENABLED=true`; en cualquier otro entorno no existen. Pruebas PHPUnit que demuestran que en `local`/`production`/`testing` el comando no está registrado y el proveedor no altera `now()`.
- En el navegador se usa `page.clock` de Playwright con la misma hora para que los contadores del frontend coincidan.
- Como el reloj es global, las pruebas que lo usan van en un proyecto Playwright `serial` con `workers: 1`, que corre después de las paralelas y resetea el reloj al terminar cada prueba.
- En ese mismo proyecto `serial` van **M5 camas y M6 personal**: comparten estado global (el censo de camas; «Publicar rol mensual» reemplaza el mes completo; la asignación diaria es por fecha). Sus pruebas no asumen un censo vacío: afirman sobre sus propias camas, solicitudes y turnos.
- Las pruebas paralelas de M1–M4 hospitalizan **sin** cama del censo (habitación provisional) salvo que necesiten el ciclo de limpieza, para no agotar lechos.

### 5.4 Ajustes de configuración para E2E

- Límite del login configurable por entorno (p. ej. `LOGIN_THROTTLE_PER_MINUTE`, por defecto 10 — sin cambio fuera de E2E) para que la suite no reciba 429. El caso "429 tras 10 intentos" se mantiene como prueba explícita con el valor por defecto en otro test o se documenta como no cubierto (ver 9).
- Timer de inactividad: no se cambia; las pruebas son cortas. La prueba de expiración usa `page.clock`.

### 5.5 Organización de la suite

`frontend/web/e2e/` con proyectos Playwright (Chromium por defecto; Firefox/WebKit opcionales con `npm run e2e:browsers`):

| Carpeta / archivo | Contenido | Prioridad |
|---|---|---|
| `acceso/` | Login, validaciones, logout, contraseña temporal, cuenta desactivada (E0, N-18, N-19) | 1 |
| `permisos/` | Matriz rol × ruta web (vista no disponible) y rol × API (403) para N-01…N-17, generada desde `roles.ts`/`navigation.tsx` | 1 |
| `m1-admision/` | Cada pantalla del stepper con varios perfiles de datos: cobertura aprobada/pendiente/rechazada y derivación, brazalete correcto/ajeno/inexistente (HP-02), alergia cruzada en conciliación, Morse/Braden, firma médica, vinculación Life válida/consumida/vencida | 1 |
| `m2-atencion/` | CPOE (alta, edición, baja), constantes y NEWS2 por perfil, e-MAR 5 correctos (bloqueo y éxito), LIS/PACS stub, visita, evoluciones, notas y cuidados, expediente por pestañas, controles | 1 |
| `m3-alertas/` | Generación por NEWS2, confirmación y fin de sirena, reevaluación, solicitud médica, ERR, UCI (doble autorización, traslado, retorno), timeline inmutable, deterioro, programación de control | 1 |
| `m4-alta/` | Gates de secuencia en cada paso, valoración social, conciliación, informe con variantes Life (invitación / ya usuario / rechaza), recepción inmutable, caja, pase, salida solo enfermera, salidas autorizadas | 1 |
| `m6-personal/` | Publicación de rol mensual, sugerencia/aprobación de asignaciones con balanceo NEWS2, inasistencia y flujo de cobertura (supervisora → jefatura → RR. HH.), relevo de turno y firma; una prueba por regla de `modulo-6-personal.md` | 2 (profunda) |
| `m5-camas/` | Solicitud y priorización, compatibilidad género/aislamiento/especialidad, lecho bloqueado/en limpieza no sugerido, notificación y acuse, proyecciones, liberación, egreso → orden de limpieza → limpieza completa → equipamiento → disponible; una prueba por regla de `modulo-5-camas.md` | 2 (profunda) |
| `temporal/` | SLA de alertas, control vencido, dosis vencida, ventana de relevo (usa reloj 5.3; serial) | 2 |
| `dia-completo/` | 2–3 pacientes con perfiles distintos recorriendo M1→M2→M3→M4→M5 **todo por pantalla** | 3 |
| `piso-lleno/` | Siembra 20–30 pacientes variados por API y verifica censo, bandeja de alertas, tablero de egreso y censo de camas con volumen (filtros, búsqueda, conteos, orden) | 3 |

Cada prueba se nombra `RF-XX · Módulo · comportamiento` y referencia el paso de la guía cuando exista (p. ej. `E2-07`).

### 5.6 Fuente de los resultados esperados

En este orden: textos reales de la interfaz citados en la guía → `docs/architecture/modulo-N-*.md` → `docs/requirements/requerimientos.md`. Si la guía marca un dato como "no verificado" o un hallazgo previo (sección 9 de la guía, HP-xx), la prueba afirma el comportamiento **correcto** según requisitos y se etiqueta `@hallazgo-HP-xx` para que su fallo esperado sea visible sin confundirse con regresiones nuevas.

## 6. Comandos

```
npm run e2e                     # todo (paralelas + temporales)
npm run e2e -- m5-camas         # un módulo
npm run e2e -- -g "RF-72"       # por RF
E2E_SEED=1234 npm run e2e -- -g "RF-72"   # repetir con los mismos datos
npm run e2e:ui                  # modo visual paso a paso
npm run e2e:report              # abrir el último reporte HTML
npm run e2e:down                # apagar y borrar el entorno E2E
```

## 7. Cómo se reportan los errores

1. **Terminal:** resumen pasadas/fallidas con nombre `RF-XX · …`, esperado vs. obtenido y la semilla.
2. **Reporte HTML de Playwright:** por cada fallo, captura, video, traza (clics, DOM, red con respuestas de la API, consola) y adjunto JSON con los datos generados.
3. **`e2e-results/hallazgos.csv`:** mismas columnas que `docs/operacion/registro-de-hallazgos.csv` (módulo, RF, prueba, esperado, obtenido, ruta de la traza, semilla), generado por un reporter propio, para usar como lista de correcciones.

Artefactos en `frontend/web/e2e-results/` (ignorado por git).

## 8. Pruebas de la propia infraestructura (TDD)

- Backend (PHPUnit): reloj E2E ausente fuera de `e2e`; presente y desplazando `now()` en `e2e`; límite de login por defecto intacto; `E2ESeeder` crea el catálogo ampliado.
- Frontend: pruebas unitarias del generador de datos (DNI válido y único, perfiles de constantes producen el NEWS2 esperado, misma semilla ⇒ mismos datos).

## 9. Lo que se deja al constructor

- Puertos exactos del entorno E2E, nombres de scripts y estructura interna de `support/`.
- Número de casos de datos por prueba (orientación: 2–4 perfiles por función, más en camas y personal).
- Si la prueba del 429 del login se mantiene (por ejemplo, con un segundo backend sin el ajuste) o se deja documentada como no cubierta.
- Número de workers en paralelo según la memoria disponible.

## 10. Riesgos

- **Mecanismo de pruebas filtrado a otros entornos:** mitigado con triple candado y pruebas PHPUnit (5.3).
- **`migrate:fresh` sobre la BD equivocada:** mitigado ejecutándolo solo con `-p vitalsy-e2e` y comprobando proyecto/puerto antes.
- **Recursos:** dos stacks Docker a la vez; se puede apagar el E2E con `e2e:down`.
- **Docs incompletos en M5/M6:** si una regla no está documentada, se anota como pregunta en el reporte en lugar de inventarla (regla del repo: no inventar requisitos).
- **Flakiness por tiempo real (WebSocket, polling 15 s):** las aserciones esperan con `expect.poll`/auto-wait, nunca `sleep` fijos.

## 11. Entrega por etapas

1. Infraestructura: entorno E2E, seeder, sesiones por rol, generador de datos, reporter CSV, reloj (con sus pruebas).
2. Acceso, permisos, M1, M2, M3, M4.
3. M6 y M5 en profundidad + temporales.
4. Día completo y piso lleno.

Rama propuesta: `feature/RNF-18-suite-e2e-clinical` desde `dev`.
