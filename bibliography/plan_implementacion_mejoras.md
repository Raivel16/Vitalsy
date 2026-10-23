# Plan de implementación de mejoras

Este archivo es una especificación de trabajo. No forma parte de la documentación de los capítulos 6 al 12.

Describe únicamente lo que el repositorio todavía no hace y que hace falta para acercar el desarrollo y las pruebas al enfoque de los capítulos 8, 11 y 12. Las mejoras de producto o de infraestructura detectadas al documentar el estado real van al final, en una sección aparte.

Reglas para quien ejecute este plan:

- No modificar `bibliography/documentacion_capitulos_6_al_12.md` para simular que la mejora ya existía.
- Seguir TDD: la prueba nueva falla primero y el cambio de producción es el mínimo que la pone en verde.
- No instalar Pest. PHPUnit ya es el ejecutor del backend.
- No entrenar un modelo de predicción de defectos ni un mecanismo de self-healing. Esas técnicas quedan registradas como mejora posterior y no se implementan en este plan.
- No inventar un rol de administrador. RF-101 a RF-104 nombran a un «administrador de accesos» que no está en `RoleCatalog`.
- No copiar contraseñas reales a archivos versionados. En CI usar una contraseña de prueba definida solo en el workflow.
- Rama de trabajo desde `dev`, con el nombre que corresponda al identificador del requisito cuando exista. Commits atómicos en Conventional Commits.
- Validar cada mejora con el comando indicado antes de darla por cerrada.

Inspección de referencia: rama `chore/ui-procesos-4-5-6-pizarra`, remoto `origin` = `https://github.com/Raivel16/Vitalsy.git`.

---

## Mejora 1 – Ejecutar Jest de Vitalsy Life en GitHub Actions

### Problema o brecha

`services/movil` tiene suite Jest y el workflow de GitHub no la ejecuta. Un cambio del módulo 7 puede integrarse en `dev` sin que esas pruebas corran.

### Evidencia

- Script `"test": "jest"` en `services/movil/package.json`.
- Configuración en `services/movil/jest.config.js` (`preset: jest-expo`).
- `.github/workflows/ci.yml` solo instala y prueba `frontend/web` y `backend/api`.

### Recomendación

El capítulo 12 pide que la suite existente entre al pipeline de integración. Las fuentes de automatización tratan el CI como el lugar donde la regresión se repite en cada cambio.

### Objetivo

El job `validate` falla si las pruebas del móvil fallan.

### Cambios requeridos

Añadir pasos de Node para `services/movil` en el workflow actual, sin alterar las pruebas existentes.

### Archivos o módulos afectados

- `.github/workflows/ci.yml`
- `services/movil/package-lock.json` (debe existir o generarse para `npm ci`; comprobar antes de asumir el lockfile)

### Implementación

1. Comprobar si `services/movil/package-lock.json` existe. Si no existe, generarlo con `npm install` dentro de `services/movil` y versionarlo. No cambiar dependencias de producto.
2. En `.github/workflows/ci.yml`, después del build del frontend web, añadir:
   - `npm ci` en `services/movil`.
   - `npm test` en `services/movil`.
3. Si Jest exige un entorno que el runner no tiene (watchman, SDK de Android), fijar en el script de CI `CI=true` y la configuración que `jest-expo` documenta para runners sin dispositivo. No saltar las pruebas con `|| true`.
4. No incluir el móvil en el build de Docker. Esta mejora solo cubre la suite.

### Validación

- En local: `npm test` dentro de `services/movil` termina en cero.
- El YAML del workflow contiene un paso cuyo `working-directory` es `services/movil` y cuyo `run` es `npm test`.
- Una prueba rota a propósito (revertida después) hace fallar ese paso.

### Resultado esperado

Cada push y cada pull request a `main` o `dev` ejecuta las pruebas de Vitalsy Life además de Vitest, el build web, PHPUnit y Pint.

### Prioridad

Alta.

---

## Mejora 2 – Pruebas de propiedades sobre reglas puras

### Problema o brecha

NEWS2, Morse, Braden y las reglas de documento y teléfono se prueban con ejemplos fijos. No hay propiedades que recorran muchos valores y comprueben invariantes.

### Evidencia

