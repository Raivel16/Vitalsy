# Vitalsy Life

App ciudadana de bienestar (Expo, React Native, TypeScript). No es el cliente hospitalario de Vitalsy Clinical.

## Estructura

- `src/app` — rutas de Expo Router. Pestañas: Hoy, Tendencias, Plan, Privacidad, Perfil.
- `src/modules` — dominio por proceso: auth, health-sync, today, trends, notices, plan, privacy, profile, life.
- `src/shared` — tema Aire cotidiano, componentes, cifrado, cliente HTTP y SQLite.
- `plugins/withHealthConnectPermissions.js` — permisos de lectura en el manifiesto Android.

## Dependencias principales

Expo SDK 57, expo-router, expo-dev-client, expo-sqlite, expo-secure-store, react-native-health-connect, react-native-svg, @noble/ciphers, @noble/hashes.

## Comandos

```bash
cd services/movil
npm install
npm test
npx expo start
npx expo run:android
```

`npx expo start` abre la interfaz. Health Connect solo responde en el development build de `npx expo run:android`.

## Configuración

Copia `.env.example` a `.env`. `EXPO_PUBLIC_API_URL` es opcional. Sin esa URL la app no marca una sincronización con la nube.

## Health Connect

Permisos de solo lectura: pulso, pulso en reposo, variabilidad, SpO2, pasos, sueño, temperatura cutánea y corporal.

La guía de prueba, con el detalle de cuándo la lectura real funciona, está en [documento.md](documento.md). La arquitectura y el contrato con Clinical están en `docs/architecture/modulo-7-vitalsy-life.md`.

## Limitaciones

- Expo Go no incluye Health Connect.
- iOS no lee Apple Health en este corte.
- No hay endpoints Life en el API Laravel de este repositorio.
- El SMS al cuidador se abre para confirmarlo; no sale en segundo plano.
