# Plan de implementación — Vitalsy Clinical (rediseño visual)

**Estado:** pendiente de aprobación del usuario antes de escribir o modificar código.  
**Referencia visual:** `UI/Vitalsy Clinical/`  
**Inventario:** `UI/Vitalsy Clinical/inventario-de-interfaces.md`  
**Código actual:** `services/frontend/` (React + Vite + TypeScript) + `services/backend/` (Laravel)

Fecha: 2026-09-29

---

## 1. Objetivo

Aplicar el design system **Pizarra clínica** (logo wordmark, tokens, chrome, tipografía Source Sans 3) a la web hospitalaria **sin cambiar funcionalidad**: mismas rutas, roles, validaciones, APIs y textos que las pruebas ya cubren.

Fuera de este plan (fase posterior, feature aparte):

- Administración de usuarios RF-101–104 (hay mock; no hay rutas).
- Completar huecos Life en Clinical (QR alta / consentimiento) si falta backend.

---

## 2. Alcance

### Incluye

- Tokens CSS (`clinical.css` `:root`).
- Logo Clinical (línea vital **bajo** “Vitalsy”).
- Top bar + sidebar (altura, activo, tipografía).
- Componentes compartidos: `Button`, `Sheet`, `Field`, `Feedback`, chips NEWS2, stepper, campana, tablas.
- Ajustes visuales puntuales en pantallas que no hereden bien (camas, personal, egreso) **solo con CSS/clases**, sin reescribir flujos.

### No incluye

- Cambiar copy de botones/labels que rompan tests.
- Reescribir páginas “para que se parezcan pixel-perfect” si el chrome + tokens ya unifican el 80 %.
- Nueva app móvil (ver plan Life).
- Refactors de dominio, APIs o migraciones no relacionadas.

---

## 3. Principios

1. **Solo diseño:** comportamiento idéntico.
2. **TDD:** si se toca un componente compartido, mantener/ajustar pruebas existentes; no inventar requisitos.
3. **Rama:** desde `dev`, p. ej. `chore/RF-visual-pizarra-clinica` o por capas `chore/ui-tokens-pizarra`, etc.
4. **Commits atómicos** Conventional Commits.
5. **NEWS2** colores clínicos bloqueados (RNF-16); no usar rojo/ámbar de riesgo como marca.

---

## 4. Fases de trabajo

### Fase 0 — Preparación

- Confirmar inventario y este plan aprobados.
- Crear rama desde `dev`.
- Baseline: ejecutar suite frontend relevante (al menos smoke de shell/login/pacientes).

### Fase 1 — Tokens

**Archivos:** `services/frontend/src/styles/clinical.css`

Mapear variables actuales (`--ink`, `--navy`, `--teal`, `--paper`, …) a Pizarra clínica:

| Actual (aprox.) | Nuevo |
|---|---|
| paper / fondos | canvas `#ECEEF1` |
| sheet | surface `#FFFFFF` |
| ink | text `#1B2228` |
| muted | `#4E5C68` |
| line | border `#D1D6DC` |
| navy/blue CTA | accent `#1E6B7B` / hover `#165360` |
| success/warning/danger | tokens del inventario |

Mantener clases `.news-green|yellow|red` con semántica NEWS2.

**Prueba:** visual + tests existentes en verde (no deben depender de hex).

### Fase 2 — Logo

**Archivos:** `services/frontend/src/shared/ui/Icons.tsx` (+ uso en `App.tsx`, `LoginPage.tsx`)

Reemplazar `SealIcon` (cruz + ECG + badge rojo) por wordmark SVG: “Vitalsy” + path de línea vital debajo.

**Prueba:** si hay test de marca, actualizar selectores; smoke login/header.

### Fase 3 — Chrome (top bar + sidebar)

**Archivos:** `clinical.css` (`.topbar`, `.layout > nav`, nav activo), posiblemente `App.tsx` solo si hace falta clase/estructura mínima.

Alinear:

- Altura top bar ~68px, sidebar 256px.
- Activo: fondo `#E6EFF1` + barra 3px izquierda accent.
- Sin añadir ítems de menú; seguir `navigation.tsx`.

**Prueba:** `AppShell` / navegación tests existentes.

### Fase 4 — Componentes compartidos

**Archivos:** estilos de `.button`, `.sheet`, `.field`, `.banner`, tablas, `.stepper`, campana/toast.

Objetivo: que Inicio, Pacientes, formularios de admisión y sheets anchos hereden el look sin editar cada página.

**Prueba:** `Button.test`, `toast.test`, tests de census/admission que usen Sheet.

### Fase 5 — Pantallas densas ( pulido )

Solo si tras Fases 1–4 siguen feas respecto al mock:

- `/camas` (board), `/personal`, `/egreso`, alert cards.

Preferir clases CSS nuevas + markup mínimo. **No** cambiar handlers ni textos de CTA.

**Prueba:** `bed-management`, `staff-roster`, `discharge`, `clinical-alerts` tests.

### Fase 6 — Cierre

- Checklist visual vs mock (login, shell enfermera, pacientes, una de atención, alertas).
- Documentar tokens finales en `docs/agent-context.md` (anexo corto).
- PR hacia `dev` con evidencia de tests.

---

## 5. Archivos previstos

| Archivo | Cambio |
|---|---|
| `services/frontend/src/styles/clinical.css` | Tokens + chrome + componentes |
| `services/frontend/src/shared/ui/Icons.tsx` | Logo |
| `services/frontend/src/App.tsx` | Solo si estructura brand lo exige |
| `services/frontend/src/app/LoginPage.tsx` | Clases/brand visual |
| `services/frontend/src/shared/ui/*` | Ajustes menores de className si hace falta |
| `docs/agent-context.md` | Nota de design system aplicado |

---

## 6. Pruebas

- Frontend: Vitest de módulos tocados + al menos login, census, shell.
- No se espera cambio de backend en este plan.
- Criterio de hecho: tests verdes + recorrida manual de 3 roles (admisión, enfermera, médico).

---

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Tests frágiles por color/estilo | No asertar hex; asertar roles/textos |
| Contraste insuficiente | Validar tokens vs WCAG en top bar/sidebar |
| Scope creep “rediseñar cada página” | Parar en chrome + tokens; pulido solo donde el inventario lo marca |
| Romper NEWS2 | No reutilizar danger/warning de marca en chips de score |

---

## 8. Estimación de esfuerzo (orientativa)

| Fase | Esfuerzo |
|---|---|
| 1 Tokens | Bajo |
| 2 Logo | Bajo |
| 3 Chrome | Bajo–medio |
| 4 Componentes | Medio |
| 5 Pulido | Medio (opcional acotado) |
| 6 Cierre | Bajo |

---

## 9. Criterio de aceptación

- [ ] UI usa Pizarra clínica y wordmark aprobado.
- [ ] Menús por rol idénticos a `navigation.tsx`.
- [ ] Flujos clínicos igual que antes.
- [ ] Pruebas relevantes en verde.
- [ ] PR a `dev` con descripción y checklist.

---

## 10. Aprobación

**No implementar hasta que el usuario autorice este plan explícitamente.**  
Tras aprobar: ejecutar Fase 0 y Fase 1 primero; no mezclar con Life móvil en la misma rama.
