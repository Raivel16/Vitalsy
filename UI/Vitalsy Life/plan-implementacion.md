# Plan de implementación — Vitalsy Life (app móvil Expo)

**Estado:** pendiente de aprobación del usuario antes de generar el proyecto Expo o escribir lógica de producto.  
**Referencia visual:** `UI/Vitalsy Life/`  
**Inventario:** `UI/Vitalsy Life/inventario-de-interfaces.md`  
**Ubicación del código (nueva):** `services/movil/`  
**Backend compartido (previsto):** `services/backend/` (Laravel) + APIs nuevas Life / conector transversal

Fecha: 2026-09-29

---

## 1. Objetivo

Construir la app ciudadana **Vitalsy Life** con **Expo (React Native)**:

- Monitoreo pasivo vs **línea de base intra-individual** (RF-89–92).
- Nudging y avisos preventivos **no diagnósticos** (RF-91).
- Soberanía de datos + QR de vinculación a Clinical (RF-93–94).
- Onboarding / plan post-alta (RF-96–98).
- Design system **Aire cotidiano** + Wordmark Integral + tab bar fija.

La app debe obtener biometría desde:

| Plataforma | Fuente | RF |
|---|---|---|
| **Android** | **Health Connect** | 89, 92 |
| **iOS** | Apple HealthKit | 89, 92 |
| Ambos | API REST propia (sync servidor, plan post-alta, consentimientos) | 89–98 |

---

## 2. Ubicación en el monorepo

```
services/
  backend/     # Laravel (Clinical + futuros endpoints Life)
  frontend/    # Vitalsy Clinical (web)
  movil/       # Vitalsy Life — Expo React Native  ? NUEVO
```

Nombre de carpeta elegido: **`services/movil`** (alineado al monorepo `services/*`).

En esta carpeta, **tras aprobar el plan**, se ejecutará:

```bash
cd services/movil
npx create-expo-app@latest . --template blank-typescript
```

(ajustar flags según versión Expo vigente; TypeScript obligatorio).

Reservado desde ya: `services/movil/README.md` (placeholder hasta el `create-expo-app`).

---

## 3. Alcance

### Incluye

- Scaffold Expo + TypeScript + estructura Screaming Architecture (módulos por dominio Life).
- Shell: splash, auth, tab navigator (`Hoy | Tendencias | Plan | Privacidad | Perfil`).
- Design tokens Aire cotidiano + logo Wordmark Integral.
- Integración **Health Connect (Android)** para lectura de: frecuencia cardíaca, SpO? (si disponible), pasos/actividad, sueño, (y según permisos) temperatura / otros soportados.
- Abstracción de salud multiplataforma: Health Connect (Android) + HealthKit (iOS) detrás de un puerto `HealthDataSource`.
- Cola offline local + sincronización al recuperar red (RF-92).
- Pantallas del inventario (UI según mockups).
- Cliente HTTP hacia backend Vitalsy (auth ciudadano, baseline, consentimientos, plan post-alta, QR).
- Pruebas: Jest / RNTL (o Vitest si el template lo permite) en dominio y componentes críticos; TDD según reglas del repo.

### No incluye (fase posterior o Clinical)

- Reemplazar Clinical web.
- Diagnóstico médico / NEWS2 hospitalario en la UI Life.
- Wearables proprietarios fuera de Health Connect / HealthKit (salvo stub REST).
- Publicación en stores (solo preparación técnica).

---

## 4. Arquitectura propuesta

```
Wearable / sensores
    ? Health Connect (Android) / HealthKit (iOS)
        ? services/movil (gateway local, permisos, cola offline)
            ? API Laravel (Life + Conector transversal)
                ? Vitalsy Clinical (solo con consentimiento)
```

### Capas en `services/movil`

Screaming Architecture sugerida:

```
services/movil/
  app/                    # Expo Router (si se usa) o navegación
  src/
    modules/
      today/              # Hoy
      trends/             # Tendencias / baseline
      plan/               # Plan post-alta
      privacy/            # Soberanía, QR vinculación
      profile/            # Perfil, dispositivos, contacto emergencia
      auth/
      health-sync/        # Health Connect / HealthKit / offline queue
    shared/
      ui/                 # Botones, cards, tokens
      api/
      theme/              # Aire cotidiano
  assets/
  README.md
```

### Health Connect (Android) — detalle de plan

1. Dependencia Expo/React Native compatible con Health Connect (evaluar al implementar: p. ej. módulos community / config plugin oficial vigente en la versión Expo elegida).
2. Declarar permisos en `app.json` / `AndroidManifest` vía config plugin:
   - Lectura: HeartRate, Steps / Distance, Sleep, OxygenSaturation (si el dispositivo/API lo expone), etc. según RF-89.
3. Flujo UX (pantalla Dispositivos):
   - Comprobar si Health Connect está instalado / disponible.
   - Solicitar permisos granulares.
   - Leer agregados / samples en ventana temporal.
   - Mapear a modelo interno `BiometricSample`.
4. Si Health Connect no está disponible: mensaje claro + deep link a instalar / ajustes; no crashear.
5. Tests: capa de dominio con fake `HealthDataSource`; no depender de dispositivo en CI.

### HealthKit (iOS) — paralelo

- Misma interfaz `HealthDataSource`.
- Permisos Info.plist vía config plugin.
- Misma cola offline y mismo envío al backend.