- `backend/api/tests/Unit/Clinical/News2CalculatorTest.php`
- `backend/api/tests/Unit/Clinical/RiskScaleTest.php`
- `backend/api/app/Services/Clinical/News2Calculator.php`
- `backend/api/app/Services/Clinical/MorseFallScale.php`
- `backend/api/app/Services/Clinical/BradenScale.php`
- `frontend/web/src/shared/validation/inputRules.ts`
- `frontend/web/src/shared/validation/inputRules.test.ts`
- `frontend/web/src/modules/nursing-assessment/domain/news2.test.ts`
- No hay `fast-check`, Hypothesis ni Eris en los manifiestos.

### Recomendación

El artículo de pruebas basadas en propiedades usa un modelo de lenguaje para proponer propiedades y Hypothesis en Python para ejecutarlas. Vitalsy no tiene módulo Python. La misma idea se implementa en el stack real: propiedades pequeñas, oráculo escrito por una persona, generador acotado a rangos clínicos.

### Objetivo

Cada función pura citada rechaza o puntúa de forma estable para un conjunto generado de entradas, sin depender de un único ejemplo.

### Cambios requeridos

Añadir propiedades con aserciones revisadas. No generar el oráculo automáticamente y aceptarlo sin lectura.

### Archivos o módulos afectados

- `frontend/web/package.json` (dependencia de desarrollo `fast-check`)
- `frontend/web/src/shared/validation/inputRules.property.test.ts` (archivo nuevo)
- `backend/api/tests/Unit/Clinical/News2CalculatorPropertyTest.php` (archivo nuevo)
- `backend/api/tests/Unit/Clinical/RiskScalePropertyTest.php` (archivo nuevo)
- Opcional, si el cálculo NEWS2 del frontend está duplicado: `frontend/web/src/modules/nursing-assessment/domain/news2.property.test.ts`

### Implementación

1. Leer las funciones y las pruebas de ejemplo actuales. Extraer solo invariantes que el código ya cumple y que el requisito clínico permite. Ejemplos que deben comprobarse contra el código, no imponerse si el código los contradice:
   - `digitsOnly` no conserva letras ni espacios.
   - `documentNumberError` y `phoneNumberError` devuelven error cuando la cadena contiene un carácter que no es dígito, y no exigen un campo que el módulo ya trata como opcional.
   - El puntaje NEWS2 es un entero mayor o igual que cero para combinaciones válidas de sus parámetros.
   - Morse y Braden devuelven un nivel perteneciente al conjunto que la clase ya define, para puntuaciones dentro del dominio de cada ítem.
2. En el frontend, instalar `fast-check` como `devDependency` y escribir el archivo de propiedades con semilla fija (`fc.assert` con `seed` explícito) para que el fallo sea reproducible.
3. En el backend, no añadir un paquete PHP nuevo. Escribir un generador determinista dentro del test (semilla entera, bucle de al menos 50 combinaciones) que llame a `News2Calculator`, `MorseFallScale` y `BradenScale`.
4. Si una propiedad falla porque el código actual no la cumple, no se cambia la regla clínica para acomodar el generador. Se ajusta la propiedad al contrato real o se abre un defecto aparte con una prueba de ejemplo que lo reproduzca.
5. Ejecutar `npm test` en `frontend/web` y `php artisan test --filter=Property` en `backend/api`.

### Validación

- Los archivos nuevos existen y fallan si se altera a propósito el invariante (cambio revertido después de comprobarlo).
- La suite completa de web y de API sigue en verde.
- El diff de las propiedades fue leído: cada `expect` nombra el invariante y no solo «no lanza excepción».

### Resultado esperado

La regresión de las reglas puras cubre rangos, no solo los ejemplos ya escritos. No aparece un proyecto Python ni Hypothesis.

### Prioridad

Alta.

---

## Mejora 3 – Recorridos de navegador con Cypress

### Problema o brecha

No hay prueba que abra la aplicación en un navegador, inicie sesión y recorra un paso real. Vitest usa jsdom.

### Evidencia

- `frontend/web/package.json` no depende de Cypress ni de Playwright.
- No existe `cypress.config.*` ni una carpeta `e2e/`.
- El login real es `LoginPage` (`id="email"`, `id="password"`) contra `POST /api/v1/auth/login`.
- El censo está en `/pacientes` (`CensusPage`).

