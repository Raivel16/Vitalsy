# Interoperabilidad LIS/PACS (RF-21, RNF-17)

Clientes FHIR R4 para laboratorio (LIS) e imagenes (PACS), seleccionables por entorno. Los contratos `LisClient` y `PacsClient` no cambian: `LabResultsIntegrator` y los controladores siguen consumiendo la misma forma.

## Driver

| Variable | Defecto | Descripcion |
|---|---|---|
| `INTEROP_DRIVER` | `stub` | `stub` (local/testing) o `fhir` |
| `INTEROP_FHIR_BASE_URL` | vacio | URL base del servidor FHIR (obligatoria con `fhir`; sin ella el binding falla al resolver) |
| `INTEROP_FHIR_TOKEN` | vacio | Bearer token; nunca se registra en logs |
| `INTEROP_CONNECT_TIMEOUT` / `INTEROP_TIMEOUT` | 5 / 10 s | Timeouts HTTP |
| `INTEROP_RETRIES` / `INTEROP_RETRY_SLEEP_MS` | 2 / 200 | Reintentos ante fallo de red o 5xx |
| `INTEROP_MAX_PAGES` / `INTEROP_PAGE_SIZE` | 5 / 50 | Paginacion acotada del searchset |

El binding vive en `App\Providers\InteroperabilityServiceProvider`. El destino sale solo de `config/interop.php` (guarda anti-SSRF), TLS siempre verificado.

## Mapeo

- Encounter: `GET /Encounter?identifier={encounter_id}` resuelve el id FHIR.
- LIS: `Observation?encounter=...` (Bundle searchset, siguiendo `link[relation=next]`) se transforma a la forma de `LisClient`. Observaciones malformadas se omiten y se cuentan como error `malformed`.
- PACS: `DiagnosticReport?encounter=...` se transforma a la forma de `PacsClient`.
- Fallo remoto tras reintentos: `InteropUnavailableException`, la API responde 503 controlado y sigue sirviendo los resultados ya almacenados.

## Metrica de exito (RNF-17)

Cada mensaje se registra en `interop_message_logs` (sistema, direccion, tipo de recurso, id externo, resultado, codigo de error, duracion). No se guardan datos clinicos (PHI). `php artisan interop:success-rate --days=7` imprime la tasa por sistema y termina con codigo 1 si es menor al 99 %.

## Pendiente de cliente

Requiere endpoint y credenciales reales del HIS/LIS/PACS; los tests usan `Http::fake()` con fixtures en `backend/api/tests/Fixtures/fhir/`. HL7 v2.x no esta implementado.
