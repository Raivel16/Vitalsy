# Qué tienes que hacer para probar Vitalsy Life

La app está en `services/movil`. Las cifras de los mockups (Elena, 64 lpm, Paracetamol) no vienen cargadas. Si no hay lecturas, Hoy queda vacío.

## 1. Instalar

Desde la raíz del repo:

```bash
cd services/movil
npm install
```

Copia el entorno si vas a apuntar a un servidor. Si lo dejas vacío, la app funciona en el teléfono y no dirá que sincronizó con la nube.

```bash
cp .env.example .env
```

## 2. Arrancar la interfaz sin Health Connect

Esto sirve para recorrer cuenta, privacidad, plan y estados vacíos. **No lee Health Connect.**

```bash
npx expo start
```

En Expo Go verás la navegación, el login local, el aviso de que Health Connect no está disponible dentro de Expo Go y el formulario de lectura manual. Eso es esperado.

## 3. Health Connect: sí funciona, con estas condiciones

La integración es real (`react-native-health-connect`). No hay datos simulados.

Funciona cuando se cumplen todas:

1. Compilas un **development build**, no Expo Go. Health Connect es código nativo y Expo Go no lo incluye.
2. El teléfono o emulador es **Android** (Health Connect) o un **iPhone con development build** (Apple Health). Expo Go no incluye ninguno de los dos módulos nativos.
3. **Health Connect está instalado.** En Android 14 o superior viene con el sistema. En Android 9 a 13 hay que instalar «Health Connect» de Google Play. La app, si falta, abre la ficha de Play Store y no se cierra.
4. Aceptas los permisos de **lectura** (pulso, reposo, variabilidad, SpO2, pasos, sueño, temperatura). Si los niegas, verás el aviso y podrás seguir con una lectura manual.
5. Otra app ya escribió esos datos en Health Connect. Mi Fitness, Samsung Health u otra app compatible no entregan nada a Vitalsy hasta que sincronicen con Health Connect. Vitalsy solo lee lo que Health Connect tenga y lo que hayas autorizado.

No funciona, y la app debe seguir abierta, si:

- abres el proyecto con Expo Go;
- Health Connect no está instalado;
- negaste permisos;
- Health Connect no tiene registros de ese tipo;
- la lectura del sistema falla.

En esos casos el mensaje aparece en Hoy o en Dispositivos. No verás un pulso de ejemplo.

### Compilar el development build

Hace falta Android Studio o un teléfono con depuración USB, y el SDK de Android.

```bash
cd services/movil
npx expo run:android
```

La primera vez genera las carpetas nativas, pide los permisos del manifiesto y instala la app `life.vitalsy.app`.

Después:

1. En el teléfono, abre Mi Fitness (u otra app) y sincroniza con Health Connect.
2. Abre Vitalsy Life, entra a Perfil → Dispositivos y sincronización → Conectar.
3. Acepta la lectura.
4. Pulsa Sincronizar ahora.
5. Vuelve a Hoy. Si Health Connect tenía pulso, SpO2, sueño o pasos de los últimos 30 días, aparecen. Si no tenía, el texto dice que no hay lecturas.

La línea de base personal pide 7 días de historia. Con menos días verás la cifra y el texto «Línea de base en construcción». No hay aviso de desviación hasta completar esa historia.

## 4. Recorrido funcional

1. Crear cuenta. La contraseña queda hasheada en el teléfono. «¿Olvidaste tu contraseña?» explica que no se envía un correo.
2. Hoy vacío → lectura manual de pulso o SpO2. Un valor fuera de rango muestra el error y no se guarda.
3. Activa el modo avión: el banner de sin conexión aparece y la lectura sigue visible. El chip no dice «Sincronizado» si no hay servidor.
4. Privacidad: el interruptor nace apagado. Generar QR sin activarlo muestra el aviso. Al activarlo, el código `VL-…` se puede compartir. Revocar lo borra.
5. Plan: vacío hasta pegar un QR con este JSON, o hasta que el servidor responda:

```json
{
  "medications": [{ "name": "Paracetamol", "dose": "1 g", "schedule": "08:00" }],
  "comfortSigns": ["Reposo si te sientes cansado"],
  "homeCare": ["Caminar dentro de casa"],
  "validUntil": "2026-10-20T00:00:00.000Z"
}
```

