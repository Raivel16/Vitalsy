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

### 2026-10-09 — Proceso 5 camas: flujo completo y fidelidad al diseño

- Ciclo de la orden de limpieza cerrado: `pendiente → completada → equipada → habilitada`, con guardas de estado, checklist obligatorio y chequeo de equipamiento ligado a la orden (`CleaningWorkflow`). Migraciones aditivas `2026_10_09_100000` y `2026_10_09_100100`.
- `assign` es atómico y valida compatibilidad (aislamiento, especialidad, género) con `BedCompatibility`; deja la asignación notificada a la supervisora hasta que la reconoce (RF-73).
- Nuevos endpoints de lectura: `GET beds/patients`, `GET beds/projections`, `GET beds/assignments/notifications`; el censo expone `occupant` por cama.
- `/camas` y `/camas/limpieza` rehechas según `screen_3_censo_hospitalario_corregido` y `screen_4_limpieza_habilitaci_n_de_unidades`; se agrega `FlowGuide` («Tu siguiente paso» por rol). La solicitud ya no envía especialidad/género ocultos.
- Pendiente fuera de alcance: bloques del diseño sin RF (personal operativo, tiempo de rotación, insumos, bitácora, avería). Proceso 6 (`/personal`) sigue con las brechas detectadas en la revisión (selectores de enfermeras, confirmar retén RF-88, resultado de ausencias).
- Rama: `bugfix/RF-68-77-camas-flujo-e-interfaz`.

- Camas (UI): se retira `FlowGuide` (guía de pasos) de `/camas` y `/camas/limpieza`; el panel lateral de `/camas` queda sticky y «Nueva solicitud» abre `BedRequestDrawer` (cajón) desde la lista de espera.
### 2026-10-09 — Administración de usuarios (RF-101–104)

- Decisión: rol 15 `administrador_accesos` en `RoleCatalog.php` y `roles.ts` (cuenta demo `administrador_accesos@vitalsy.local`).
- Backend: `UserAdminController` + `UserAdministration` (transacciones con bloqueo de administradores), `StoreUserRequest`/`UpdateUserRequest`, middleware `active` (cuenta inactiva → 401), login rechaza inactivos, tabla `access_audit_logs`, `users.must_change_password`.
- `GET /staff/members` queda disponible para los selectores de `/personal` (Parte B).
- Frontend: `modules/user-admin` (`/usuarios`, `/usuarios/nuevo`, `/usuarios/:userId`).
- Rama: `feature/RF-101-104-administracion-usuarios`.

### 2026-10-09 — Proceso 6 personal: interfaces y reglas (RF-78–88)

- Backend: validación `exists` con rol asistencial activo, motivo obligatorio, ausencia sin duplicados, transiciones de cobertura validadas, `whereDate` y transacciones; rebalanceo por carga NEWS2; `recordAbsence` devuelve `reassignments`/`unassigned`; `listCoverage` incluye nombres, fecha, motivo y responsables; handover de la saliente (`fromUserId`) con control de mismo servicio.
- Frontend: `modules/staff-roster` dividido en `staffApi.ts`, `domain/` (`coverage`, `capabilities`), `hooks/` y paneles por responsabilidad; sin IDs tecleados, con fechas por control y estado por panel; RF-88 disponible en UI.
- Rulings: no se partió `StaffRoster` en cuatro servicios (queda como deuda de refactor); `suggest` no filtra por fecha/servicio ni excluye ya asignados; sin notificación persistente (RF-80) ni validación formal del reporte (RF-82).
- Fuera de alcance (sin RF): montos, planilla, SBAR, checklist, KPIs de horas, exportar matriz.
- Rama: `bugfix/RF-78-88-interfaces-personal` (basada en `feature/RF-101-104-administracion-usuarios`).

### 2026-10-09 — /personal: matriz mensual de turnos y buscador de personas

- Jefatura: `RosterPanel` ahora es la matriz colaborador × día (frame 6A) con leyenda D/N/L/R, navegador de meses (12 atrás), estado «Publicado el … por …» y confirmación al reemplazar un mes. El rol publicado ya no desaparece.
- `PersonPicker` (nombre, correo, rol) reemplaza a los `<select>` de colaborador, quien falta, saliente y retén. `email` solo se expone a jefatura y supervisora.
- Backend: `GET staff/shift-plans`; `showPlan` con nombres, publicador y retenes (retenes ocultos para quien no puede leer coberturas).
- Fuera de alcance: horas totales, descanso normativo, exportar matriz, versiones por publicación. R solo se pinta; no se edita.
- /usuarios: la barra de acciones del formulario ocupa su propia fila (`form-span-2 form-actions-bar`).