### Recomendación

Las fuentes piden automatizar recorridos de interfaz y advierten que los selectores de presentación se rompen. El esquema del capítulo 12 usa Cypress como ejemplo. Se adopta Cypress por esa razón. Las fuentes no exigen esa marca frente a otras; no se instalan Selenium ni Playwright además de Cypress.

### Objetivo

Tres recorridos automáticos: login rechazado, login aceptado y censo visible para `admision`. Quedan integrados a un job de CI que levanta API y web.

### Cambios requeridos

Instalar Cypress, añadir selectores estables en las dos pantallas del recorrido, sembrar un usuario de prueba y ejecutar `cypress run` en CI contra PostgreSQL de servicio.

### Archivos o módulos afectados

- `frontend/web/package.json`
- `frontend/web/cypress.config.ts` (nuevo)
- `frontend/web/cypress/e2e/auth-census.cy.ts` (nuevo)
- `frontend/web/cypress/support/e2e.ts` (nuevo)
- `frontend/web/src/app/LoginPage.tsx`
- `frontend/web/src/modules/admission-census/pages/CensusPages.tsx`
- `.github/workflows/ci.yml`
- `.gitignore` si Cypress genera vídeos o descargas que no deban versionarse

### Implementación

1. Añadir `data-testid` sin quitar los `id` actuales:
   - `login-email`, `login-password`, `login-submit` en `LoginPage`.
   - `census-query` y `census-search` en el campo y el botón Buscar de `CensusPages.tsx`.
2. Instalar Cypress como dependencia de desarrollo del frontend. `baseUrl` por defecto `http://127.0.0.1:4173` para el preview de Vite, con la API en `http://127.0.0.1:8000` mediante `VITE_API_URL` o el proxy ya existente. Elegir una sola vía y dejarla escrita en `cypress.config.ts`.
3. Escribir tres casos y nada más en esta mejora:
   - Visitar `/` sin sesión, enviar credenciales inválidas y comprobar que sigue el formulario de acceso.
   - Sembrar o usar el usuario `admision@vitalsy.local` con la contraseña de prueba del entorno, entrar y comprobar que la URL deja de ser la de login.
   - Con esa sesión, abrir `/pacientes` y comprobar que el campo `census-query` está visible.
4. No cubrir filiación, e-MAR ni alertas en este primer recorrido.
5. En `.github/workflows/ci.yml`, añadir un job `e2e` que:
   - levante un servicio `postgres:16`;
   - configure `DB_CONNECTION=pgsql` y una `DEMO_PASSWORD` solo de CI;
   - ejecute `composer install`, `php artisan migrate --force` y `php artisan db:seed --force` en `backend/api`;
   - arranque `php artisan serve` en segundo plano;
   - en `frontend/web`, ejecute `npm ci`, `npm run build` y `vite preview` con el proxy o `VITE_API_URL` apuntando al serve;
   - ejecute `npx cypress run`.
6. El job `e2e` depende de que `validate` haya pasado, o corre en paralelo si no comparte caché. Un fallo de Cypress falla el workflow.
7. Añadir `cypress/videos/` y `cypress/screenshots/` al `.gitignore` si la herramienta los crea.

### Validación

- `npx cypress run` en local, con el compose o con el mismo par serve/preview, deja los tres casos en verde.
- El workflow contiene el job `e2e`.
- Buscar en el repositorio confirma que no hay `playwright.config.*`.

### Resultado esperado

El flujo crítico de entrar y ver el censo queda automatizado. Cypress no se describe como herramienta previa: entra con este cambio.

### Prioridad

Alta.

---

## Mejora 4 – Umbral de cobertura en GitHub Actions

### Problema o brecha

El laboratorio documenta un mínimo del 80 % de cobertura. El workflow de GitHub genera cobertura de la web y puede medir el backend con PCOV, y no falla si el porcentaje baja.

### Evidencia

- `frontend/web/package.json`: `vitest run --coverage --coverage.reporter=lcov`.
- `.github/workflows/ci.yml` pide `coverage: pcov` y no publica ni compara un umbral.
- `docs/devops/subir-al-laboratorio.md` cita el 80 % como criterio del Gate externo.
- Esta revisión no ejecutó la suite para medir el porcentaje actual. No se fija el umbral a ciegas el primer día si la medición real está por debajo.

