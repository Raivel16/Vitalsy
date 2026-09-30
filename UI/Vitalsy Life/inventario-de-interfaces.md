# Inventario de interfaces � Vitalsy Life

Documento de referencia para implementar la app m�vil de bienestar ciudadano.  
**Producto distinto de Vitalsy Clinical:** wellness / nudging, **no diagn�stico**, no chrome hospitalario.

Fecha de inventario: 2026-09-29  
Carpeta de mockups: `UI/Vitalsy Life/`  
Requisitos: RF-89�RF-98 � Proceso 7 en `docs/processes/processes.md` � Resumen ejecutivo en `docs/resumen-ejecutivo/`

---

## 1. Objetivo de implementaci�n

- Materializar los mockups Stitch en una app m�vil (a�n **no** hay c�digo Life en el monorepo de frontend Clinical).
- Mantener puente con Clinical solo por **consentimiento** (QR admisi�n, plan/QR post-alta).
- No reutilizar men� lateral ni NEWS2 de Clinical.
- Stack decidido: **Expo (React Native)** en `services/movil/`. Plan: `plan-implementacion.md` (aprobar antes de codear). Android: **Health Connect**; iOS: HealthKit.

---

## 2. Posicionamiento (resumen ejecutivo)

| | Life | Clinical |
|---|---|---|
| Mercado | B2C / B2B2C | B2B hospital |
| Dominio | Nudging, baseline personal | CDSS, NEWS2, alertas sala |
| Regulaci�n | Software de bienestar | CDSS / SaMD |
| UI | M�vil, tab bar, cards suaves | Web, sidebar, sheets |

Flujo de continuidad:

`Vida cotidiana (Life) �consentimiento? Hospital (Clinical) �egreso? Hogar (Life)`

---

## 3. Design system bloqueado

### Logo (aprobado)

- **Wordmark Integral:** texto `Vitalsy` + pastilla `Life` a la derecha.  
- Pastilla: fondo `#E6F4F3`, texto acento `#2B8A88`.  
- **Prohibido:** hoja/sprout circular, logo Clinical (l�nea ECG bajo la palabra sola), monograma V.

Fuente: `frame_a_brand_ui_kit/`.

### Paleta Aire cotidiano

Usar tokens de mockups / `aire_cotidiano/DESIGN.md`, ancla pr�ctica:

| Token | Hex | Uso |
|---|---|---|
| canvas | `#FAF9F6` | Fondo |
| surface | `#FFFFFF` | Cards |
| text | `#1C242B` | Principal |
| muted | `#687787` | Secundario |
| border | `#E2E8F0` | Bordes |
| accent | `#2B8A88` | CTA / tab activo |
| accent-soft | `#E6F4F3` | Lavados, pastilla Life |
| success | `#2E7D52` | Dentro de baseline / h�bitos |
| warning | `#D97706` | Nudges suaves / fuera de baseline habitual |
| danger | `#DC2626` | **Solo** sync, permisos, errores de input � nunca �diagn�stico� biom�trico |

### Tipograf�a

- **Plus Jakarta Sans** (kit Life).  
- N�meros biom�tricos: tabular nums.

### Navegaci�n m�vil (fija)

Tab bar inferior exacta en pantallas autenticadas:

`Hoy | Tendencias | Plan | Privacidad | Perfil`

Fuente: `frame_b_tab_bar_bloqueada/`.  
Pantallas push (Avisos, QR, detalle med): back + tab del padre activo.

### Tono de copy

- Preventivo, calmado.  
- �Dentro / fuera de **tu** baseline�.  
- Sin c�digos RF visibles en UI.  
- Disclaimer: no emite diagn�sticos m�dicos.

---

## 4. Conexi�n con Clinical (implementaci�n transversal)

| Momento | Life | Clinical | RF |
|---|---|---|---|
| Admisi�n | Genera QR/c�digo de vinculaci�n | Lee c�digo en consentimiento / valoraci�n | 94, 95 |
| Alta (ya usuario) | Recibe plan de seguimiento | Enfermer�a activa plan | 97, 98 |
| Alta (no usuario) | Onboarding con QR patrocinado | QR en hoja de alta | 96 |
| Salida f�sica | Retoma vigilancia pasiva | Cierra evento intrahospitalario | 98 |
| Privacidad | Autoriza / revoca instituciones | Solo consume si hay consentimiento vigente | 93 |

APIs / contratos entre productos: definir en plan t�cnico (a�n no existen rutas Life en este repo).

---

## 5. Orden de implementaci�n sugerido

1. Design tokens + logo + tab bar (shell).  
2. Auth: splash, login, registro.  
3. Hoy + offline + Tendencias.  
4. Dispositivos / HealthKit�Google Fit + cola offline (RF-89, 92).  
5. Avisos / nudges (RF-91).  
6. Privacidad + QR vinculaci�n + revocaci�n (RF-93, 94).  
7. Plan post-alta + onboarding QR alta + detalle medicaci�n (RF-96�98).  
8. Contacto de emergencia / cuidador.  
9. Integraci�n real con backend / Clinical connector (TDD).

