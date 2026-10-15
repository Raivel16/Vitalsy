# Pruebas de carga (RNF-03, RNF-04)

Escenarios k6 en `scripts/load/`. Ejecutar solo contra un entorno de pruebas con datos sintéticos.

| Escenario | Cubre | Umbrales |
|---|---|---|
| `k6-census.js` | Lista de ingresos y censo de camas (RNF-03) | p95 < 2 s, errores < 1 % |
| `k6-alertas.js` | Bandeja de alertas y registro de signos vitales (RNF-04) | p95 bandeja < 2 s, p95 signos < 1 s, errores < 1 % |

Credenciales y URL llegan por variables (`-e`); no se guardan en el repositorio.

## Procedimiento RNF-04 (200 usuarios, degradación <= 10 %)

1. Línea base: `k6 run -e TARGET_VUS=10 ... scripts/load/k6-alertas.js`; anotar p95 y media de `http_req_duration`.
2. Carga objetivo: repetir con `-e TARGET_VUS=200` (por defecto).
3. Degradación = (media con 200 VU - media con 10 VU) / media con 10 VU. Debe ser <= 10 %.
4. Registrar fecha, commit, hardware y resultados en `docs/operacion/` o en el PR.

## Estado de verificación

Los escenarios están escritos pero **no se han ejecutado** en este repositorio (requieren k6 y un entorno desplegado). Los resultados de RNF-03 y RNF-04 quedan pendientes de una corrida real.
