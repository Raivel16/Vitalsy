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

## Banda Vitalsy por Bluetooth LE (RF-113)

Hoy es un prototipo: un ESP32-C3 SuperMini con un sensor MAX30102. Más adelante será una banda wearable propia, y la app la tratará como fuente principal; Health Connect y Apple Health quedan como fuentes adicionales. El ESP32-C3 solo tiene BLE, sin Bluetooth clásico.

- **Contrato:** [protocolo-banda-ble.md](protocolo-banda-ble.md). Usa los perfiles estándar Heart Rate (`0x180D`) y Pulse Oximeter (`0x1822`), Device Information y un servicio propio de Vitalsy con el estado de la medida y los comandos.
- **Seguridad:** vinculación con LE Secure Connections. Las medidas solo viajan por un enlace cifrado. El prototipo usa «Just Works» y la banda final usará un PIN fijo.
- **Firmware:** vive en `firmware-esp32c3/`, en la raíz, con su propio repositorio Git local que no se sube (está en `.gitignore`). El algoritmo de pulso y SpO2 está en un módulo aparte (`Oximetro.h/.cpp`), sin dependencias del hardware ni del transporte.
- **Estado:** el firmware está hecho (fase F1) y se prueba con nRF Connect. La app aún no lo usa; ese trabajo es la fase F2.
- **Plan de la app (F2):**
  - `react-native-ble-manager`, por su nueva arquitectura y su config plugin; por verificar con Expo 57 y React Native 0.86. Alternativa: `react-native-ble-nitro`.
  - Permisos `BLUETOOTH_SCAN` (`neverForLocation`) y `BLUETOOTH_CONNECT`, y `NSBluetoothAlwaysUsageDescription` en iOS.
  - Módulo `src/modules/band/`: lectores puros de `0x2A37`, `0x2A5F` y SFLOAT, más la HRV (RMSSD) a partir de los RR, con pruebas Jest primero.
  - `BandSource`, que implementa `HealthDataSource` con lecturas agregadas por minuto e id determinista.
  - Varias fuentes en `createHealthSource`.
  - Origen `vitalsy_band` en la app y en `LifeSync::ORIGINS`.
  - Tarjeta «Vitalsy Band» en Perfil › Dispositivos.
- **Después:**
  - F3: la banda guarda lecturas con hora, la app las descarga al reconectar y Android usa un servicio en primer plano `connectedDevice`. Debe respetar RNF-19 (como mucho un 5 % de batería al día).
  - F4: hardware wearable (batería, ahorro de energía, acelerómetro, actualización por BLE).
- **Límite:** el sensor no está validado clínicamente. Según RNF-10, sus lecturas son de bienestar y Clinical debe mostrar su origen.



## Calidad

Las reglas de dominio tienen pruebas Jest antes de la interfaz. El cifrado local es AES-256-GCM. Los permisos de Health Connect son de lectura. No hay certificación ISO; el diseño sigue la intención de ISO/IEC 25010 (idoneidad, fiabilidad offline, usabilidad, seguridad, mantenibilidad), ISO/IEC/IEEE 29119-1 (prueba de dominio, de componente y manual del development build), ISO 27001 (mínimo privilegio y consentimiento revocable) e ISO 9001 (requisito trazado a pantalla y prueba).

## Cómo probar

La guía operativa está en `movil/documento.md`.

## Integridad de la lectura en segundo plano

- **Permisos ampliados a propósito:** `HealthConnectSource.ts` y `plugins/withHealthConnectPermissions.js` se extendieron para la lectura en segundo plano (`READ_HEALTH_DATA_IN_BACKGROUND` y la solicitud `BackgroundAccessPermission`, soportada por `react-native-health-connect@4.1.3`). Esa solicitud se hace una sola vez por cuenta (`healthSync.backgroundAccessRequested`), no en cada lectura.
- **Sin pérdida silenciosa:** la lectura pagina con `pageToken` (tope de seguridad de 50 páginas por tipo). Si un tipo requerido falla, o todos, la lectura se marca `failed` y `lastReadAt` no avanza; la ventana se relee (el id determinista deduplica). Con el dispositivo bloqueado HealthKit rechaza las consultas: se trata igual, como fallida y sin avanzar la ventana.
- **Cuenta y token:** el token se guarda junto con el id de la cuenta; en un arranque en frío la tarea solo actúa si `sessionUserId` de la instantánea coincide con la cuenta del token y no hay una marca durable de «cambio de cuenta en curso». Un token sin cuenta (versiones anteriores) se trata como no vinculado y la tarea no hace nada.
- **Escritores concurrentes:** la tarea en frío escribe con `persistence.update` (lee-modifica-escribe en una transacción exclusiva de SQLite) sobre lo último guardado y nunca sobrescribe la instantánea completa. Limitación: la app en primer plano sigue guardando su instantánea completa; si la tarea corrió en otro contexto JS, la app puede reescribir esas lecturas, que se vuelven a leer y deduplican por id.
- **Estado por cuenta:** `healthSync` (permiso, última lectura, permiso de fondo solicitado) se reinicia al cerrar sesión y al cambiar de cuenta.
- **Sueño HealthKit:** el id es `hk:sleep:<día en que termina la noche>`; si la noche crece, la muestra nueva reemplaza a la anterior (local) y se reenvía con el mismo id. Por verificar: que el servidor trate el reenvío con el mismo id como reemplazo y no como duplicado.
- La tarea en frío no reintenta revocaciones pendientes ni trae avisos: eso lo hace la sincronización del primer plano.


## Cierre de la integración Clinical-Life (RF-89–98)

El recorrido completo está cubierto por `backend/api/tests/Feature/LifeEndToEndTest.php`: registro ciudadano, consentimiento, sincronización de biometría, código de vinculación, importación en admisión, plan de alta, salida efectiva con custodia y reclamo del plan por el ciudadano. Las peticiones de API para `life/*`, admisión y alta están en `docs/api/yaak-vitalsy-life.postman_collection.json`.

No verificado en ejecución: app móvil real contra un servidor desplegado, Reverb/wss y latencias en staging.
