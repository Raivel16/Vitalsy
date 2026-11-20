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

- 2026-10-24 (RNF-18, corrida completa desde cero, semilla 1674140881): 196 pruebas, 178 en verde y 18 rojas, todas hallazgos registrados salvo E4-01 «el tratante inicia el alta…», que agotó el tiempo esperando la fila del buscador con 4 workers y piso lleno, y pasó 3/3 sola: tratar como intermitente por carga hasta investigarlo.

- 2026-10-25 (corrección de hallazgos de la suite E2E, PR #38–#43, ramas apiladas sobre `feature/RNF-18-suite-e2e-clinical`): corregidos ENC duplicado, censo y detalle de ingresos sin control de rol (N-17), HP-11 (HTML al imprimir), HP-02 (brazalete del ingreso abierto), acuse del ERR (RF-49), código de brazalete solo ASCII, HP-06, HP-08, HP-12, avisos que desaparecían («Orden confirmada.» y detalle de alerta), autoría de constantes (RF-26, migración `author_user_id`), HP-04 (el e-MAR ya no revela códigos; `php artisan emar:codes ENC-XXXX` para quien prueba) y HP-07 (el consentimiento exige cama del censo; el seeder E2E agrega pabellones de volumen). Pendientes: E4-01 y E6-06 (inestables bajo carga) y que `GET prescriptions/active` sigue devolviendo `drugBarcode` a `enfermera_piso` por API.

- 2026-10-25 (cierre, PR #44–#46): `GET prescriptions/active` ya no entrega `drugBarcode` a `enfermera_piso`; limitación conocida: el código sigue siendo derivable de nombre y dosis (`DRUG-{NOMBRE}-{DOSIS}`), cerrarlo exige un código por medicamento desde un maestro de farmacia. E6-06 no era un defecto intermitente de la app: la E2E esperaba la carga con `getByLabel` sobre un texto que no es etiqueta, así que no esperaba nada; además el panel del rol mensual mostraba y dejaba publicar el mes anterior mientras cargaba (corregido). `reverb` ya arranca con `pcntl` (rama `bugfix/RNF-01-reverb-pcntl`, desde `dev`). Pendiente: E4-01 y N-01 fallan solo bajo carga (pasan solas).

- 2026-10-25 (hallazgos HP-01/03/05/09/10): servicio `scheduler` (`schedule:work`) en compose dev/prod; `APP_TIMEZONE` por defecto `America/Lima` (phpunit fija UTC); `documentNumber` solo dígitos en el servidor; `.env.example` sin variables inertes y con nota de certificados de desarrollo (`generate-dev-certs.sh`). Pendiente en dev existente: `docker compose up -d --build` para levantar `scheduler`.

- 2026-10-25 (RF-110–112, infraestructura de camas): `administrador_accesos` configura pabellones y camas en `/infraestructura` (API `/bed-infrastructure`). Desactivar es reversible; borrar es lógico (`deleted_at`) y conserva `bed_assignments`/`cleaning_orders`; no se desactiva ni borra una cama ocupada o en limpieza; crear una cama borrada con el mismo código la restaura. `Bed::enabled()` filtra asignación, sugerencias y censo. `DemoInfrastructureSeeder` (~34 camas) corre en `db:seed` salvo en `APP_ENV=e2e`; los seeders respetan lo borrado (`SeedsInfrastructure`). Alta en lote: tope 200 camas, hasta 6 por habitación.

- 2026-10-30 (RF-113, banda Vitalsy por BLE, fases F0 + F1): firmware del ESP32-C3 SuperMini + MAX30102 en `firmware-esp32c3/`, con repo Git local propio e ignorado por `.gitignore` (nunca se sube). El algoritmo de pulso y SpO2 se movió sin cambios a `Oximetro.h/.cpp`; un script confirmó que las 338 líneas del algoritmo están idénticas y en orden. BLE con NimBLE-Arduino 2.x: Heart Rate `0x180D` (pulso + RR), Pulse Oximeter `0x1822` (SpO2, pulso, PI y bits de calidad), Device Information y servicio propio Vitalsy (estado y control). Bonding con LE Secure Connections «Just Works»; sin cifrado no se envía ninguna medida. Contrato versionado en `docs/architecture/protocolo-banda-ble.md`. **No compilado aquí**: no hay `arduino-cli` y no se autorizó descargarlo. Falta compilar en el Arduino IDE (core esp32 3.3.12) y probar con nRF Connect. Pendiente F2 (app): `react-native-ble-manager` por verificar con Expo 57 / RN 0.86, origen `vitalsy_band` en app y `LifeSync::ORIGINS`. Rama: `feature/RF-113-banda-ble`.

- 2026-10-30 (RF-113, fases F2–F4): la app conecta la banda en `movil/src/modules/band/` con `react-native-ble-manager` 12.6.1 (plugin con `neverForLocation`; iOS `bluetooth-central`). Exige development build: no funciona en Expo Go. La banda agrega por minuto (pulso y SpO2 medianos, RMSSD) y guarda 24 h en RAM. La app descarga, guarda con `life.addSamples` (origen `vitalsy_band`, id `vb:<dispositivo>:<tipo>:<minuto>`) y solo después confirma (comando `05`) para que la banda borre. La banda **no** es una `HealthDataSource` porque la cola de lectura depende del permiso de Health Connect. La tarea de fondo de 15 min ejecuta primero la banda y luego Health Connect, y se programa también sin Health Connect si hay banda vinculada. Backend: `LifeSync::ORIGINS` acepta `vitalsy_band`. Firmware 0.2.0 (repo local `firmware-esp32c3/`): `Historial`, `Bateria` (`PIN_BATERIA` -1 = sin medir) y CPU a 80 MHz. El algoritmo sigue idéntico. Se agregó `eslint.config.js` y `npm run lint` en `movil` (`expo lint`): los 2 errores `react-hooks/refs` de `LifeProvider` ya existían. Verificado: Jest de la app 40 suites y 333 pruebas, `tsc` y las pruebas de Life del backend. **No verificado**: compilación del firmware y prueba con la banda real. Faltan acelerómetro, OTA por BLE e historial persistente en flash.

- 2026-10-31 (RF-113, ajustes tras la primera prueba con la banda): la banda se asocia a la cuenta que la vinculó (`PairedBand.accountId`): otra cuenta del mismo teléfono no la ve, no se conecta y no guarda sus datos; `apply` comprueba la sesión al guardar y, si no coincide, no confirma a la banda. Firmware: hora anterior a 2025-01-01 rechazada, y la confirmación solo borra lo enviado en esa conexión. Perfil › Dispositivos solo vincula u olvida; Hoy muestra el valor en vivo de la banda en las tarjetas de Pulso y SpO2 (`applyBandLive`), conserva la última lectura 5 min sin dedo y luego vuelve a lo guardado. `preferBand` ignora al mostrar y calcular las lecturas de Health Connect a menos de 5 min de una de la banda (no borra nada). La lectura de Health Connect al abrir la app es silenciosa (`syncHealthQuietly`): la pantalla de permisos solo sale con el botón, y `readGranted` ahora inicializa el módulo (antes solo lo hacía `requestAccess`, así que la lectura sin permisos, también la de segundo plano en frío, podía fallar). Logo e icono apilados («Vitalsy» arriba, «Life» abajo) con `scripts/generate-brand-assets.mjs`; modo inmersivo con `expo-navigation-bar`; tabs con aire simétrico. Aviso de build: `expo prebuild --clean` falla en silencio (EBUSY) si queda un `expo run:android` abierto; hay que cerrarlo para que los iconos y el splash se regeneren. Para compilar en Windows con Android Studio reciente hay que usar el JDK 21 (`JAVA_HOME`), no el JBR 25. Pendiente: passkey (vinculación con código), historial persistente en flash, acelerómetro y OTA.

- 2026-10-31 (RF-113, clave de 6 dígitos): la banda genera una clave aleatoria (NVS, `Vinculacion.h/.cpp`), la imprime por serie y vincula con IO DisplayOnly + MITM; el estado y el control exigen enlace autenticado y solo se admite un teléfono (el segundo vínculo se borra). Serie: `k` ver clave, `b` borrar vínculos y clave nueva. App: `BandClient.connect(..., {pairing})` deja de ignorar el error de `createBond` al vincular (clave incorrecta o diálogo cancelado), el controlador muestra «No se pudo vincular. Revisa la clave de 6 dígitos…» y la tarjeta de Perfil explica que se escribe la clave de la banda. **No compilado ni probado con la banda**: hay que recompilar el firmware, anotar la clave del monitor serie, olvidar la banda en Ajustes › Bluetooth y en la app, y vincular de nuevo. No evita una banda falsa con el mismo nombre (pendiente clave por dispositivo).

- 2026-11-01 (RNF-06, una sola configuración en la API de desarrollo): `ENC-PRAC-*` daba 500 (`UndecryptableFieldException`) porque `php artisan serve` descartaba las variables del compose y leía `backend/api/.env`, con otra `APP_KEY` que `db:seed` y el planificador. `dev-entrypoint.sh` ahora usa `--no-reload` y manda el compose. **Antes de aplicarlo en un equipo**, comparar las dos `APP_KEY`: si difieren, copiar al `.env` raíz la de `backend/api/.env` o la API dejará de leer lo que cifró con ella. El cambio también pasa la API a `BROADCAST_CONNECTION=reverb` (antes `log`: las alertas no llegaban a Reverb en desarrollo), `SESSION_DRIVER=file` (hay que volver a iniciar sesión), `CACHE_STORE=file` y `QUEUE_CONNECTION=sync`; ya no reinicia sola al editar `.env`. Verificado: 411 pruebas del backend, y por Nginx login, detalle de ingresos y un evento recibido por WebSocket. Pendiente: `ClinicalAlertObserver::emit` difunde en `DB::afterCommit` fuera del `try/catch` de `safely()`; dentro de una transacción, con Reverb caído, `BroadcastException` se propaga con la alerta ya guardada. Rama: `bugfix/RNF-06-clave-unica-docker`.

- 2026-11-09 (RF-114, práctica individual de arquitectura sobre el Proceso 3): `GET /api/v1/clinical-alerts/reports` (`AlertReportService`, solo `enfermera_supervisora` y `jefatura_enfermeria`) y pantalla `/alertas/reportes` con indicadores de acuse (≤ 5 min), escalamiento, respuesta médica (≤ 15 min), UCI, severidad/origen/estado, NEWS2 y detalle diario; filtros período ≤ 90 días, severidad, origen y servicio. El tope de 90 días se comprueba **después** de validar las fechas (antes leía la query cruda). Cypress 16.2 entra en git (`frontend/web/cypress/`, 7 specs, 12 pruebas, 12/12 contra :8080); `cypress.config.ts` y `cypress/support/` tienen pruebas Vitest y entran en la cobertura (sin ellas SonarQube bajaba de 91,8 % a 91,7 %). Para correrlo desde la terminal de VS Code: `unset ELECTRON_RUN_AS_NODE`; usa un paciente por corrida (el entorno no da altas y se agotan las camas). Pendiente: a 1366 px los toasts de RF-53 tapan formularios (las pruebas usan 1920×1080). El Dockerfile web ya no copia los archivos de Playwright retirados. Informe y evidencias en `docs/practica-individual-arq-raivel/`; guía en `docs/operacion/pruebas-cypress-alertas.md`. Rama: `feature/RF-114-reportes-monitoreo-alertas`.

### 2026-11-10 · RF-114 · capturas de Cypress a 1920 px y base limpia

- Las capturas de Cypress salían recortadas a la derecha: en modo sin interfaz el navegador abre a 1280×720 y la vista es de 1920 px. `cypress.config.ts` ahora abre la ventana a 1920×1080 (`before:browser:launch`) y `cypress/support/e2e.ts` captura solo el área visible (la captura completa repetía el menú lateral). Cubierto en `cypress/support/support.test.ts`.
- Antes de la corrida de evidencias se respaldó la base de desarrollo y se recreó con `migrate:fresh --seed` (tenía alertas pendientes de pruebas viejas). Corrida: 12/12 en 3 min 42 s; evidencias e informe de la práctica actualizados.

### 2026-11-16 · RF-115 · tablero de indicadores hospitalarios

- `GET /api/v1/reports/hospital` (`HospitalIndicatorsService`, roles `jefatura_enfermeria`, `enfermera_supervisora` y `gestion_camas`) y pantalla `/reportes/hospital` con ocupación de camas por sala y estado, ingresos/altas por día, estancia promedio, recambio de cama y cumplimiento del acuse de alertas. Filtros: período ≤ 90 días y sala; las alertas no se filtran por sala porque `clinical_alerts` no guarda la cama. Diseño y reglas de cálculo en `docs/architecture/reportes-hospitalarios.md`.
- La rama sale de `main` con RF-114 fusionado porque `origin/dev` va un commit atrasado y RF-114 aún no entra a `dev`.

- 2026-11-20 (RF-115, práctica grupal de arquitectura): se retiró `docs/practica-individual-arq-raivel/` del repositorio (12 MB de entregables personales; el servidor de calidad mide todo lo versionado y las carpetas pesadas restan nota). Los reportes de `coverage-reports/` se regeneraron con la rama RF-115 (PHPUnit 452 pruebas, Vitest 480). Análisis local con SonarQube Community 26.9 y sonar-scanner-cli: Quality Gate OK, cobertura 91,3 %, duplicación 1,5 %, 0 bugs/vulnerabilidades/hotspots y 0 smells tras cambiar `FormEvent` (obsoleto, `typescript:S1874`) por `SubmitEvent`. Nada se subió al remoto del laboratorio. El informe grupal queda fuera de git (`.git/info/exclude`).

### 2026-11-20 · RNF-13 · despliegue continuo en AWS y dos destinos de `main`

- **Dos destinos de `main`, no mezclarlos.** El GitLab del laboratorio recibe una copia de `main` y solo cuenta para la nota de SonarQube. SonarCloud `Raivel16_Vitalsy` es el espejo que se usa para predecirla y debe quedar en valores de 20. El mismo `main` se despliega en AWS EC2 (`docs/devops/despliegue-produccion.md`). Todo cambio que entre a `main` tiene que mantener la nota y construir en producción. Por eso los scripts operativos y los secretos viven solo en el servidor, nunca en el repositorio. El detalle está en `CLAUDE.md`, sección «Dos destinos de `main`».
- Se retiró el servicio `backup` de `docker-compose.prod.yml`. Montaba `scripts/backup-db.sh`, que se había retirado del repo el 2026-10-26, así que nunca arrancó. La demo de AWS no conserva datos ante fallas. El respaldo manual se hace con `pg_dump` (`docs/operacion/recuperacion-ante-desastres.md`).
- `DEMO_PASSWORD` ahora pasa al backend de producción para sembrar los datos demo con `db:seed --force`.
- `.github/workflows/deploy.yml`: cuando el CI de un push a `main` termina en verde, entra por SSH con una llave que solo puede ejecutar `/home/ubuntu/deploy-vitalsy.sh`, un script que vive en el servidor. Ese script valida el commit, construye, levanta, migra, comprueba `/api/health` y, si algo falla, vuelve al commit anterior. Si faltan los secretos `DEPLOY_*`, el job se omite sin fallar.
- Se corrigieron las referencias a los scripts retirados (`check-tls.sh`, `pre-push.sh`, `restore-db.sh`, `verify-backup.sh`, `scripts/load/`) en `docs/` y `CLAUDE.md`.