### Recomendación

La integración continua debe convertir la cobertura en un criterio repetible. SonarQube sigue siendo del pipeline externo. Esta mejora no lo instala en GitHub.

### Objetivo

El job de GitHub falla cuando la cobertura medida de web o de backend queda por debajo del umbral acordado con la medición real, usando 80 % como techo que la guía del laboratorio ya nombra.

### Cambios requeridos

Medir primero. Si el valor actual es menor que 80, registrar el número en el commit de la mejora y poner el umbral en ese número, con un comentario que indique la subida posterior hasta 80. Si el valor actual ya alcanza 80, el umbral queda en 80.

### Archivos o módulos afectados

- `frontend/web/vitest.config.ts`
- `backend/api/phpunit.xml` o el script `test:coverage` de `composer.json`
- `.github/workflows/ci.yml`

### Implementación

1. Ejecutar `npm test` en `frontend/web` y anotar el porcentaje total de líneas que informe el coverage de Vitest.
2. Ejecutar `composer test:coverage` en `backend/api` (el script ya apunta a PHPUnit con Clover) y anotar el porcentaje.
3. Elegir el umbral de cada paquete como el mínimo entre 80 y el entero ya alcanzado, para que el primer cambio no sea rojo por una cifra no medida antes.
4. Configurar Vitest `coverage.thresholds` con ese entero (líneas).
5. Añadir al workflow un paso que falle si el Clover del backend queda bajo el entero elegido. Puede ser un script PHP o una comparación simple del atributo del XML. No depender de SonarQube.
6. Dejar en el mensaje del commit los dos porcentajes medidos y el umbral aplicado.

### Validación

- Una ejecución local muestra el porcentaje y el umbral configurado no supera ese porcentaje.
- Bajar a propósito el umbral en una rama de prueba no es necesario: basta comprobar que el paso del workflow lee el informe y termina en cero con la suite actual.

### Resultado esperado

GitHub Actions protege la cobertura que el repositorio ya alcanza. El 80 % del laboratorio sigue siendo la meta escrita si la medición todavía no llega.

### Prioridad

Media.

---

## Mejora 5 – Rechazo por rol donde la prueba de API no lo cubre

### Problema o brecha

`routes/api.php` restringe cada grupo con `role:`. No se ha verificado, recurso por recurso, que exista una prueba del rechazo cuando el rol es ajeno.

### Evidencia

- Middleware `role:` en `backend/api/routes/api.php`.
- Pruebas de característica en `backend/api/tests/Feature/`.
- Esta revisión no afirma qué recursos concretos carecen del caso negativo. Hay que leerlos.

### Recomendación

La estrategia del capítulo 11 exige que el rol autorizado logre el efecto y que un rol ajeno sea rechazado, en especial en identidad, medicación, alerta y salida.

### Objetivo

Cada recurso protegido de esos cuatro grupos tiene al menos un test que autentica con un rol no incluido en su middleware y espera el código de rechazo que `EnsureUserRole` ya devuelve.

### Cambios requeridos

Añadir solo los casos ausentes. No duplicar los que ya existen.

### Archivos o módulos afectados

- `backend/api/tests/Feature/HospitalAdmissionApiTest.php`
- `backend/api/tests/Feature/CpoePrescriptionApiTest.php`
- `backend/api/tests/Feature/EmarAndCareApiTest.php`
- `backend/api/tests/Feature/ClinicalAlertsApiTest.php`
- `backend/api/tests/Feature/DischargeApiTest.php`
- Nuevos métodos en esos archivos, o un archivo `RoleDenialApiTest.php` si el existente no es el lugar natural
- `backend/api/app/Http/Middleware/EnsureUserRole.php` (solo lectura, para copiar el código HTTP real)

### Implementación