---

## 6. Inventario mock ? RF

### Sistema / auth

| Carpeta mockup | Pantalla | RF | Estado producto | Notas implementaci�n |
|---|---|---|---|---|
| `frame_a_brand_ui_kit` | UI kit + logo | � | Referencia | Tokens + componentes |
| `aire_cotidiano/DESIGN.md` | Design tokens | � | Referencia | Fuente tipogr�fica/colores |
| `frame_b_tab_bar_bloqueada` | Tab bar | � | Referencia | 5 tabs fijas |
| `frame_c_splash_bienvenida` | Splash / welcome | � | Por implementar | CTA cuenta + entrada c�digo alta |
| `frame_d_login_y_registro` | Login / registro | � | Por implementar | Dos estados |
| `frame_e_app_shell_autenticado` | Shell vac�o / Hoy base | � | Por implementar | Offline banner ejemplo |

### N�cleo diario

| Carpeta mockup | Pantalla | RF | Notas |
|---|---|---|---|
| `hoy_vitalsy_life` | Hoy | 90, 91 | Cards biom�tricas vs baseline |
| `hoy_modo_offline_vitalsy_life` | Hoy offline | 92 | Banner sin conexi�n; datos locales |
| `tendencias_vitalsy_life` | Tendencias | 90 | Banda de baseline personal |
| `dispositivos_y_sincronizaci_n_vitalsy_life` | Dispositivos | 89, 92 | HealthKit / Google Fit / sync |
| `centro_de_avisos_vitalsy_life` | Avisos / nudges | 91 | No alarmismo hospitalario |
| `perfil_vitalsy_life` | Perfil | � | Links a dispositivos, contacto, logout |

### Privacidad y puente hospital

| Carpeta mockup | Pantalla | RF | Notas |
|---|---|---|---|
| `privacidad_y_soberan_a_vitalsy_life` | Privacidad | 93 | Sharing off por defecto |
| `privacidad_instituci_n_activa_vitalsy_life` | Privacidad + instituci�n | 93 | Revocar acceso |
| `c_digo_de_vinculaci_n_vitalsy_life` | QR / c�digo vinculaci�n | 94 | Mostrar en admisi�n Clinical |

### Post-alta y cuidador

| Carpeta mockup | Pantalla | RF | Notas |
|---|---|---|---|
| `activar_seguimiento_post_alta_vitalsy_life` | Onboarding QR alta | 96 | Caso B no usuario previo |
| `plan_post_alta_activo_vitalsy_life` | Plan seguimiento | 97, 98 | Meds + alarmas + cuidados |
| `plan_sin_seguimiento_vitalsy_life` | Plan vac�o | 97 | CTA activar QR |
| `detalle_de_medicaci_n_vitalsy_life` | Detalle toma | 97 | Confirmar / posponer |
| `contacto_de_emergencia_vitalsy_life` | Contacto cuidador | Proc. 7.2 | Avisos opcionales |

---

## 7. Cobertura RF-89�98

| RF | Cubierto en mock | Notas |
|---|---|---|
| 89 | S� � Dispositivos | Ingesta pasiva wearables |
| 90 | S� � Hoy / Tendencias | Baseline intra-individual |
| 91 | S� � Avisos | Nudging + desviaci�n suave |
| 92 | S� � Hoy offline / Dispositivos | Cola local |
| 93 | S� � Privacidad (+ instituci�n) | Autorizar / revocar |
| 94 | S� � C�digo vinculaci�n | QR para Clinical |
| 95 | Parcial (Clinical) | Consumo en Clinical; Life solo emite c�digo |
| 96 | S� � Activar post-alta | QR patrocinado |
| 97 | S� � Plan activo / detalle med | Plan domiciliario |
| 98 | S� � Plan activo (chip vigilancia) | Custodia post egreso |

---

## 8. Checklist para el agente implementador

- [ ] Leer este inventario + RF-89�98 + Proceso 7 + resumen ejecutivo  
- [ ] Presentar plan (stack m�vil, estructura de carpetas, primeras pantallas) y **esperar aprobaci�n**  
- [ ] No copiar sidebar/NEWS2 de Clinical  
- [ ] Logo Wordmark Integral en todas las pantallas  
- [ ] Tab bar exacta; rebuild visual si Stitch se desv�a (densidad / monocromo)  
- [ ] TDD seg�n reglas del monorepo cuando exista paquete de c�digo  
- [ ] Documentar contrato Life ? Clinical (consentimiento, QR, plan) en `docs/`  

---

## 9. Relaci�n con Clinical en este monorepo

- Clinical ya tiene puntos de UI para Life: consentimiento (`screen_b` en Clinical), egreso/QR.  
- Life es el cliente ciudadano; la implementaci�n m�vil puede vivir en un nuevo paquete (p. ej. `services/life-app/`) � decidirlo en el plan, no asumirlo aqu�.  
- Inventario Clinical paralelo: `UI/Vitalsy Clinical/inventario-de-interfaces.md`.  
