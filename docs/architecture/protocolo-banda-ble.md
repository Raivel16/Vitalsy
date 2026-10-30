# Protocolo BLE de la banda Vitalsy (firmware 0.1.0)

Contrato entre el firmware del ESP32-C3 y la app Vitalsy Life (RF-113). Este documento es la fuente de verdad: el firmware vive en `firmware-esp32c3/`, que no se versiona en GitHub. Si cambias un formato, sube `VERSION_ESTADO` o la versión de firmware y actualiza este documento.

## Anuncio

- Nombre: `Vitalsy-XXXX`, donde `XXXX` son los dos últimos bytes de la MAC.
- Servicios anunciados: `0x180D` (Heart Rate) y `0x1822` (Pulse Oximeter). La app filtra el escaneo por estos UUID y por el prefijo `Vitalsy-`.
- Apariencia: `0x0C41`, que corresponde a un oxímetro de dedo.

## Seguridad

- Vinculación (bonding) con LE Secure Connections, sin código ("Just Works"). Es lo acordado para el prototipo; la banda final usará un PIN fijo.
- Al conectar, la banda pide el cifrado. Android muestra el diálogo de vinculación la primera vez.
- Si el cifrado falla, la banda desconecta.
- **Ninguna medida se envía por un enlace sin cifrar.** El estado y el control de Vitalsy exigen cifrado.

## Servicios y características

| Servicio | Característica | Propiedades | Contenido |
|---|---|---|---|
| `180D` Heart Rate | `2A37` Heart Rate Measurement | notify | Pulso + intervalos RR (ver abajo) |
| | `2A38` Body Sensor Location | read | `0x03` (dedo) |
| `1822` Pulse Oximeter | `2A5F` PLX Continuous Measurement | notify | SpO2, pulso, estado, PI |
| | `2A60` PLX Features | read | `43 00 60 40 70 03 00` |
| `180A` Device Information | `2A29` / `2A24` / `2A25` / `2A26` | read | Fabricante, modelo, serie (MAC), firmware |
| `64af0001-a30d-4655-b91b-f915f0447e63` Vitalsy | `64af0002-…` Estado | read (cifrado), notify | Estado de la medida |
| | `64af0003-…` Control | write (cifrado) | Comandos |

Todos los enteros van en little-endian. Cada notificación sale una vez por segundo.

### `2A37` Heart Rate Measurement

Se envía solo mientras la banda mide **y** hay pulso, es decir, al menos 4 intervalos válidos.

| Byte | Campo |
|---|---|
| 0 | Flags: `0x04` contacto soportado, `0x02` contacto detectado, `0x10` hay RR |
| 1 | Pulso (uint8, BPM) |
| 2… | 0 a 8 intervalos RR (uint16, unidades de 1/1024 s), los aceptados desde la notificación anterior |

Ejemplo: 72 BPM con un RR de 833 ms → `16 48 55 03`.

La app calcula la HRV (RMSSD) con los RR.

### `2A5F` PLX Continuous Measurement

Se envía mientras la banda mide y hay pulso o SpO2. Siempre ocupa 12 bytes.

| Bytes | Campo |
|---|---|
| 0 | Flags `0x1C`: hay estado de medida, estado del sensor e índice de amplitud |
| 1-2 | SpO2 (%), en SFLOAT. `0x07FF` = no disponible |
| 3-4 | Pulso (BPM), en SFLOAT. `0x07FF` = no disponible |
| 5-6 | Estado de la medida (uint16) |
| 7-9 | Estado del dispositivo y sensor (24 bits) |
| 10-11 | PI (%), en SFLOAT con exponente −2 |

SFLOAT (IEEE 11073): los 4 bits altos son el exponente con signo y los 12 bajos la mantisa con signo; el valor es `mantisa × 10^exponente`.

Correspondencia entre la calidad de la señal y los bits de estado:

| Calidad del firmware | Estado de medida | Estado del sensor |
|---|---|---|
| Estabilizando / Buscando latidos | `0x0020` en curso + `0x0040` estimada | `0x000200` analizando |
| Movimiento | `0x0020` + `0x4000` dudosa | `0x000040` señal errática |
| Señal débil | `0x0020` + `0x4000` | `0x000030` baja perfusión + señal pobre |
| Ritmo inestable | `0x0020` + `0x4000` | `0x000100` pulso dudoso |
| Señal buena | `0x0020` | `0x000000` |

Ejemplo: SpO2 98 %, 72 BPM, señal buena, PI 2,35 % → `1C 62 00 48 00 20 00 00 00 00 EB E0`.

**La app solo debe guardar lecturas sin el bit `0x4000` ni `0x0040`.** Lo mismo se puede saber por la calidad `5` de la característica de estado.

### `64af0002` Estado (Vitalsy)

Se notifica cada segundo, también sin dedo, para que la app muestre en qué está la banda. Ocupa 8 bytes:

| Byte | Campo |
|---|---|
| 0 | Versión del formato (`1`) |
| 1 | Estado: `0` sin dedo, `1` ajustando brillo, `2` midiendo |
| 2 | Calidad (solo si mide, si no `0xFF`): `0` estabilizando, `1` movimiento, `2` señal débil, `3` ritmo inestable, `4` buscando latidos, `5` señal buena |
| 3 | Flags: `0x01` canales rojo/IR intercambiados, `0x02` aviso "R muy alto" |
| 4-5 | PI × 100 (uint16) |
| 6-7 | R × 100 (uint16, `0` si aún no hay) |

Ejemplo: midiendo, señal buena, PI 2,35 %, R 0,55 → `01 02 05 00 EB 00 37 00`.

### `64af0003` Control (Vitalsy)

Se escribe 1 byte:

| Valor | Acción | Equivale por serie a |
|---|---|---|
| `0x01` | Intercambiar los canales rojo/IR | `s` |
| `0x02` | Prueba de LEDs: 10 s; durante la prueba no se mide | `l` |

Cualquier otro valor o longitud se ignora.

## Probar sin la app

1. Instala **nRF Connect for Mobile** (Nordic) en el teléfono.
2. Escanea, conecta a `Vitalsy-XXXX` y acepta la vinculación.
3. Activa las notificaciones de `Heart Rate Measurement` y `PLX Continuous Measurement`. nRF Connect decodifica ambos formatos estándar.
4. Compara los valores con el monitor serie (115200). Deben coincidir con las líneas `Pulso: … | SpO2: …`.
