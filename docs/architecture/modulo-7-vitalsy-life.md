# Módulo 7 — Vitalsy Life (app móvil)

Cliente ciudadano en `movil`. La integración con Vitalsy Clinical (backend Laravel y web) está definida en [contrato-clinical-life.md](contrato-clinical-life.md). Life es software de bienestar: compara lecturas con la línea de base personal y no calcula NEWS2 ni emite diagnósticos.

## Flujo

1. La persona crea una cuenta local o entra con correo y contraseña.
2. En Dispositivos, Android pide permisos de lectura a Health Connect.
3. Hoy y Tendencias muestran solo lecturas reales (Health Connect o registro manual).
4. Con menos de 7 días de historia útil, la línea de base queda en construcción.
5. El rango personal es el percentil 10–90 de esa historia, sin contar las 3 lecturas más recientes. Tres lecturas seguidas fuera de ese rango en pulso, SpO2, HRV o temperatura generan un aviso preventivo.
6. Pasos bajos o sueño corto generan un hábito, no una alerta clínica.
7. Sin red, las lecturas siguen en el teléfono. Si `EXPO_PUBLIC_API_URL` responde, la cola se envía. Si no hay servidor, el estado visible es «En el teléfono», nunca «Sincronizado».
8. Privacidad nace cerrada. El código `VL-XXXX-XXXX` solo existe con la compartición activa. Revocar lo invalida.
9. El plan post-alta se activa con un QR JSON o con la respuesta del servidor. Un código opaco sin servidor no inventa medicación.

## Contrato con Clinical

Life emite el código de vinculación (RF-94). Clinical lo consume en admisión (RF-95); esa lectura no está en la app. El detalle de endpoints, errores y TTL está en [contrato-clinical-life.md](contrato-clinical-life.md).

Clinical emite el QR de alta (RF-96). Life lo acepta así:

- JSON con `medications` (`name`, `dose`, `schedule` `HH:mm`), `comfortSigns`, `homeCare` y `validUntil`, o
- un código opaco que el servidor resuelve en `GET {EXPO_PUBLIC_API_URL}/api/v1/life/discharge-plans/{code}`.

La ingesta sale por `POST {EXPO_PUBLIC_API_URL}/api/v1/life/sync` con `{ items: [{ id, kind, body, status }] }`. Todas las llamadas (salvo registro e inicio de sesión) llevan `Authorization: Bearer <token>` de la cuenta Life; la app rechaza URLs `http` fuera de desarrollo. La respuesta `{ accepted, rejected }` es la única fuente de verdad: un item pasa a `synced` solo si su `id` está en `accepted`; los `rejected` quedan en estado terminal `rejected` (no se reintentan) y cualquier otro fallo (sin red, 401, 422 `batch_too_large`, 5xx) los deja `pending`. La cola se envía en lotes de hasta 100 items y 1 000 000 de caracteres. Un 401 borra el token guardado. La app no simula una respuesta correcta si el servidor no responde.

## Salud

| Origen | Plataforma | Comportamiento |
|---|---|---|
| Health Connect | Android, development build | Lectura real de los tipos autorizados |
| Apple Health | iOS, development build | Lectura de solo lectura con `@kingstinct/react-native-healthkit` (frecuencia cardíaca, reposo, HRV SDNN, SpO2, pasos, sueño, temperatura corporal). Sin development build (Expo Go) queda «no disponible». Por verificar en dispositivo |
| Manual | Ambas | Pulso y SpO2 validados en el teléfono |

Tipos de Health Connect: frecuencia cardíaca, pulso en reposo, HRV, SpO2, pasos, sueño, temperatura cutánea y corporal. Solo lectura.

Apple Health lee los mismos tipos salvo temperatura cutánea (HealthKit solo expone la temperatura de muñeca durante el sueño y no se usa en este corte); la HRV es SDNN, no RMSSD. Solo lectura: `NSHealthShareUsageDescription` sin descripción de escritura.



## Calidad

Las reglas de dominio tienen pruebas Jest antes de la interfaz. El cifrado local es AES-256-GCM. Los permisos de Health Connect son de lectura. No hay certificación ISO; el diseño sigue la intención de ISO/IEC 25010 (idoneidad, fiabilidad offline, usabilidad, seguridad, mantenibilidad), ISO/IEC/IEEE 29119-1 (prueba de dominio, de componente y manual del development build), ISO 27001 (mínimo privilegio y consentimiento revocable) e ISO 9001 (requisito trazado a pantalla y prueba).

## Cómo probar

La guía operativa está en `movil/documento.md`.
