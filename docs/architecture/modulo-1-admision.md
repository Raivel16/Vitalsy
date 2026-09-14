# Módulo 1: Admisión y recepción

Interfaces del ingreso hospitalario y rutas API provisionales. No hay persistencia clínica, autenticación real, firma criptográfica, impresión ni interoperabilidad.

## Organización

El frontend usa Screaming Architecture. Cada carpeta nombra el dominio, no una categoría técnica global.

```text
services/frontend/src/modules/
  admission/                    RF-01 a RF-06
  patient-transfer/             RF-07 a RF-10
  nursing-assessment/           RF-11, RF-12 y NEWS2
  medication-reconciliation/    RF-13
  risk-assessment/              RF-14
  admission-kardex/             RF-15
  medical-orders/               RF-16
```

`src/app` contiene el shell, el selector de rol y el cliente HTTP. `src/shared/ui` solo tiene primitivas visuales.

## Flujos implementados

| Requisito | Pantalla | Rol |
|---|---|---|
| RF-01 | `/admision/orden` | Admisión |
| RF-02 | `/admision/filiacion` y `/admision/cobertura` | Admisión |
| RF-03 | `/admision/cobertura/derivacion` | Admisión |
| RF-04 | `/admision/brazalete` | Admisión |
| RF-05 | `/admision/expediente` | Admisión |
| RF-06 | `/admision/consentimiento` | Admisión, en el terminal del paciente |
| RF-07 | `/traslado/orden` | Celador |
| RF-08 | `/traslado/identidad` | Celador |
| RF-09 | `/piso/recepcion` | Enfermería |
| RF-10 | `/piso/reubicacion` | Enfermería |
| RF-11 | `/enfermeria/valoracion` | Enfermería |
| RF-12 | `/enfermeria/constantes` | Enfermería |
| RF-13 | `/enfermeria/conciliacion` | Enfermería |
| RF-14 | `/enfermeria/riesgos` | Enfermería |
| RF-15 | `/enfermeria/kardex` | Enfermería consulta el documento que arma el sistema |
| RF-16 | `/medico/indicaciones` | Médico |

El selector de rol es una sesión simulada en el navegador. No cumple todavía el control de acceso de RNF-08.

Datos de demostración: `OI-2026-0001` (cobertura aprobada), `OI-2026-0002` (pendiente), `OI-2026-0003` (rechazada), traslado `OT-2026-0001`, brazalete `BRZ-0001-ANA`, encuentro `ENC-0001`. Los pacientes son ficticios.

## Cálculos clínicos

NEWS2 sigue la chart 1 del Royal College of Physicians (2017), incluidas la escala 2 de SpO2 y la confusión crónica sin puntuación. La banda visual del proyecto (RNF-15) es verde en 0, amarilla en 1 a 6 y roja desde 7. Una puntuación de 3 en un solo parámetro añade texto de revisión urgente. El cálculo no dispara el flujo de alertas de los módulos 2 y 3.

Morse usa los cortes de cuidado agudo 0-24, 25-44 y 45 o más. Braden usa 19-23, 15-18, 13-14, 10-12 y 9 o menos. La fricción solo admite 1 a 3. El mismo algoritmo está en TypeScript y PHP.

La conciliación solo aplica una tabla local de demostración. No es una base de interacciones.

## Rutas API provisionales

Prefijo `/api/v1/hospital-admission`. Todas las respuestas incluyen `simulated: true`.

| Método | Ruta | Requisito |
|---|---|---|
| GET | `/admission-orders/{orderNumber}` | RF-01 |
| POST | `/filiation/validate` | RF-02 |
| POST | `/coverage/validate` | RF-02 |
| POST | `/coverage/referrals` | RF-03 |
| POST | `/wristbands` | RF-04 |
| POST | `/clinical-records` | RF-05 |
| POST | `/informed-consents` | RF-06 |
| GET | `/transfer-orders/{orderNumber}` | RF-07 |
| POST | `/wristbands/verify` | RF-08 |
| POST | `/floor-receptions` | RF-09 |
| POST | `/relocations` | RF-10 |
| POST | `/nursing-assessments` | RF-11 |
| POST | `/vital-signs` | RF-12 y NEWS2 |
| POST | `/medication-reconciliations` | RF-13 |
| POST | `/risk-scales` | RF-14 |
| GET | `/kardex/{encounterId}` | RF-15 |
| GET | `/medical-orders/{encounterId}` | RF-16 |
| POST | `/medical-orders/{encounterId}/sign` | RF-16 |

Una orden desconocida responde 404. Un cuerpo inválido o un valor fisiológico imposible responde 422.

## Pendiente en backend

- Persistencia y modelos clínicos.
- Autenticación, roles reales y cierre por inactividad.
- Firma digital, impresión del brazalete y código de barras escaneable.
- Integraciones HIS, cobertura y central de camas.
- Proceso de alertas, escalamiento y monitoreo programado a partir del NEWS2.