1. Leer `EnsureUserRole` y anotar el código HTTP del rechazo (no suponer 403 si el middleware responde otra cosa).
2. Hacer una tabla de trabajo, fuera del código si hace falta, con cada ruta de filiación, brazalete, prescripción, e-MAR, acuse de alerta y salida, el rol permitido y si el test de característica ya cubre el rechazo.
3. Por cada fila sin cobertura, escribir primero el test: usuario de otro rol del catálogo, petición autenticada, código de rechazo, y ausencia del efecto de negocio (por ejemplo, que no se cree la prescripción).
4. Ejecutar `php artisan test` y dejar la suite en verde. Si un test nuevo falla porque el middleware no rechaza, el fallo es un defecto: corregir el middleware o la ruta, no borrar el test.
5. No ampliar esta mejora a todos los recursos de camas y personal en el mismo cambio. Esos pueden ser un segundo commit si la tabla demuestra el mismo hueco.

### Validación

- `php artisan test` en verde.
- Para cada caso nuevo, el nombre del método dice el rol ajeno y la ruta.
- Un rol permitido de ese mismo recurso sigue cubierto por la prueba que ya existía.

### Resultado esperado

Identidad, medicación, alerta y salida rechazan al rol que la ruta no lista, y esa regla queda en regresión.

### Prioridad

Media.

---

## Mejora 6 – Selectores estables para la automatización de interfaz

### Problema o brecha

La interfaz se prueba por texto, clases o `id` dispersos. Las fuentes describen la fragilidad de los selectores de presentación y la reparación automática posterior. Sin un identificador estable, esa reparación no tiene ancla y no debe construirse.

### Evidencia

- `LoginPage` usa `id="email"` y `id="password"`.
- El censo usa etiqueta «Buscar paciente» y botón «Buscar» en `CensusPages.tsx`.
- No hay convención `data-testid` en el frontend.

### Recomendación

Antes de cualquier self-healing, los recorridos automáticos deben apoyarse en atributos que no cambien con la clase CSS.

### Objetivo

Login, censo y filiación exponen `data-testid` en los controles que un recorrido automático necesita. La mejora 3 puede hacer los de login y censo; esta mejora completa el criterio y añade filiación.

### Cambios requeridos

Añadir los atributos y una prueba de componente que compruebe que siguen en el DOM. No instalar una librería de reparación.

### Archivos o módulos afectados

- `frontend/web/src/app/LoginPage.tsx`
- `frontend/web/src/modules/admission-census/pages/CensusPages.tsx`
- `frontend/web/src/modules/admission/pages/FiliationPage.tsx`
- Pruebas ya existentes: `frontend/web/src/app/login.test.tsx`, `frontend/web/src/modules/admission-census/census.test.tsx`, `frontend/web/src/modules/admission/admission.test.tsx`

### Implementación

1. Definir estos identificadores y no otros en este cambio:
   - `login-email`, `login-password`, `login-submit`
   - `census-query`, `census-search`
   - `filiation-document`, `filiation-submit`
2. Colocarlos en el input o en el botón real, no en un contenedor.
3. Ampliar la prueba de componente de cada pantalla para hacer `getByTestId` de esos nodos.
4. Documentar la lista en un comentario breve al inicio de `cypress/support/e2e.ts` si la mejora 3 ya creó ese archivo. Si no existe, un bloque de tres líneas en `frontend/web/src/app/login.test.tsx` basta como referencia hasta que Cypress entre. No crear un documento nuevo de estilo.

### Validación

- `npm test` en `frontend/web` sigue en verde.
- Buscar `self-heal` o una dependencia de reparación en `package.json` no devuelve resultados nuevos.

### Resultado esperado

Los tres flujos tienen anclas estables. La reparación automática de selectores sigue sin implementarse.

### Prioridad

Media.

---

## Mejora 7 – Registro mínimo de Intent, Unit y Bolt

### Problema o brecha

El capítulo 8 pide artefactos de intención, unidad y ciclo corto, con el criterio de aceptación enlazado a una prueba. El repositorio no tiene ese registro. Las reglas actuales piden un plan antes de editar, y ese plan no queda en el árbol.

### Evidencia

- `AGENTS.md` exige plan y aprobación, sin una plantilla versionada.
- No hay carpeta de bolts ni tablero en el repositorio.

### Recomendación

AI-DLC guarda esos artefactos como memoria de contexto. No hace falta un servidor de rituales. Basta un archivo por cambio, corto y revisable en el pull request.

### Objetivo

Quien abra una rama de requisito pueda copiar una plantilla y dejar en el PR el intent, la unidad, el criterio y la ruta de la prueba.

### Cambios requeridos

Añadir una plantilla. No reescribir la historia de los módulos ya hechos.

