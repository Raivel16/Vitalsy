# Pruebas E2E automáticas de Vitalsy Clinical

Versión automática de la [guía de pruebas funcionales](guia-de-pruebas-clinical.md). Corre en local (no en CI) contra un entorno Docker propio y comprueba por pantalla que la interfaz y el funcionamiento esperado siguen correctos, con pacientes y datos distintos en cada corrida.

- **Herramienta:** Playwright (`frontend/web/e2e/`).
- **No está en GitHub (desde 2026-11-09):** la suite, `playwright.config.ts`, `tsconfig.e2e.json`, `docker-compose.e2e.yml`, `.env.e2e.example` y el workflow `browser-matrix.yml` se ignoran para que el zip de entrega y SonarQube midan solo lo que se entrega. Viven en la máquina local con copia en `D:\salva vitalsy`; para recuperarlos en otro equipo, copiarlos desde ahí o desde el historial de git (commit anterior a `chore(calidad): RNF-90 deja la suite e2e fuera del repositorio`). Para comprobar tipos: `npx tsc --noEmit -p tsconfig.e2e.json`.
- **Diseño y plan:** `docs/superpowers/specs/2026-10-23-suite-e2e-clinical-design.md` y `docs/superpowers/plans/2026-10-23-suite-e2e-clinical.md`.

## 1. Preparación (una sola vez)

1. Copie la plantilla de variables del entorno E2E (raíz del repositorio):

   ```
   copy .env.e2e.example .env.e2e
   ```

   Complete `APP_KEY` (la plantilla indica cómo generarla). El resto de los valores pueden quedar como están. No reutilice el `.env` de desarrollo.

2. Instale las dependencias y los navegadores (en `frontend/web`):

   ```
   npm install
   npx playwright install chromium firefox webkit
   ```

3. Requisitos: Docker Desktop con Compose ≥ 2.24 y el puerto **18080** libre. El stack de desarrollo (8080) puede seguir corriendo al mismo tiempo.

## 2. Comandos (en `frontend/web`)

| Comando | Qué hace |
|---|---|
| `npm run e2e` | Todo: fase paralela (M1–M4, acceso, permisos, piso lleno) y fase serial (reloj, M5 camas, M6 personal, día completo). |
| `npm run e2e -- m5-camas` | Solo los archivos cuyo nombre contiene `m5-camas`. |
| `npm run e2e -- -g "RF-72"` | Solo las pruebas cuyo título contiene `RF-72`. |
| `E2E_SEED=1234 npm run e2e -- -g "RF-72"` | Repite exactamente los mismos datos de una corrida anterior. |
| `npm run e2e:ui` | Modo visual: elija una prueba y véala paso a paso. |
| `npm run e2e:report` | Abre el último reporte HTML. |
| `npm run e2e:browsers` | Fase paralela en Firefox y Safari (WebKit). |
| `npm run e2e:down` | Apaga el entorno E2E y borra su base de datos. |

En PowerShell, la variable se define antes del comando: `$env:E2E_SEED=1234; npm run e2e -- -g "RF-72"`.

El primer arranque construye las imágenes e instala dependencias, así que tarda varios minutos. Las corridas siguientes reutilizan el entorno.

## 3. Qué pasa en cada corrida

1. `global-setup` comprueba que la suite apunta a `http://localhost:18080`. Si no, aborta para no tocar el stack de desarrollo.
2. Levanta el proyecto Compose `vitalsy-e2e` si no está arriba. Usa `docker-compose.e2e.yml`, con base de datos propia y `APP_ENV=e2e`.
3. Reinicia los datos con `migrate:fresh --seeder=E2ESeeder`, solo tras confirmar que el contenedor responde `[e2e]`. El seeder siembra los 15 roles, las personas de demostración y 70 camas adicionales.
4. Crea una sesión por rol e imprime la **semilla** de la corrida.
5. Cada prueba crea sus propios pacientes por API (`e2e/support/scenarios/`) y luego prueba por pantalla, como la persona del rol correspondiente.

### Reloj de pruebas

Las reglas de tiempo (escalamiento a los 5 min, control vencido, dosis con 30 min de gracia, ventana de relevo, código Life de 30 min) se prueban adelantando el reloj del backend con `php artisan e2e:clock`.

- El comando y su efecto **solo existen** con `APP_ENV=e2e` y `E2E_CLOCK_ENABLED=true`. En desarrollo, pruebas y producción no se registran.
- Las pruebas que lo usan van en la fase serial y lo restablecen al terminar.

## 4. Cómo leer los resultados

- **Terminal:** resumen de pasadas y fallidas con el título `RF-XX · Módulo · comportamiento [paso de la guía]`, lo esperado frente a lo obtenido y la semilla.
- **Reporte HTML** (`npm run e2e:report`). En cada fallo hay:
  - capturas de cada pantalla abierta;
  - video;
  - **traza**, para recorrer clic a clic con la red y la consola;
  - `datos.json`, con los pacientes y entidades que creó la prueba.
- **`frontend/web/e2e-results/hallazgos.csv`:** una fila por prueba fallida, con las columnas de `registro-de-hallazgos.csv`. Incluye el comando exacto para reproducir y la ruta de la traza.

Etiquetas que conviene conocer:

| Etiqueta | Significado |
|---|---|
| `@hallazgo-HP-xx` | Defecto ya documentado en la sección 9 de la guía. La prueba afirma el comportamiento **correcto**, así que falla hasta que se corrija. En el CSV la fila usa el ID `HP-xx`. |
| `@defecto-intermitente` | Defecto observado que todavía no se reproduce siempre. Un fallo ahí no es necesariamente una regresión nueva. |

Cualquier otra prueba en rojo es una **regresión o un defecto nuevo**.

## 5. Qué no cubre

- La app móvil Vitalsy Life. Su lado servidor se usa por API cuando un escenario de Clinical lo necesita.
- Carga de 200 usuarios, latencia ≤ 2 s concluyente, TLS 1.3 real, disponibilidad y recuperación ante desastres.
- El sonido audible de la sirena. Se comprueba que arranca y se detiene el oscilador de audio.
- La cámara real: los códigos se escriben a mano.
- La integración real con LIS/PACS: solo hay *stubs*.

## 6. Si algo falla al preparar

| Síntoma | Qué hacer |
|---|---|
| `Abortado: la suite E2E solo corre contra http://localhost:18080` | No defina `BASE_URL`; la suite usa siempre el stack E2E. |
| `Defina DEMO_PASSWORD en .env.e2e` | Copie `.env.e2e.example` a `.env.e2e`. |
| `/api/health` no responde en 5 minutos | Revise `docker compose -p vitalsy-e2e logs backend`. |
| `reverb` sale con código 1 | Falta la extensión `pcntl` en `backend/api/Dockerfile`. |
| El navegador no abre en el primer intento | El primer arranque del Chromium descargado puede tardar (escaneo del antivirus); vuelva a ejecutar. |

## Pruebas inestables por recargas de página

El servidor Vite del stack E2E sirve el código en modo desarrollo y vigila la carpeta del proyecto. Si no ignora `e2e-results/` (reportes, videos, trazas) y `e2e/.auth/` (sesiones), cada archivo que Playwright escribe provoca un `page reload` en los navegadores de las demás pruebas, que pierden la página a mitad de una navegación y agotan el tiempo. `vite.config.ts` los ignora (`server.watch.ignored`) y `src/app/viteWatch.test.ts` lo vigila. Si una prueba vuelve a agotar el tiempo en un `goto`, revise en `docker compose -p vitalsy-e2e logs frontend` si aparecen líneas `page reload`.
