# Inventario de interfaces — Vitalsy Clinical

Documento de referencia para implementar el rediseño visual **sin cambiar funcionalidad**.  
App web hospitalaria (React + Vite + TypeScript). Código actual: `services/frontend/`.

Fecha de inventario: 2026-09-29  
Carpeta de mockups: `UI/Vitalsy Clinical/`

---

## 1. Objetivo de implementación

- Aplicar el look de los mockups Stitch (paleta **Pizarra clínica**, wordmark Clinical, chrome fijo).
- **No** alterar rutas, roles, validaciones, APIs ni textos que las pruebas buscan.
- Preferir cambios en CSS/tokens y componentes compartidos (`clinical.css`, `SealIcon`/brand, `App.tsx` shell, `Sheet`, `Button`, `Field`).
- Flujo de trabajo del repo: plan aprobado ? rama desde `dev` ? TDD ? commits atómicos.

---

## 2. Design system bloqueado

### Logo (aprobado)

- Wordmark: texto **Vitalsy** + línea vital **debajo** de la palabra (acento `#1E6B7B`, un pulso).
- Subtítulo top bar: `Gestión clínica hospitalaria`.
- **Prohibido:** V geométrica al lado, icono Material `vital_signs` al lado, cruz + ECG + badge rojo actual (`SealIcon` hay que simplificar).

Fuente de verdad visual: `frame_1_hoja_de_logotipos/`.

### Paleta Pizarra clínica

| Token | Hex | Uso |
|---|---|---|
| canvas | `#ECEEF1` | Fondo de página |
| surface | `#FFFFFF` | Top bar, sidebar, sheets |
| surface-sunken | `#F4F6F8` | Headers de tabla / hover |
| text | `#1B2228` | Texto principal |
| text-muted | `#4E5C68` | Secundario |
| border | `#D1D6DC` | Bordes 1px |
| accent | `#1E6B7B` | CTA, nav activo, links |
| accent-hover | `#165360` | Hover CTA |
| accent-soft | `#E6EFF1` | Fondo ítem nav activo |
| focus | `#1E6B7B` | Ring teclado |
| info / info-bg | `#2B6CB0` / `#EBF3F8` | Banners info |
| success / success-bg | `#237039` / `#EBF6EE` | Éxito |
| warning / warning-bg | `#8C6008` / `#FCF6E8` | Avisos |
| danger / danger-bg | `#B3261E` / `#FDF0ED` | Errores |

Fuente: `frame_2_tablero_paleta_1/`.

### NEWS2 (RNF-16 — no mezclar con marca)

- 0 ? verde  
- 1–4 ? ámbar  
- 5–6 ? ámbar fuerte  
- ?7 ? rojo  

Usar solo en chips de riesgo / alertas, **nunca** como color de marca.

### Tipografía

- **Source Sans 3** (ya está en el proyecto).
- No cambiar a Inter / Roboto / system como tipografía principal del rediseño.

### Chrome fijo

- Top bar ~68px: logo + subtítulo | campana (roles alerta) | nombre + rol | Cerrar sesión.
- Sidebar 256px: grupos + ítem activo = `accent-soft` + barra 3px izquierda accent.
- Case bar cuando hay `?ingreso=`: paciente, estado, stepper **solo en admisión** (oculto en `/atencion/*`).
- Sin avatares, sin “Terminal estación”, sin badges “Protocolo Adm-XX”, sin spinners infinitos en mockups.

Fuentes shell: `frame_7_*`, `frame_8_*`, `frame_9_*`, y pantallas corregidas tipo `screen_1_inicio`, `screen_2_pacientes`.

### Menús por rol (no inventar ítems)

Copiar exactamente `services/frontend/src/app/navigation.tsx`:

- **Enfermera de piso:** Trabajo (Inicio, Pacientes) · Atención (Expediente, Laboratorio, Imágenes, Constantes, Controles, e-MAR, Cuidados) · Alertas (Alertas, Registrar deterioro) · Egreso · Limpieza · Turnos y cobertura  
- **Médico tratante:** Inicio, Pacientes · Expediente, Visita, Laboratorio, Imágenes, Evolución, **CPOE** · Alertas · Egreso  
- **Médico residente:** igual sin CPOE  
- **Admisión:** Inicio, Pacientes, Registrar ingreso  
- **Camillero:** Inicio, Pacientes (+ Egreso en flujo alta)  
- **Gestión de camas:** Inicio, Censo de camas  
- etc. (ver `NAV` en código)

---

## 3. Orden de implementación sugerido (otra ventana de chat)