### Archivos o módulos afectados

- `docs/workflow/bolt.md` (nuevo)
- `docs/workflow/git-flow.md` (un párrafo que enlace la plantilla)

### Implementación

1. Crear `docs/workflow/bolt.md` con secciones vacías de ejemplo: Intent, Unit, Bolt, criterio de aceptación, prueba que lo fija (ruta de archivo), riesgo, decisión humana (aceptado o rechazado).
2. Indicar que el archivo de un cambio concreto puede vivir en la descripción del pull request y que no es obligatorio duplicarlo en `docs/` si el PR ya lo contiene.
3. En `git-flow.md`, después de la sección del pull request, añadir que la descripción debe incluir ese esquema.
4. No inventar bolts retrospectivos para RF-01 a RF-98.

### Validación

- Los dos archivos existen y el enlace relativo desde `git-flow.md` resuelve.
- La documentación de capítulos no se modifica para decir que los bolts ya se ejecutaron.

### Resultado esperado

El método del capítulo 8 tiene un lugar concreto donde registrarse a partir del próximo cambio.

### Prioridad

Media.

---

## Mejora 8 – Técnicas que no se implementan todavía

### Problema o brecha

Las fuentes describen predicción de defectos, priorización aprendida, detección de pruebas inestables y self-healing de selectores. El repositorio no tiene historial de ejecuciones etiquetado ni una suite de navegador previa sobre la cual aprender.

### Evidencia

- `.github/workflows/ci.yml` no archiva una serie histórica de fallos.
- No hay modelo, dataset ni job de entrenamiento.

### Recomendación

Implementar esas técnicas sin datos produciría un clasificador sin evidencia. El capítulo 12 las deja para después de la suite de navegador y de los selectores estables.

### Objetivo

Dejar por escrito el criterio de entrada, para que una ejecución posterior no las construya antes de tiempo.

### Cambios requeridos

Ningún código de modelo. Un apartado al final de este mismo archivo basta. No añadir dependencias de aprendizaje automático.

### Archivos o módulos afectados

Ninguno de producción.

### Implementación

1. No crear servicios de ML, notebooks ni tablas de features.
2. Volver a evaluar esta mejora solo cuando existan, a la vez, la mejora 3 en CI durante varias integraciones, la mejora 6, y un archivo de resultados del job (aunque sea el log de GitHub).
3. La primera implementación futura, cuando ese momento llegue, será un informe de pruebas inestables a partir de repeticiones del mismo caso, no una red neuronal.

### Validación

- `composer.json` y los `package.json` no ganan dependencias de TensorFlow, PyTorch ni similares por esta mejora.

### Resultado esperado

El límite queda explícito. El agente que ejecute este plan no improvisa un modelo.

### Prioridad

Baja.

---

# Mejoras aparte, detectadas al documentar el estado real

No son el método de los capítulos 8, 11 y 12. Se ejecutan solo si se pide explícitamente, y cada una en su propia rama.

---

## Mejora 9 – Contrato que el cliente Life ya llama

### Problema o brecha

`lifeClient.ts` llama a dos rutas que Laravel no declara. Con `EXPO_PUBLIC_API_URL` vacío la app sigue en local. Con la variable definida, esas llamadas no tienen controlador.

### Evidencia

- `services/movil/src/shared/api/lifeClient.ts`: `POST /api/life/sync` con cuerpo `{ items }` y `GET /api/life/discharge-plans/{code}`.
- `services/movil/src/shared/api/lifeClient.test.ts` fija ese contrato del cliente.
- `backend/api/routes/api.php` no contiene `life`.
- `SyncItem` tiene `id`, `kind` (`biometrics`, `consent` o `plan`), `body` y `status`.
- Las migraciones no tienen tablas de biometría ciudadana. El requisito funcional completo es RF-89 a RF-98. Esta mejora no los implementa todos.

### Recomendación

Cerrar el contrato que el cliente ya prueba, antes de diseñar el resto del módulo 7.

### Objetivo

Las dos rutas responden de forma compatible con el test del cliente. La persistencia clínica completa queda fuera de este cambio si no hay tabla que la reciba sin inventar un esquema mayor.

### Cambios requeridos

