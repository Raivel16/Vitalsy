# Módulo 1: Admisión y recepción

Interfaces del ingreso hospitalario. Los códigos de requisito no se muestran en pantalla: esta guía indica qué interfaz corresponde a cada uno y cómo comprobar que funciona.

Los datos clínicos aún no salen de un HIS. Para la revisión se usan registros de prueba, listados al final.

## Cómo entrar

1. Desde la raíz del repositorio: `docker compose up --build`.
2. Abrir http://localhost:8080.
3. En la cabecera, elegir el rol de la fila que va a revisar. Cada pantalla solo se abre con el rol indicado. Si el rol no corresponde, aparece un aviso en español, no una pantalla vacía.

## Qué revisar

| Requisito | Qué debe hacer | Interfaz | Rol | Cómo confirmar que está bien |
|---|---|---|---|---|
| RF-01 | Ver la orden de internamiento del servicio emisor | `/admision/orden` | Admisión | Escriba `OI-2026-0001` y pulse Consultar orden. Debe ver a Ana María Quispe Rojas, origen Emergencia adultos y cobertura SIS aprobada. Con `OI-0000` debe salir el aviso «No se encontró la orden.», no un error en inglés. |
| RF-02 | Validar filiación y cobertura | `/admision/filiacion` y `/admision/cobertura` | Admisión | En filiación, envíe vacío: el nombre se marca inválido y no sale una petición. Complete nombre, documento y la confirmación: aparece la validación correcta. En cobertura, cambie el estado a pendiente y a rechazada: el texto y el icono cambian juntos, no solo el color. |
| RF-03 | Derivar un trámite de cobertura | `/admision/cobertura/derivacion` | Admisión | Deje el familiar vacío y envíe: el error queda junto al campo. Luego registre un familiar y un teléfono hacia trabajo social: el aviso indica que la derivación quedó registrada y el familiar notificado. |
| RF-04 | Emitir brazalete con código | `/admision/brazalete` | Admisión | Pulse Emitir brazalete. Debe aparecer el nombre, el código `BRZ-0001-ANA` y el código de barras. |
| RF-05 | Abrir el expediente de ingreso | `/admision/expediente` | Admisión | Pulse Aperturar expediente. El aviso confirma el expediente abierto y el identificador `EXP-0001`. |
| RF-06 | Registrar el consentimiento | `/admision/consentimiento` | Admisión | Sin nombre ni aceptación, el envío se detiene en el campo. Con nombre y la casilla aceptada, el estado queda firmado. |
| RF-07 | Ver la orden de traslado con habitación y lecho | `/traslado/orden` | Celador | Con `OT-2026-0001`, debe verse Ana María Quispe Rojas, habitación 312 y lecho B. Otro número responde que no se encontró la orden. |
| RF-08 | Confirmar identidad con el código del brazalete | `/traslado/identidad` | Celador | `BRZ-0001-ANA` confirma a Ana María Quispe Rojas. Otro código avisa que no corresponde al paciente. |
| RF-09 | Confirmar la recepción en piso | `/piso/recepcion` | Enfermería | Pulse Confirmar recepción. El estado debe decir que el paciente quedó ingresado. |
| RF-10 | Registrar una discrepancia de lecho | `/piso/reubicacion` | Enfermería | Sin motivo, habitación o lecho, cada campo muestra su error. Al completarlos, la central queda notificada con la habitación y el lecho pedidos. |
| RF-11 | Registrar la valoración inicial | `/enfermeria/valoracion` | Enfermería | Sin motivo de consulta no se envía. Con motivo y al menos una alergia agregada, el aviso confirma que la valoración quedó registrada. |
| RF-12 | Registrar constantes y calcular NEWS2 | `/enfermeria/constantes` | Enfermería | Una saturación imposible (por ejemplo 20) se rechaza antes de enviar, con texto junto al campo. Con FR 16, SpO2 98, PA 120, pulso 72 y 36.8 °C el NEWS2 queda en 0 y el texto dice riesgo bajo, no solo un color. |
| RF-13 | Conciliar medicamentos domiciliarios | `/enfermeria/conciliacion` | Enfermería | Agregue alergia Penicilina y medicamento Amoxicilina 500 mg cada 8 horas, vía oral. Debe verse la dosis, la vía y una alerta de posible alergia, y el estado «Con observaciones». Sin alerta, el estado queda validada. |
| RF-14 | Completar escalas de caídas y úlceras | `/enfermeria/riesgos` | Enfermería | Morse y Braden muestran puntaje, nivel escrito y una recomendación. Un valor de fricción fuera de 1 a 3 no se registra. |
| RF-15 | Consultar el Kardex de ingreso | `/enfermeria/kardex` | Enfermería | La pantalla resume valoración, alergias, medicamentos, constantes, NEWS2 y riesgos. No debe decir que el documento es de prueba. |
| RF-16 | Revisar y firmar indicaciones basales | `/medico/indicaciones` | Médico | Se listan las indicaciones y el estado pendiente de firma. Sin nombre, colegiatura o confirmación no firma. Con esos datos, el estado pasa a firmado. |

La interfaz no muestra códigos como RF-01. Si aparece un identificador de requisito, un aviso de simulación o un error en inglés, la revisión no pasa.

## Datos de prueba

Úselos solo en esta revisión. No están anunciados en la interfaz.

| Uso | Valor | Qué debe ocurrir |
|---|---|---|
| Orden con cobertura aprobada | `OI-2026-0001` | Ana María Quispe Rojas, SIS aprobada |
| Orden pendiente | `OI-2026-0002` | Luis Ernesto Paredes, EsSalud pendiente |
| Orden rechazada | `OI-2026-0003` | Carmen Yolanda Vega, cobertura rechazada |
| Traslado | `OT-2026-0001` | Habitación 312, lecho B |
| Brazalete | `BRZ-0001-ANA` | Identidad de Ana María Quispe Rojas |
| Expediente / encuentro | `EXP-0001` / `ENC-0001` | Brazalete, recepción, Kardex e indicaciones |

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

El selector de rol es una sesión del navegador. No cumple todavía el control de acceso de RNF-08 ni el cierre por inactividad de RNF-09.

## Cálculos clínicos

NEWS2 sigue la chart 1 del Royal College of Physicians (2017), incluidas la escala 2 de SpO2 y la confusión crónica sin puntuación. La banda visual del proyecto (RNF-15) es verde en 0, amarilla en 1 a 6 y roja desde 7. Una puntuación de 3 en un solo parámetro añade texto de revisión urgente. El cálculo no dispara el flujo de alertas de los módulos 2 y 3.

Morse usa los cortes de cuidado agudo 0-24, 25-44 y 45 o más. Braden usa 19-23, 15-18, 13-14, 10-12 y 9 o menos. La fricción solo admite 1 a 3. El mismo algoritmo está en TypeScript y PHP.

La conciliación aplica reglas locales de alergia e interacción. No es una base farmacológica completa.

## Rutas API

Prefijo `/api/v1/hospital-admission`. Las respuestas no incluyen un aviso de simulación. Un error de validación o un fallo inesperado llega en español.

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

## Pendiente

- Persistencia y modelos clínicos.
- Autenticación, roles reales y cierre por inactividad.
- Firma criptográfica, impresión del brazalete e integración con un lector.
- Integraciones HIS, cobertura y central de camas.
- Proceso de alertas, escalamiento y monitoreo programado a partir del NEWS2.