1. **Tokens** en `services/frontend/src/styles/clinical.css` (`:root`) ? mapear a Pizarra clínica.  
2. **Logo** en `shared/ui/Icons.tsx` (wordmark + línea bajo el texto).  
3. **Shell** en `App.tsx` + CSS topbar/sidebar (altura, activo, tipografía).  
4. **Componentes compartidos:** `Button`, `Sheet`, `Field`, `Feedback`, tablas, chips NEWS2, stepper, campana.  
5. Pantallas que aún se vean “viejas”: solo CSS / clases; **no** reescribir lógica.  
6. **Usuarios (RF-101–104):** único bloque con diseño **y** sin rutas aún ? feature nueva con TDD (fuera del “solo CSS”).

Tras cada capa: pruebas frontend relevantes en verde; smoke manual login ? Pacientes ? una acción clínica.

---

## 4. Inventario mock ? código

### Design system / auth

| Mockup carpeta | Ruta / pieza | Código | Notas implementación |
|---|---|---|---|
| `frame_1_hoja_de_logotipos` | Brand | `Icons.tsx` | Reemplazar `SealIcon` |
| `frame_2_tablero_paleta_1` | Tokens | `clinical.css` | Primera tarea |
| `frame_6_inicio_de_sesi_n_comparativa` | Login | `LoginPage.tsx` | Solo visual |
| `frame_7_app_shell_enfermera_en_4_paletas` | Shell enfermera | `App.tsx` | Referencia chrome |
| `frame_8_shell_admisi_n` | Shell admisión | `App.tsx` + `navFor` | Menú corto |
| `frame_9_shell_gesti_n_de_camas` | Shell camas | `App.tsx` | Menú corto |

### Trabajo del turno

| Mockup | Ruta | Código | Notas |
|---|---|---|---|
| `screen_1_inicio` | `/` | `HomePage.tsx` | Dashboard turno; mantener CTAs |
| `screen_2_pacientes` | `/pacientes` | `CensusPages.tsx` | Buscar + escáner + tabla |
| `screen_3_ficha_del_ingreso` | `/pacientes/:id` | `CensusPages.tsx` | Entregables + stepper |
| `screen_1_registrar_ingreso` | `/pacientes/nuevo` | `PatientRegistrationPage.tsx` | Formulario |

### Admisión (M1)

| Mockup | Ruta | Código | Notas |
|---|---|---|---|
| `screen_2_orden_de_internamiento` | `/admision/orden` | `AdmissionOrderPage.tsx` | |
| `screen_3_datos_filiatorios` | `/admision/filiacion` | `FiliationPage.tsx` | |
| `screen_4_cobertura_sanitaria` | `/admision/cobertura` | `CoveragePages.tsx` | |
| `screen_5_derivaci_n_de_cobertura` | `/admision/cobertura/derivacion` | `CoveragePages.tsx` | |
| `screen_6_brazalete_de_identificaci_n` | `/admision/brazalete` | `IdentityPages.tsx` | Preview brazalete |
| `screen_a_expediente_cl_nico_de_ingreso` | `/admision/expediente` | `IdentityPages.tsx` RecordPage | Separado de consentimiento |
| `screen_b_consentimiento_informado` | `/admision/consentimiento` | `IdentityPages.tsx` ConsentPage | Incluye bloque Life (RF-06 parcial) |
| `screen_1_orden_de_traslado_a_piso` | `/traslado/orden` | `TransferPages.tsx` | |
| `screen_2_verificaci_n_de_identidad` | `/traslado/identidad` | `TransferPages.tsx` | Escaneo valida solo |
| `screen_3_recepci_n_f_sica_en_piso` | `/piso/recepcion` | `TransferPages.tsx` | Entrada a reubicación si discrepancia |
| `screen_4_reubicaci_n_del_paciente` | `/piso/reubicacion` | `TransferPages.tsx` | Contingencia; no ítem de menú |
| `screen_5_valoraci_n_inicial` | `/enfermeria/valoracion` | `NursingPages.tsx` | |
| `screen_6_constantes_vitales_basales` | `/enfermeria/constantes` | `NursingPages.tsx` | NEWS2 preview |
| `screen_7_conciliaci_n_farmac_utica_bpmh` | `/enfermeria/conciliacion` | `ReconciliationPage.tsx` | |
| `screen_c_escalas_de_riesgo` | `/enfermeria/riesgos` | `RiskPages.tsx` | Morse radios simples |
| `screen_d_kardex_electr_nico_de_ingreso` | `/enfermeria/kardex` | `KardexPage.tsx` | |
| `screen_e_indicaciones_m_dicas_basales` | `/medico/indicaciones` | `MedicalOrdersPage.tsx` | Residente + tratante |

### Atención (M2)

