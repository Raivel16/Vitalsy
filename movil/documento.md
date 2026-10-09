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
2. El teléfono o emulador es **Android**. En iOS esta versión no lee Apple Health.
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

## Limitaciones

- No hay API Laravel de Life en este repositorio. La cola espera un `POST /api/life/sync` que todavía no existe.
- Apple Health queda detrás del mismo puerto, sin lector en este corte.
- El aviso al cuidador abre el SMS; no se envía oculto.
- La lectura de Health Connect ocurre al abrir Hoy, al pulsar sincronizar y al recuperar la red. No hay un sondeo continuo.
