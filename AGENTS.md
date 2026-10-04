# AGENTS.md

## Contexto del proyecto

Este repositorio es un monorepo con:

- Frontend: React + Vite + TypeScript
- Backend: Laravel
- Base de datos: PostgreSQL
- Infraestructura: Docker
- Documentación: docs/requirements y docs/architecture

## Reglas obligatorias

Antes de implementar cualquier cambio, el agente debe seguir estas reglas:

1. Leer y respetar [docs/architecture/reglas.md](docs/architecture/reglas.md).
2. Leer y respetar [CONTRIBUTING.md](CONTRIBUTING.md).
3. Consultar [docs/requirements/requerimientos.md](docs/requirements/requerimientos.md) antes de definir funcionalidad nueva.
4. Aplicar TDD en backend y frontend: escribir pruebas primero y luego implementar la solución.
5. No asumir requisitos no documentados; si faltan detalles, buscar primero en la documentación del proyecto.
6. Mantener actualizada la documentación técnica en [docs/](docs/).
7. No cerrar un cambio sin pruebas relevantes ejecutadas y en verde.
8. Antes de cualquier implementación, el agente debe presentar un plan de trabajo claro, acotado y verificable, con alcance, pruebas a agregar, archivos afectados y riesgo estimado. Ese plan debe ser revisado y aprobado por el usuario antes de empezar a escribir o modificar código.
9. Si el usuario no autoriza el plan, el agente no debe construir ni editar archivos, ni ejecutar cambios funcionales. Solo puede responder con el plan para aprobación.
10. Una vez aprobado el plan, el agente puede continuar con la implementación mínima y verificable.
11. Organizar el frontend React aplicando Screaming Architecture, de modo que la estructura de carpetas exprese claramente los dominios y módulos funcionales del sistema.
12. Nombrar los commits con el estándar Conventional Commits e incluir el identificador del requerimiento cuando aplique: `tipo(alcance): RF-XX descripción breve`.
13. Mantener los commits atómicos: cada commit debe contener únicamente cambios completamente relacionados con un mismo objetivo, requisito o corrección; los cambios no relacionados deben quedar en commits separados.

## Flujo recomendado

- Definir el requisito o caso de uso.
- Revisar documentación y reglas del proyecto.
- Presentar un plan de implementación para aprobación.
- Esperar la autorización explícita del usuario.
- Crear la rama de trabajo desde `dev` con formato estándar `feature/RF-XX-brief-description` o `bugfix/RF-XX-brief-description`.
- Escribir la prueba antes de la implementación.
- Implementar la menor solución que haga pasar la prueba.
- Organizar las funcionalidades del frontend por dominio o módulo, manteniendo visible su propósito funcional mediante Screaming Architecture.
- Nombrar cada commit con un tipo válido (`feat`, `fix`, `test`, `docs`, `refactor` o `chore`), un alcance opcional y una descripción breve en modo imperativo, sin punto final.
- Mantener separados los cambios no relacionados para facilitar la revisión, reversión y trazabilidad de cada commit.
- Ejecutar validaciones relevantes.
- Documentar cambios si afectan arquitectura o requisitos.
- Hacer PR hacia `dev`; cuando la versión esté lista para producción, promover desde `dev` a `main`.

## Objetivo de contexto

El propósito de este archivo es reducir el consumo innecesario de tokens y evitar que los agentes vuelvan a releer todo el proyecto desde cero para cada tarea. Debe usarse como punto de referencia obligatorio para mantener coherencia con la estrategia del proyecto.


<!-- BEGIN AGENT ANNOTATIONS — DO NOT EDIT CONTENT ABOVE THIS LINE -->

## Anotaciones de agentes (solo anexos)

> Esta sección se **agrega al final**. El contenido previo de AGENTS.md no debe modificarse.
> Alternativa: `docs/agent-context.md` para notas largas por iteración.

### 2026-09-19 — RF-02 UX stepper y validaciones de formularios

- **Navegación de pasos:** un solo stepper superior (`AdmissionStepper` en `CaseBar` / ficha). No duplicar pills «Sus pasos en este ingreso» (`RoleStepLinks` eliminado).
- **Regresar por stepper:** un paso es clickable solo si `canViewRoleStep(role, step, progress, currentStep)` lo permite (pasos del rol ya alcanzados/completados). Pasos futuros o de otro rol: solo etiqueta, sin link.
- **Layout:** `.sheet` y `.case-bar` centrados (`margin: auto`, `max-width` acotado). Formularios no pegados a la esquina izquierda.
- **Validaciones compartidas:** `shared/validation/inputRules.ts` — `digitsOnly`, `documentNumberError`, `phoneNumberError`, `requiredText`.
- **Reglas de campos:** DNI/documento y teléfonos solo dígitos (filtrar en `onChange`). Obligatorios por defecto; opcionales explícitos (alergias, observación de derivación, motivo de internamiento si no aplica).
- **Base de trabajo local:** `origin/dev` puede estar atrasado; el flujo de admisión vive en ramas `feature/RF-*`. Preferir ramificar bugfix desde la rama feature que ya tenga el módulo 1, documentándolo en el plan.

### 2026-09-20 — Esquema DB RF-01–RF-104 + censo

- Migraciones `2026_09_20_100*` + modelos Eloquent + `CatalogSeeder`; detalle en `docs/architecture/modelo-datos.md` y `docs/agent-context.md`.
- `admission_encounters` intacto; `encounter_id` string indexado sin FK en tablas nuevas.
- Censo: búsqueda `q` + paginación 10; sheets anchos en pantallas grandes (`Sheet wide` / CSS responsive).