### 2026-10-09 — /personal: rediseño de vistas y personas de prueba

- Jefatura: «Agregar colaborador» es un panel aparte encima del rol (elegir persona + botón «Agregar al rol»); «Servicio del rol» es un selector (catálogo de wards) porque el relevo exige el mismo servicio; chevrones y mes alineados; botón de publicar separado.
- Supervisora: asignación a la izquierda y contingencias + coberturas en columna lateral fija (sin scroll entre formularios).
- RRHH: guía «Cómo llega una solicitud» y contadores por estado. Enfermera de piso: `GET handover/candidates` muestra a quién releva ahora o explica por qué no hay relevo.
- Seeder `DemoPeopleSeeder`: 22 personas ficticias (`nombre.apellido@vitalsy.local`, contraseña `DEMO_PASSWORD`) y un escenario de práctica de relevo (Rosa Quispe → Lucía Mendoza, 3 pacientes ENC-PRAC-*) válido ~3 h desde `db:seed`.

- Rotación obligatoria (RF-102): middleware `password.rotated` bloquea la API con 403 `password_change_required` mientras `must_change_password`; `POST auth/change-password` (mínimo 10 caracteres, letras y números, distinta de la actual) y pantalla `ChangePasswordPage` en el `Gate`.

### 2026-10-10 — Calidad: SonarQube local y cobertura global

- SonarQube Community local (Docker, puerto 9000) analiza `dev`; configuración en `sonar-project.properties` (fuentes `frontend/web/src`, `backend/api/app`, `movil`). El escaneo desde una worktree usa `-Dsonar.scm.disabled=true`.
- Cobertura global pasó de 71 % a 83,1 % alimentando los tres reportes: `frontend/web/coverage/lcov.info`, `movil/coverage/lcov.info` (`npx jest --coverage`) y `backend/api/coverage.xml` (PCOV en la imagen Docker del backend; requiere `.env` + `key:generate` como en CI).
- Corregidos 2 bugs y 4 vulnerabilidades: `randomHex` móvil usa `Crypto.getRandomBytes`, comparador explícito en `today.ts`, base `https` ficticia en `returnTo.ts`, visor de escáner con `<dialog>` nativo. 0 bugs, 0 vulnerabilidades, Quality Gate OK.
- Nota: `npm run lint` del frontend ya tenía 40 errores previos en `dev`; no se corrigieron aquí.
- Rama: `chore/calidad-sonarqube`.

- Fiabilidad (MQR) llevada a A: 20 incidencias corregidas (regex sin retroceso en correo y etiquetas de riesgo, `codePointAt`/`replaceAll`, espacios JSX explícitos, `<dialog>` nativo y fondo con botón en cajón de camas y visor del escáner). Las pruebas largas usan `user.paste`. Si `npm test` da timeouts, es carga de la máquina (antivirus/SonarQube): detener `sonarqube` y reintentar.
### 2026-10-10 — Calidad (2): código nuevo de personal y usuarios

- Tras integrar RF-78–88 y RF-101–104, SonarQube marcó Reliability D: `RosterPanel` ordena meses con `orderMonthOptions` (comparador explícito), `userForm` valida correo sin backtracking, `PersonPicker` expone `aria-activedescendant` y teclado en opciones, `HandoverPanel` simplifica el radio de enfermera saliente.
- `sonar-project.properties` excluye `movil/android/**`, `movil/ios/**`, `**/build/**` y `**/.expo/**`: son salidas de `expo prebuild`; analizadas con `-Dsonar.scm.disabled=true` (que no respeta `.gitignore`) sumaban 23 vulnerabilidades ajenas al código.
- El reporte clover del backend generado en Docker trae rutas `/var/www/html/`; hay que reescribirlas a `backend/api/` antes de escanear o el backend cuenta como 0 % de cobertura.
- Rama: `chore/calidad-sonarqube-2`.
### 2026-10-14 — Cierre de la integración Clinical-Life (RF-89–98)