Rutas Laravel, prueba de característica y una persistencia mínima del lote, o un rechazo explícito documentado si se decide no persistir todavía. No cambiar la URL que el cliente ya usa para hacerla pasar por `/api/v1` sin actualizar el cliente y su test en el mismo cambio.

### Archivos o módulos afectados

- `backend/api/routes/api.php`
- `backend/api/app/Http/Controllers/Api/LifeSyncController.php` (nuevo)
- `backend/api/tests/Feature/LifeSyncApiTest.php` (nuevo)
- Migración nueva solo si se persiste el lote
- `services/movil/src/shared/api/lifeClient.test.ts` (solo si cambia el contrato)

### Implementación

1. Escribir `LifeSyncApiTest` con dos casos: `POST /api/life/sync` con un `items` de un elemento válido responde 2xx; `GET /api/life/discharge-plans/ALTA-1` responde 2xx con cuerpo de texto o 404 controlado si el código no existe. El test del cliente acepta cualquier cuerpo cuando `ok` es verdadero y trata el no-ok como ausencia.
2. Implementar el controlador que cumpla esos dos casos.
3. Decidir la persistencia con el esquema existente. Si ninguna tabla guarda un `SyncItem`, guardar el JSON en una tabla nueva de una sola responsabilidad (`life_sync_batches`: `id`, `payload` json, `created_at`) en lugar de simular pacientes hospitalarios. No crear el modelo clínico de línea de base en este cambio.
4. El GET de un código desconocido responde 404. No inventar un plan de alta falso de producción.
5. Dejar documentado en el controlador que RF-95 a RF-98 siguen pendientes.

### Validación

- `php artisan test --filter=LifeSync` en verde.
- `npm test` en `services/movil` sigue en verde sin cambiar las URL.

### Resultado esperado

El cliente deja de apuntar a un recurso inexistente. El módulo 7 clínico completo no queda cerrado con esta mejora.

### Prioridad

Baja.

---

## Mejora 10 – Administración de usuarios (RF-101 a RF-104)

### Problema o brecha

Los requisitos piden listar, crear, actualizar y desactivar cuentas. `App.tsx` de la rama inspeccionada no tiene esas rutas. El actor «administrador de accesos» no tiene clave en `RoleCatalog`. `users` sí tiene `role` e `is_active`.

### Evidencia

- `docs/requirements/requerimientos.md`, RF-101 a RF-104. El mismo archivo dice que la pantalla de administración no forma parte del corte del módulo 1.
- `frontend/web/src/app/roles.ts` lista 14 roles y ninguno es de administración.
- Existe la rama local `feature/RF-101-administracion-usuarios`. Su contenido no está en el árbol inspeccionado y no debe asumirse.

### Recomendación

No implementar la pantalla hasta que el requisito nombre la clave de rol que puede abrirla. Inventar `administrador` rompería el catálogo.

### Objetivo

Desbloquear el requisito sin adelantar la interfaz.

### Cambios requeridos

Ningún controlador nuevo en la primera pasada. Una nota en el requisito, hecha por quien mantiene el documento, que asigne la clave de rol. Después, y solo después, la implementación.

### Archivos o módulos afectados

- `docs/requirements/requerimientos.md` (decisión de la clave)
- Después de esa decisión: `RoleCatalog.php`, `frontend/web/src/app/roles.ts`, rutas en `api.php` y `App.tsx`, pruebas de API y de página

### Implementación

1. Detenerse si la clave de rol sigue ausente. No crear usuarios de prueba con un rol nuevo.
2. Cuando la clave exista en el requisito, añadirla al catálogo de backend y de frontend en el mismo cambio.
3. Escribir pruebas de RF-101 a RF-104: listar, crear con un único rol del catálogo, actualizar y desactivar (`is_active` en falso impide `Auth::attempt`).
4. Añadir las rutas de API bajo `auth:sanctum` y el rol recién nombrado, y las páginas que el requisito describa, sin campos extra.

### Validación

- Antes de la decisión de rol, el diff de código de aplicación está vacío.
- Después, `AuthApiTest` demuestra que un usuario inactivo no inicia sesión, y el rol ajeno no lista cuentas.

### Resultado esperado

La administración de cuentas queda bloqueada de forma explícita hasta tener actor en el catálogo, y queda especificada para el momento en que ese actor exista.