### Offline (RF-92)

- Persistencia local (SQLite / MMKV / AsyncStorage según decisión en Fase 1).
- Banner “Sin conexión…” (mock `hoy_modo_offline_*`).
- Sync al recuperar red (NetInfo + worker).

### Backend

Endpoints Life (a definir en sub-plan API, TDD Laravel):

- Auth ciudadano (separado de roles hospitalarios).
- Ingesta de samples / sync batch.
- Baseline calculada o recibida.
- Consentimientos + códigos QR (vinculación / alta).
- Plan post-alta vinculado a egreso Clinical.

Hasta existir API: mocks en la app + contratos OpenAPI/documentados en `docs/`.

---

## 5. Fases de trabajo

### Fase 0 — Aprobación y rama

- Usuario aprueba este plan.
- Rama desde `dev`: `feature/RF-89-vitalsy-life-expo` (o por hitos).
- Confirmar Node/Expo SDK target.

### Fase 1 — Scaffold en `services/movil`

- `create-expo-app` TypeScript en `services/movil`.
- ESLint/Prettier alineados al monorepo si aplica.
- Tema Aire cotidiano + logo.
- Navegación tabs (5 ítems exactos).
- README con scripts `start` / `android` / `ios`.
- Primera prueba de smoke (render root).

### Fase 2 — Auth + splash

- Pantallas: splash, login, registro (`frame_c`, `frame_d`).
- Sesión segura (SecureStore).
- TDD formularios (validación local).

### Fase 3 — Health sync (prioridad Android Health Connect)

- Puerto `HealthDataSource`.
- Implementación Android Health Connect + stub.
- Pantalla Dispositivos.
- Cola offline + banner.
- Pruebas unitarias del mapeo de samples.

### Fase 4 — Hoy + Tendencias

- UI según mocks; datos de sync local + API.
- Chips “Dentro / fuera de tu baseline” (sin rojo clínico de sala).

### Fase 5 — Avisos (nudging)

- Centro de avisos; marcar leído; tono wellness.

### Fase 6 — Privacidad + QR vinculación

- RF-93/94; sharing off por defecto; generar/mostrar QR; revocar.

### Fase 7 — Plan post-alta

- Onboarding QR alta (RF-96); plan activo/vacío; detalle medicación (RF-97/98).
- Contacto de emergencia.

### Fase 8 — Integración API Laravel + conector

- Contratos + feature tests backend.
- E2E manual: Life QR ? Clinical consentimiento; Clinical alta ? Life plan.

### Fase 9 — Cierre

- Documentar en `docs/architecture/` (módulo Life / movil).
- Actualizar `docs/agent-context.md`.
- PR a `dev` por hitos (no un PR gigante si se puede partir).

---

## 6. Pruebas

| Capa | Herramienta | Qué |
|---|---|---|
| Dominio sync/baseline | Jest | Mapeo samples, cola offline |
| UI | React Native Testing Library | Tabs, formularios, estados vacíos |
| Backend Life | PHPUnit/Pest | Endpoints consentimiento, sync, plan |
| Manual | Expo Go / emulador | Health Connect en emulador/dispositivo Android real |

Regla monorepo: no cerrar hito sin pruebas relevantes en verde.

---

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| API Health Connect / plugins Expo cambian por SDK | Fijar SDK en plan Fase 1; documentar versión |
| Emulador sin Health Connect | Documentar dispositivo físico; fakes en CI |
| Mezclar UI Clinical | Inventario + tab bar fija; review visual |
| Scope “toda la app de golpe” | Entregar por fases 1?3 primero (scaffold + Health Connect) |
| Regulación / ansiedad usuario | Copy no diagnóstico; danger solo sync/errores |
| Auth ciudadano vs staff | Cuentas/roles separados en backend |

---

## 8. Dependencias de producto / docs

- RF-89–98 en `docs/requirements/requerimientos.md`
- Proceso 7 en `docs/processes/processes.md`
- Resumen ejecutivo (Life vs Clinical, conector)
- Mocks en `UI/Vitalsy Life/`
- Puntos Clinical ya diseñados: consentimiento, QR alta (web)

---

## 9. Criterio de aceptación (MVP móvil)

- [ ] Proyecto Expo en `services/movil` arranca en Android e iOS.
- [ ] Tab bar y design system Life aplicados.
- [ ] Android lee datos vía **Health Connect** (o degrada con mensaje claro).
- [ ] Offline guarda y reenvía samples.
- [ ] Flujos Privacidad + QR y Plan post-alta navegables según mocks.
- [ ] Pruebas automatizadas de dominio/UI críticas en verde.
- [ ] Documentación de arquitectura Life actualizada.

---

## 10. Relación con el plan Clinical

| | Clinical (web) | Life (movil) |
|---|---|---|
| Carpeta | `services/frontend` | `services/movil` |
| Rama sugerida | `chore/ui-pizarra-clinica` | `feature/RF-89-vitalsy-life-expo` |
| No mezclar | Rediseño CSS Clinical | App Expo nueva |

Implementar en **ramas y PRs separados**.

---

## 11. Aprobación

**No ejecutar `create-expo-app` ni implementar Health Connect hasta autorización explícita de este plan.**  
Al aprobar, el primer entregable será Fase 1 (scaffold en `services/movil`) + diseño de `HealthDataSource` con test fake.