- `LifeEndToEndTest` recorre el flujo completo (registro, consentimiento, sync, código, importación en admisión, plan de alta, salida con custodia, reclamo). La línea base exige al menos 7 días de historia.
- Docs actualizados: `modulo-1-admision.md`, `modulo-4-alta.md`, `modulo-7-vitalsy-life.md`, `modelo-datos.md` y colección `docs/api/yaak-vitalsy-life.postman_collection.json`.
- No verificado en ejecución: app móvil contra servidor real, Reverb/wss, pg_dump/k6/Playwright reales, servidor FHIR real.

### Nota — lectura de Health Connect en primer plano (RNF-19)

- `movil/src/modules/health-sync/foregroundPolling.ts` lee cada 60 s con la app abierta (silencioso, `interactive: false`), se pausa en segundo plano y no solapa lecturas. Se activa desde `LifeProvider` con sesión y permiso concedido. La tarea de 15 min en segundo plano no cambia.
- Pruebas: `foregroundPolling.test.ts` (7 casos, fake timers). `LifeProvider` no tiene pruebas de render en el repo, así que el efecto de cableado no tiene prueba propia.
- `expo lint` ya reportaba 2 errores `react-hooks/refs` en `LifeProvider.tsx` antes de este cambio.
- No verificado en un dispositivo real.

### 2026-10-21 — Seguridad: PHP 8.2.35 por CVE-2026-109618/109619 (RF-91)

- php.net publicó versiones de seguridad (8.2.35, 8.3.36, 8.4.27, 8.5.12) para dos RCE sin autenticación (CVSS 9.2). Detalle y guía en `docs/seguridad/AVISO-SEGURIDAD-PHP-CVE-2026-109618-109619.md`.
- Fijado `php:8.2.35-cli` en `backend/api/Dockerfile`, `php-version: "8.2.35"` en CI y `"php": "^8.2.35"` en `composer.json` (lock regenerado con `--lock`, sin cambios de paquetes).
- Verificado con PHP 8.2.35 local: `php artisan test` (356 en verde) y `pint --test`. No se construyó la imagen Docker ni se desplegó producción.
- `composer audit` sigue con 3 avisos ajenos (`league/commonmark`, `symfony/http-foundation`). PHP 8.2 llega a fin de vida el 31/12/2026: planear salto a 8.4.
- Rama: `hotfix/RF-91-php-cve-2026-109618`.

### 2026-10-24 — Suite E2E automática local (RNF-18)

- `npm run e2e` (en `frontend/web`) corre Playwright contra un stack Docker propio (`vitalsy-e2e`, puerto 18080, BD propia, `APP_ENV=e2e`) que se reinicia en cada corrida. Guía: `docs/operacion/pruebas-e2e.md`.
- Backend: límite de login configurable (`VITALSY_LOGIN_THROTTLE_PER_MINUTE`, 10 por defecto), reloj de pruebas `e2e:clock` (solo con `APP_ENV=e2e` y `E2E_CLOCK_ENABLED=true`; vive en `app/Support/E2E` para no autodescubrirse) y `E2ESeeder` (70 camas extra, se niega fuera de e2e).
- El entrypoint usa `php -S` cuando `APP_ENV=e2e`: `artisan serve` deja que `backend/api/.env` pise las variables del contenedor. El E2E guarda sesiones y caché en su BD: `storage/` es compartido con desarrollo y el reloj adelantado haría que el recolector borre las sesiones de desarrollo.
- Hallazgos nuevos que la suite deja en rojo (cada uno tiene su prueba y aparece en `frontend/web/e2e-results/hallazgos.csv` al correr la suite): ENC duplicado al registrar en paralelo (500), censo de ingresos sin control de rol, aviso «Orden confirmada.» que desaparece, brazalete con tildes (Code 128), expediente sin autor de constantes, avisos del detalle de alerta que desaparecen tras recargar, acuse del ERR que devuelve la alerta a enfermería, rol mensual que a veces muestra el mes anterior (intermitente). Además confirma HP-02, HP-04, HP-06, HP-07, HP-11 y HP-12.
- Rama: `feature/RNF-18-suite-e2e-clinical`.

<!-- END AGENT ANNOTATIONS -->