Un código suelto como `ALTA-2026-8841`, sin servidor, muestra error y no crea un plan.
6. En la toma puedes confirmar o posponer. Si aceptas notificaciones, se programa un recordatorio.
7. Contacto de emergencia: se guarda en el teléfono. El SMS al cuidador se abre para que lo confirmes; Android no deja enviarlo solo en segundo plano.

## 5. Pruebas automáticas

```bash
cd services/movil
npm test
```

Cubren línea de base, avisos, cola offline, consentimiento, plan, mapeo de Health Connect, cifrado y alertas de formularios. No sustituyen el development build: el teléfono real no entra en esas pruebas.

## Servidor en LAN durante desarrollo

- `http://` solo se acepta en un development build (`__DEV__`); en una build de producción `apiBaseUrl()` rechaza cualquier URL que no sea `https://`.
- Para probar contra el backend local, define `EXPO_PUBLIC_API_URL=http://<ip-lan>:8080` (Nginx del docker compose).
- Por verificar: Android bloquea tráfico HTTP en claro por defecto y `app.json` solo configura `minSdkVersion` en `expo-build-properties`. Es probable que el dev client necesite `android.usesCleartextTraffic: true` en ese plugin (solo para desarrollo); confirmarlo en un dispositivo antes de documentarlo como requisito.
- Si `expo-secure-store` no está disponible, el token solo vive en memoria (`tokenStore.persistent === false`) y se pierde al cerrar la app.

## Limitaciones

- La nube usa `/api/v1/life/*` con token Sanctum (cuenta Life, guardado en `expo-secure-store`). Sin token o sin https (fuera de desarrollo) la cola se queda pendiente. La sincronización marca `synced` solo los ids de `accepted` (y «Sincronizado» solo aparece si el servidor aceptó al menos un item); los de `rejected` pasan a `rejected` y no se reintentan; un 422 o un fallo de red los deja pendientes. El envío se parte en lotes de hasta 100 items y 1 000 000 de caracteres.
- Apple Health se lee con `@kingstinct/react-native-healthkit` (solo lectura, sin temperatura cutánea). No se ha probado en un iPhone real: por verificar en dispositivo.
- El aviso al cuidador abre el SMS; no se envía oculto.
- La lectura ocurre al abrir Hoy, al pulsar sincronizar, al recuperar la red y en una tarea de segundo plano (`expo-background-task`, mínimo 15 min, solo deltas). No hay un sondeo continuo.

## Segundo plano y batería (RNF-19, por verificar en dispositivo)

Estado: implementado y probado con fakes; **no verificado en un dispositivo**. Criterio RNF-19: la app consume ≤5 % de batería al día.

Diseño: sin sondeo; una tarea de `expo-background-task` con intervalo mínimo de 15 minutos (el sistema operativo la ejecuta cuando quiere) que lee solo lo nuevo desde la última lectura (primera lectura limitada a 14 días) y no hace nada sin sesión, sin permiso o sin API.

Procedimiento manual (development build, `eas build --profile development`):
1. Instala el build en un teléfono real (iPhone con Apple Health o Android con Health Connect y datos), inicia sesión y concede la lectura en Dispositivos.
2. Android: `adb shell dumpsys batterystats --reset`, usa el teléfono normalmente 24 h con la app en segundo plano, luego `adb shell dumpsys batterystats com.vitalsy.life` y compara el consumo de la app con el total. iOS: Ajustes > Batería > últimas 24 h, porcentaje de Vitalsy Life.
3. Forzar la tarea: Android `adb shell cmd jobscheduler run -f <paquete> <jobId>`; iOS, en Xcode pausa y ejecuta `e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.expo.modules.backgroundtask.processing"]`. Verifica que llegan muestras nuevas sin duplicados y que sin sesión no hace nada.
4. Umbrales esperados: ≤5 % del consumo total en 24 h; cada ejecución de la tarea de segundos y sin diálogos. Registra el resultado aquí cuando se mida.

Notas de integridad (por verificar en dispositivo): una lectura fallida (permiso de segundo plano ausente, HealthKit con el teléfono bloqueado, más de 50 páginas) no avanza la ventana de lectura y se repite en la siguiente ejecución. El permiso de segundo plano de Health Connect se solicita una sola vez por cuenta. `movil/package-lock.json` se refrescó con `npm install --package-lock-only`; hay que correr `npm install` antes de un build de EAS para instalar los módulos nativos nuevos. `react-native-nitro-modules` queda fijado en 0.35.0 (el mínimo que exige la librería de HealthKit).