### 2026-09-20 — UI compartida y espaciado de formularios

- Componentes en `shared/ui/`: `Button` / `ButtonLink`, `EmptyEncounter`, `StatusStamp`, `FormActions`.
- Cobertura: formulario en `.stack` + `StatusStamp`; `.stamp` con margen vertical; dentro de `.stack` el margen se anula para no duplicar el gap.
- CSS: `.field` gap 0.5rem; `.check .field-error` a ancho completo; `.result-block` con margen superior.
- `Feedback` acepta `label` opcional (`aria-label`) para resultados de registro.

### 2026-09-20 — RF-20 camillero y escáner de brazalete

- Rol interno `camillero`; UI/docs actor **Celador / Camillero**; cuenta `camillero@vitalsy.local`.
- RF-08: escaneo en identidad valida solo. RF-20: escáner en censo; `q` incluye brazalete.
- Escáner compartido: `shared/ui/BarcodeScanner.tsx`.

### 2026-09-21 — Módulo 2 roles clínicos

- Roles: `enfermera_piso`, `auxiliar_enfermeria`, `medico_residente`, `medico_tratante`.
- Catálogo en `docs/requirements/requerimientos.md`.

### 2026-09-21 — RF-21 LIS

- Stub FHIR + API `lab-results` + UI `/atencion/laboratorio`. Ver `docs/architecture/modulo-2-atencion.md`.

### 2026-09-22 — UX Módulo 2 + RF-38

- Stepper de admisión oculto en `/atencion/*` e ingresos cerrados.
- Constantes M2 = campos NEWS2 de M1 + gráfica SVG; sin precargas.
- CPOE: panel plan activo + enlace a e-MAR; e-MAR regenera dosis del plan activo.
- RF-38: `Expediente clínico` (`/atencion/chart`) — lectura consolidada del ingreso.

### 2026-09-25 — Expediente tabs + cuidados compartidos

- Expediente: pestañas Admisión / Constantes / Tratamiento / Paraclínicos / Evoluciones.
- RF-36–37: `enfermera_piso` y `auxiliar_enfermeria` pueden notas y cuidados directos.

### 2026-09-25 — Censo genérico + indicaciones tratante

- Censo listado: «Pacientes» / «Listado»; búsqueda con botón (no por tecla).
- Morse: radios simples. Advance `indicaciones` también para `medico_tratante`.
- Cuidados: tabs Notas/Actividades + `completedByName`; expediente con timeline por fecha y filtro `from`/`to`.
- Admisión en chart: sin etiqueta «Proceso 1».
- RF-24: evolución médica para residente y tratante; `?next=` al elegir paciente; loader/acordeón/sidebar UX.
- Pulido visual: sin cabeceras azul uniforme, menú fixed, fondo patrón sutil, CTA ficha centrado.
- RF-16: tratante firma indicaciones; loader global único al abrir ingreso.

### 2026-09-26 — Módulos 3–6 + RF-53

- Roles nuevos: `enfermera_supervisora`, `equipo_respuesta_rapida`, `trabajo_social`, `altas_caja`, `gestion_camas`, `servicios_generales`, `jefatura_enfermeria`, `recursos_humanos`.
- M3: bandeja `/alertas`, SLA `alerts:process-slas`, timeline inmutable.
- RF-53: campana en header, toast propio y sirena Web Audio; para solo al confirmar lectura (`acknowledge`).
- M4: `/egreso` con gates de secuencia; `PatientExited` libera cama.
- M5: `/camas` censo + espera + limpieza; listener de egreso despacha desinfección.
- M6: `/personal` rol, balanceo NEWS2, handover y retén; RF-39 usa `daily_patient_assignments`.

### 2026-09-26 — Controles + recordatorios (RF-42/28)

- Inbox médico compartido: `medico_notificado` / `medico_en_atencion` visibles para residente y tratante.
- Bandeja `/atencion/controles` (módulo `vital-controls`): listar/completar y reprogramar `next_due_at`.
- `ComplianceAlertService` en `alerts:process-slas`: control/dosis vencida → alerta + sirena; cierra al completar; escala a supervisora.
- Config: `emar_grace_minutes`, `compliance_ack_minutes`; columna `compliance_key`.

### 2026-10-01 — Procesos 2 y 3, look Pizarra

- Hojas de atención y alertas usan `clinic` + clase `floor-care` (pastillas, paneles hundidos, dos columnas, chips NEWS2).
- `CaseBar` compacto (documento, estado, lecho) solo en `/atencion` y `/alertas`. El stepper de admisión no cambia.
- Rama: `chore/ui-procesos-2-3-pizarra`.

### 2026-10-02 — Procesos 4, 5 y 6, look Pizarra

- Egreso, censo, limpieza y personal usan `clinic` + `floor-care` + `ops-board`.
- La ficha de egreso muestra la cadena de entregables y la perspectiva del rol activo. Limpieza agrupa por etapa (`pendiente` / `completada`). Personal cambia título y paneles según jefatura, supervisora, enfermera de piso o recursos humanos.
- El alta arranca solo con ingresos `cerrado`. El censo omite `egresado` para no romper Pacientes.
- RF-66: la salida efectiva la registra solo `enfermera_piso`. El camillero consulta el pase y traslada.
- El lector de códigos abre en un modal. En egreso, el escaneo abre la ficha del hospitalizado.
- Rama: `chore/ui-procesos-4-5-6-pizarra`.

<!-- END AGENT ANNOTATIONS -->