| Mockup | Ruta | Código | Notas |
|---|---|---|---|
| `screen_1_expediente_cl_nico` | `/atencion/chart` | `PatientChartPage.tsx` | Tabs; sin stepper admisión |
| `screen_2_visita_m_dica` | `/atencion/visita` | `ClinicalVisitPage.tsx` | |
| `screen_3_resultados_de_laboratorio` | `/atencion/laboratorio` | `LabResultsPage.tsx` | |
| `screen_4_informes_de_im_genes` | `/atencion/imagenes` | `ImagingReportsPage.tsx` | |
| `screen_5_evoluci_n_m_dica` | `/atencion/evolucion` | `MedicalEvolutionPage.tsx` | |
| `screen_6_prescripci_n_electr_nica_cpoe_2` | `/atencion/cpoe` | `CpoePage.tsx` | **Debe conservar Editar / Eliminar / Agregar / Nueva / Kardex** |
| `screen_7_monitoreo_de_constantes` | `/atencion/constantes` | `VitalMonitoringPage.tsx` | |
| `screen_8_controles_de_constantes` | `/atencion/controles` | `VitalControlsPage.tsx` | |
| `screen_1_e_mar_del_turno` | `/atencion/emar` | `EmarPage.tsx` | 5 correctos + bloqueo |
| `screen_2_cuidados_y_evoluci_n_de_enfermer_a` | `/atencion/cuidados` | `NursingEvolutionCarePage.tsx` | Tabs Notas / Actividades |

### Alertas (M3)

| Mockup | Ruta | Código | Notas |
|---|---|---|---|
| `screen_3_alertas_pendientes_inbox` | `/alertas` | `AlertInboxPage.tsx` | Confirmar recepción / sirena |
| `screen_4_evento_de_alerta` | `/alertas/:id` | `AlertDetailPage.tsx` | Estados por rol en una ruta |
| `screen_5_registrar_deterioro_observado` | `/alertas/deterioro` | `DeteriorationPage.tsx` | |

### Egreso / Camas / Personal (M4–M6)

| Mockup | Ruta | Código | Notas |
|---|---|---|---|
| `screen_1_egreso_board` | `/egreso` | `DischargeBoardPage.tsx` | |
| `screen_2_ficha_de_egreso` | `/egreso/:id` | `DischargeCasePage.tsx` | Formularios por rol; QR Life (RF-61/96) si aplica |
| `screen_3_censo_hospitalario_corregido` | `/camas` | `BedCensusPage.tsx` | Usar **corregido**; board visual |
| `screen_4_limpieza_habilitaci_n_de_unidades` | `/camas/limpieza` | `CleaningOrdersPage.tsx` | Pipeline estados |
| `screen_5_turnos_y_cobertura_supervisora` | `/personal` | `StaffBoardPage.tsx` | UX Track B (no IDs crudos) |
| `screen_6_personal_por_otros_roles` | `/personal` | `StaffBoardPage.tsx` | Mismos endpoints, UI por rol |

### Administración (diseño listo; código pendiente)

| Mockup | Ruta deseada | Código | Notas |
|---|---|---|---|
| `screen_1_usuarios_listado` | `/usuarios` (nueva) | **No existe** | RF-101 |
| `screen_2_registrar_usuario` | `/usuarios/nuevo` | **No existe** | RF-102 |
| `screen_3_editar_desactivar_usuario` | `/usuarios/:id` | **No existe** | RF-103–104; desactivar ? borrar |

Implementar usuarios como feature aparte (`feature/RF-101-…`), TDD, rol administrador.

---

## 5. Huecos funcionales (no solo CSS)

- RF-06 Life en consentimiento: UI mock lista; lógica puede estar incompleta.  
- RF-61 / RF-96 QR al alta: mock en egreso; validar backend.  
- RF-101–104: solo diseño.  
- Módulo 7 Life: producto móvil aparte ? ver `UI/Vitalsy Life/inventario-de-interfaces.md`.

---

## 6. Qué no usar como referencia

- Mockups antiguos con menú inventado (“Atención directa”, “Kardex farmacológico”, etc.) si quedaran copias.  
- Combos expediente+consentimiento en un solo frame.  
- Censo de camas anterior a `screen_3_censo_hospitalario_corregido`.  
- Spinners infinitos / texto solapado (ya corregidos en censo).

---

## 7. Checklist para el agente implementador

- [ ] Leer este inventario + `docs/architecture/reglas.md` + `CONTRIBUTING.md`  
- [ ] Presentar plan (tokens ? logo ? shell ? componentes) y esperar aprobación  
- [ ] Rama desde `dev` con `feature/…` o `chore/…` según alcance  
- [ ] No cambiar copy de botones/labels que rompan tests  
- [ ] Ejecutar pruebas frontend relevantes  
- [ ] Documentar en `docs/agent-context.md` si el design system queda fijado en código  

---

## 8. Archivos de código más tocados (previsión)

- `services/frontend/src/styles/clinical.css`  
- `services/frontend/src/shared/ui/Icons.tsx`  
- `services/frontend/src/App.tsx`  
- `services/frontend/src/app/LoginPage.tsx`  
- `services/frontend/src/shared/ui/Button.tsx`, `Sheet.tsx`, `Field.tsx`  
- `services/frontend/src/main.tsx` (fuentes)  
