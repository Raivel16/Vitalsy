# Protocolo BLE de la banda Vitalsy (firmware 0.2.0)

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
| `180F` Battery | `2A19` Battery Level | read, notify | % de batería. **Solo existe si el firmware tiene `PIN_BATERIA`** |
| `64af0001-a30d-4655-b91b-f915f0447e63` Vitalsy | `64af0002-…` Estado | read (cifrado), notify | Estado de la medida |
| | `64af0003-…` Control | write (cifrado) | Comandos |
| | `64af0004-…` Historial | notify | Registros por minuto |

Todos los enteros van en little-endian. Las medidas se notifican una vez por segundo; la batería, una vez por minuto.

### `2A37` Heart Rate Measurement

Se envía solo mientras la banda mide **y** hay pulso, es decir, al menos 4 intervalos válidos.

| Byte | Campo |
|---|---|
| 0 | Flags: `0x04` contacto soportado, `0x02` contacto detectado, `0x10` hay RR |
| 1 | Pulso (uint8, BPM) |
| 2… | 0 a 8 intervalos RR (uint16, unidades de 1/1024 s), los aceptados desde la notificación anterior |

Ejemplo: 72 BPM con un RR de 833 ms → `16 48 55 03`.

La HRV (RMSSD) que se guarda la calcula la banda por minuto (ver Historial); los RR quedan para otros usos.

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

Una lectura con el bit `0x4000` o `0x0040` no es fiable. La app no guarda las notificaciones en vivo: guarda el historial por minuto, que la banda ya calcula solo con segundos de «Señal buena».

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

Comandos de 1 byte, o de 5 bytes (código + uint32):

| Bytes | Acción | Equivale por serie a |
|---|---|---|
| `01` | Intercambiar los canales rojo/IR | `s` |
| `02` | Prueba de LEDs: 10 s; durante la prueba no se mide | `l` |
| `03` + uint32 | Fijar la hora: segundos de época Unix en UTC. La app lo envía al conectar | — |
| `04` + uint32 | Enviar el historial desde ese minuto (época / 60) | — |
| `05` + uint32 | Borrar el historial hasta ese minuto, incluido. La app lo envía **después** de guardar | — |

Cualquier otro valor o longitud se ignora. Los comandos se encolan (hasta 8) y se ejecutan en el bucle principal, no en la tarea de Bluetooth.

Ejemplo: fijar la hora 2026-10-30 12:00:00 UTC → `03 C0 86 E4 6A`.

### `64af0004` Historial (Vitalsy)

La banda no tiene reloj propio. Sin la hora de la app no guarda nada. Con hora, al terminar cada minuto guarda un registro si tuvo al menos 10 segundos de «Señal buena»:

| Bytes | Campo |
|---|---|
| 0-3 | Minuto (uint32, segundos de época UTC / 60) |
| 4 | Pulso: mediana de los segundos buenos (uint8, BPM; `0` = sin dato) |
| 5 | SpO2: mediana de los segundos buenos (uint8, %; `0` = sin dato) |
| 6-7 | HRV RMSSD (uint16, ms; `0xFFFF` = sin dato). Necesita al menos 10 diferencias entre intervalos RR contiguos con señal buena |

Cada notificación es `[n]` seguido de n registros de 8 bytes (n ≤ 2, para caber en el MTU mínimo). `n = 0` marca el fin de una descarga.

- **Descarga:** la app escribe `04` + minuto, la banda envía los fragmentos cada 20 ms y termina con `00`.
- **En vivo:** con la app conectada, cada minuto cerrado se envía solo, como `[1]` + registro.
- **Confirmación:** la app guarda los registros y escribe `05` + último minuto; entonces la banda los borra. Si la app no confirma, se vuelven a enviar en la siguiente descarga. La app deduplica por id, que es `vb:<8 hex del dispositivo>:<tipo>:<minuto>`.
- **Capacidad:** 1440 minutos (24 h) en RAM. Si se llena, se pierde el más antiguo. **Al apagarse o reiniciarse la banda se pierde lo no descargado.**

Ejemplo: minuto 29 889 360, 72 BPM, 98 %, RMSSD 42 ms → `01 50 13 C8 01 48 62 2A 00`.

### `2A19` Battery Level

Solo con hardware de batería (F4): una LiPo de 1 celda con un divisor resistivo hacia un pin ADC, configurado en `Bateria.h` (`PIN_BATERIA`, `DIVISOR_BATERIA`). El porcentaje sale de una curva típica de LiPo, de 3,3 V (0 %) a 4,2 V (100 %).

## Probar sin la app

1. Instala **nRF Connect for Mobile** (Nordic) en el teléfono.
2. Escanea, conecta a `Vitalsy-XXXX` y acepta la vinculación.
3. Activa las notificaciones de `Heart Rate Measurement` y `PLX Continuous Measurement`. nRF Connect decodifica ambos formatos estándar.
4. Compara los valores con el monitor serie (115200). Deben coincidir con las líneas `Pulso: … | SpO2: …`.
5. Historial: escribe en `64af0003` el valor `03` seguido de la hora actual en uint32 little-endian, activa las notificaciones de `64af0004` y espera un minuto con el dedo quieto. Debe llegar `01 …`. Para descargar todo, escribe `04 00 00 00 00`.