### Prioridad

Baja.

---

## Mejora 11 – Alinear o retirar `docker/nginx/default.conf`

### Problema o brecha

`docker/nginx/default.conf` envía PHP a `backend:9000` por FastCGI. La imagen real es `php:8.2-cli` y arranca con `php artisan serve`. El compose de desarrollo monta `docker/nginx/dev.conf`, no `default.conf`.

### Evidencia

- `docker/nginx/default.conf`
- `docker/nginx/dev.conf`
- `docker-compose.yml` monta `dev.conf`
- `backend/api/Dockerfile` no instala PHP-FPM

### Recomendación

Un archivo de despliegue que no corresponde al proceso real induce un despliegue equivocado. O se deja de publicar como configuración activa, o se reescribe al proxy HTTP que el backend sí escucha.

### Objetivo

Que ningún compose ni ninguna guía use el FastCGI del puerto 9000 mientras el proceso sea `artisan serve`.

### Cambios requeridos

Elegir una de las dos opciones y aplicarla. No mantener las dos en silencio.

### Archivos o módulos afectados

- `docker/nginx/default.conf`
- `docs/devops/subir-al-laboratorio.md` si menciona ese archivo (comprobarlo al ejecutar; en la revisión de los capítulos no se usó como configuración activa)

### Implementación

1. Opción preferida: convertir `default.conf` en un proxy HTTP equivalente a `dev.conf`, con el upstream `backend:8000` documentado en comentarios, y sin `fastcgi_pass`.
2. Opción alternativa: borrar el archivo si ninguna guía lo referencia, y comprobar con una búsqueda que no quede citado.
3. No cambiar `docker-compose.yml` de desarrollo, que ya monta `dev.conf`.
4. No añadir PHP-FPM en este cambio.

### Validación

- `docker compose up` sigue respondiendo en `http://localhost:8080`.
- El archivo resultante no contiene `9000` ni `fastcgi_pass`, o el archivo ya no existe y la búsqueda en el repo no lo cita.

### Resultado esperado

La configuración de Nginx versionada describe el proceso que el Dockerfile ejecuta.

### Prioridad

Baja.

---

## Mejora 12 – Quitar Pest de las reglas mientras no esté instalado

### Problema o brecha

`CONTRIBUTING.md` y `docs/architecture/reglas.md` ofrecen Pest como alternativa de backend. `composer.json` no depende de `pestphp/pest`. Las pruebas son clases PHPUnit.

### Evidencia

- `backend/api/composer.json` `require-dev` incluye `phpunit/phpunit` y no incluye Pest.
- No hay `tests/Pest.php`.

### Recomendación

La documentación de trabajo debe nombrar el ejecutor real. Instalar Pest solo para cumplir la frase duplicaría el marco de pruebas.

### Objetivo

Las reglas dicen que el backend se prueba con PHPUnit.

### Cambios requeridos

Editar las frases que presentan Pest como opción vigente. No ejecutar `composer require pestphp/pest`.

### Archivos o módulos afectados

- `CONTRIBUTING.md`
- `docs/architecture/reglas.md`
- `AGENTS.md` si repite la misma opción

### Implementación

1. Sustituir «PHPUnit o Pest» por «PHPUnit» en esas guías.
2. Dejar PHPUnit como único comando citado (`php artisan test`).
3. No borrar el `allow-plugins` de Composer si solo evita un aviso futuro. No instalar el paquete.

### Validación

- Una búsqueda de `Pest` en `CONTRIBUTING.md`, `docs/architecture/reglas.md` y `AGENTS.md` ya no lo ofrece como herramienta del proyecto.
- `composer.json` sigue sin `pestphp/pest`.

### Resultado esperado

Quien lea las reglas encuentra el mismo ejecutor que el CI usa.

### Prioridad

Baja.

---

## Orden sugerido de ejecución

1. Mejora 1 (móvil en CI).
2. Mejora 2 (propiedades).
3. Mejora 6 (selectores) junto con la mejora 3 (Cypress).
4. Mejora 5 (rechazo por rol).
5. Mejora 4 (umbral), después de medir.
6. Mejora 7 (plantilla de Bolt).
7. Mejoras 9 a 12 solo bajo pedido explícito.
8. Mejora 8 no se ejecuta.
