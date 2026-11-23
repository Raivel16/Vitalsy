# Demostración funcional: roles, funciones y permisos

Guía de referencia rápida para saber **qué hace cada usuario** y **qué se le permite** en Vitalsy Clinical. Está pensada para la demostración: indica la cuenta con la que entrar, el menú que ve, las acciones que puede ejecutar y lo que debe quedarle prohibido.

El control de acceso es por rol (RNF-08): el catálogo tiene **15 roles operativos**, cada uno con una clave técnica única. No existen roles genéricos `enfermeria` ni `medico`: la clave determina el menú, las pantallas y los endpoints que puede usar. La misma clave es el prefijo de la cuenta de demostración (`{clave}@vitalsy.local`).

En el servidor no hay permisos por objeto ni policies: cada endpoint declara los roles permitidos y, además, los servicios validan las reglas de negocio (estado del ingreso, orden de los entregables, perfil asignado a una alerta, compatibilidad de una cama). Por eso un botón oculto en la interfaz también está bloqueado si se llama a la API directamente.

La fuente de verdad de los requisitos es [requerimientos.md](../requirements/requerimientos.md) y el detalle de cada proceso está en [docs/architecture/](../architecture/). La comprobación paso a paso de los permisos negativos está en [guia-de-pruebas-clinical.md](../operacion/guia-de-pruebas-clinical.md), sección 2.2 (casos N-01 a N-19).

## 1. Cómo entrar y reglas que aplican a todos

| Entorno | Dirección | Contraseña de todas las cuentas |
| --- | --- | --- |
| Desarrollo local (Docker en su máquina) | http://localhost:8080 | `Vitalsy.2026` |
| Laboratorio | La dirección que publique el pipeline. La web del compose de laboratorio usa el puerto 4200. | `password_ejemplo` |

La contraseña real de las cuentas demo es el valor de `DEMO_PASSWORD` en el `.env` del entorno. Si una cuenta nueva aparece con contraseña temporal, el sistema obliga a cambiarla antes de mostrar cualquier pantalla clínica.

| Regla | Qué significa en la práctica |
| --- | --- |
| Sesión con correo y contraseña (RF-99) | Sin sesión solo se ve **Iniciar sesión**. El login admite 10 intentos por minuto; al undécimo responde 429. |
| Cierre de sesión (RF-100) | El botón de salida del encabezado invalida el acceso. La tecla «atrás» no vuelve a mostrar datos clínicos. |
| Inactividad (RNF-09) | A los 5 minutos sin clic, tecla o desplazamiento vuelve a **Iniciar sesión** con el aviso «La sesión se cerró por inactividad…». El movimiento del ratón sin clic no cuenta. |
| Rol activo | Una cuenta desactivada no entra: «El correo o la contraseña no son correctos.». Por API, las peticiones de una cuenta inactiva devuelven 401. |
| Contraseña temporal (RF-102) | Mientras `must_change_password` esté activo, la web solo muestra el cambio de contraseña y la API responde 403 `password_change_required`. Mínimo 10 caracteres, con letras y números, distinta de la actual. |
| Control por rol (RNF-08) | Una ruta de otro perfil muestra «Esta vista no está disponible para su perfil. Se requiere …». Por API la respuesta es 403 «No tiene permiso para esta acción.». |
| Trazabilidad inmutable (RNF-07) | Ningún rol, incluido el administrador, puede editar ni borrar acuses de alerta, eventos del historial, escalamientos, dosis ya firmadas, evoluciones firmadas ni entregas de turno firmadas. No existen rutas HTTP para hacerlo. |
| Privacidad (RNF-06) | Los campos clínicos sensibles se guardan cifrados. Los roles solo ven lo que su pantalla necesita: por ejemplo, los códigos del plan de alta en Vitalsy Life los ve solo enfermería de piso; el resto ve el modo y el estado. |
| Notificaciones (RF-53) | La campana de la cabecera, el aviso emergente y la sirena aparecen solo para los perfiles destinatarios de una alerta: `enfermera_piso`, `auxiliar_enfermeria`, `enfermera_supervisora`, `medico_residente`, `medico_tratante` y `equipo_respuesta_rapida`. Confirmar la lectura calla la sirena. |

## 2. Mapa rápido: cuenta, menú y responsabilidad

«Inicio» (`/`) está disponible para los 15 roles. El resto del menú se filtra automáticamente.

| Rol (clave) | Cuenta demo | Menú lateral (además de Inicio) | Responsabilidad principal |
| --- | --- | --- | --- |
| `admision` | `admision@vitalsy.local` | Pacientes, Registrar ingreso | Proceso 1: orden, filiación, cobertura, brazalete, expediente y consentimiento |
| `camillero` | `camillero@vitalsy.local` | Pacientes, Egreso | Traslado, verificación de identidad y consulta del pase de salida |
| `enfermera_piso` | `enfermera_piso@vitalsy.local` | Pacientes, Expediente clínico, Laboratorio, Imágenes, Constantes, Controles, e-MAR, Cuidados, Alertas, Registrar deterioro, Egreso, Turnos y cobertura | Recepción, valoración, monitoreo, administración de fármacos y cierre del egreso |
| `auxiliar_enfermeria` | `auxiliar_enfermeria@vitalsy.local` | Pacientes, Expediente clínico, Constantes, Controles, Cuidados, Alertas, Registrar deterioro, Limpieza | Toma de constantes, cuidados directos, deterioro y equipamiento de unidades |
| `medico_residente` | `medico_residente@vitalsy.local` | Pacientes, Expediente clínico, Visita médica, Laboratorio, Imágenes, Evolución médica, Alertas, Egreso | Indicaciones basales, visita, evolución, respuesta a alertas y epicrisis |
| `medico_tratante` | `medico_tratante@vitalsy.local` | Igual que residente **más** CPOE | Plan terapéutico electrónico y apertura del alta |
| `enfermera_supervisora` | `enfermera_supervisora@vitalsy.local` | Pacientes, Controles, Alertas, Registrar deterioro, Reportes de alertas, Indicadores hospitalarios, Censo de camas, Limpieza, Turnos y cobertura | Escalamiento, camas y gestión diaria del personal |
| `equipo_respuesta_rapida` | `equipo_respuesta_rapida@vitalsy.local` | Pacientes, Alertas | Respuesta especializada y traslado a UCI |
| `trabajo_social` | `trabajo_social@vitalsy.local` | Pacientes, Egreso | Valoración social pre-egreso |
| `altas_caja` | `altas_caja@vitalsy.local` | Pacientes, Egreso | Estado de cuenta y pase de salida |
| `gestion_camas` | `gestion_camas@vitalsy.local` | Censo de camas, Indicadores hospitalarios | Solicitudes, censo y asignación de lechos |
| `servicios_generales` | `servicios_generales@vitalsy.local` | Limpieza | Desinfección terminal de la unidad |
| `jefatura_enfermeria` | `jefatura_enfermeria@vitalsy.local` | Reportes de alertas, Indicadores hospitalarios, Turnos y cobertura | Rol mensual y convocatoria de retén |
| `recursos_humanos` | `recursos_humanos@vitalsy.local` | Turnos y cobertura | Autorización de cobertura extraordinaria |
| `administrador_accesos` | `administrador_accesos@vitalsy.local` | Usuarios, Infraestructura de camas | Cuentas, roles y configuración de pabellones/camas |

Al pulsar **Atención** en la fila de un paciente hospitalizado, el destino depende del rol: residente y tratante abren el expediente, la auxiliar abre Constantes y la enfermera de piso abre e-MAR.

Rutas del menú: Pacientes `/pacientes`; Registrar ingreso `/pacientes/nuevo`; Expediente clínico `/atencion/chart`; Visita médica `/atencion/visita`; Laboratorio `/atencion/laboratorio`; Imágenes `/atencion/imagenes`; Evolución médica `/atencion/evolucion`; CPOE `/atencion/cpoe`; Constantes `/atencion/constantes`; Controles `/atencion/controles`; e-MAR `/atencion/emar`; Cuidados `/atencion/cuidados`; Alertas `/alertas`; Registrar deterioro `/alertas/deterioro`; Egreso `/egreso`; Censo de camas `/camas`; Limpieza `/camas/limpieza`; Turnos y cobertura `/personal`; Usuarios `/usuarios`; Infraestructura de camas `/infraestructura`.

Además existen dos pantallas de solo lectura para perfiles directivos, agrupadas bajo **Reportes** en el menú: `/alertas/reportes` (RF-114, supervisora y jefatura) y `/reportes/hospital` (RF-115, jefatura, supervisora y gestión de camas).

## 3. Qué puede hacer y qué permisos tiene cada usuario

### 3.1 Admisión (`admision`)

**Puede**
- Registrar un ingreso manualmente en **Registrar ingreso** o por la API de intake (`POST /hospital-admission/intake`).
- Consultar y confirmar la orden de internamiento (RF-01).
- Validar filiación y cobertura (RF-02); si la cobertura está pendiente o rechazada, derivar el trámite a caja o trabajo social con teléfono del familiar (RF-03). El brazalete queda bloqueado hasta que la cobertura esté aprobada.
- Emitir e imprimir el brazalete con código de barras propio del ingreso (RF-04).
- Aperturar el expediente clínico (RF-05).
- Registrar el consentimiento informado, indicar si el paciente usa Vitalsy Life y vincular su línea de base con un código `VL-XXXX-XXXX` (RF-06, RF-95). Desde septiembre de 2026 el consentimiento exige que Gestión de camas ya haya asignado una cama del censo: sin ella responde 422.
- Consultar el censo del proceso 1, abrir la ficha del ingreso y buscar pacientes escaneando el brazalete (RF-17–RF-20).

**No puede**: asignar camas, confirmar recepción en piso, registrar constantes clínicas, prescribir, administrar medicamentos, dar altas ni acceder a `/camas`, `/egreso`, `/atencion/cpoe` o `/atencion/emar`.

### 3.2 Celador / Camillero (`camillero`)

**Puede**
- Consultar la orden de traslado con habitación y lecho, y confirmarla (RF-07).
- Verificar la identidad del paciente escribiendo o escaneando el código del brazalete; un escaneo válido confirma sin segundo clic (RF-08). El código debe corresponder al ingreso abierto.
- Buscar ingresos del censo por brazalete (RF-20) y consultar su ficha.
- En `/egreso`, consultar las autorizaciones de salida y la ficha del pase emitido (RF-65).

**No puede**: registrar ingresos ni consentimientos, confirmar recepción en piso, emitir pases de salida ni registrar la salida efectiva; solo traslada al paciente.

### 3.3 Enfermera de piso (`enfermera_piso`)

**Puede**
- Proceso 1: confirmar recepción física en piso (RF-09), notificar reubicación con motivo y lecho disponible —sin asignar la cama— (RF-10), hacer la valoración inicial (RF-11), registrar constantes basales (RF-12), la conciliación farmacéutica de ingreso/BPMH (RF-13) y las escalas de riesgo (RF-14), y revisar el Kardex (RF-15).
- Proceso 2: registrar constantes y ver su gráfica y NEWS2 (RF-26–RF-29), consultar laboratorio e imágenes, escribir notas de evolución de enfermería (RF-36), marcar cuidados directos, consultar el expediente consolidado (RF-38), gestionar la bandeja de controles (RF-42) y usar el e-MAR.
- e-MAR: ver dosis del turno y vencidas, verificar los cinco correctos con códigos de brazalete y medicamento, bloquear ante inconsistencias y firmar cada dosis administrada (RF-32–RF-35).
- Alertas: acusar recepción, hacer nueva toma y recalcular NEWS2, programar controles cuando NEWS2 es 0, solicitar atención médica por «nurse's worry», autorizar y ejecutar traslado/retorno de UCI (RF-39–RF-53).
- Proceso 4: consultar la medicación para conciliar, registrar la conciliación de egreso (RF-59–RF-60), generar el informe de alta y el plan de seguimiento en Vitalsy Life —con códigos QR `VLA-`/`VLI-`— (RF-61, RF-96–RF-97), registrar la recepción de indicaciones por paciente o familiar (RF-62) y **registrar la salida efectiva** (RF-66), que libera la cama y dispara la limpieza.
- Proceso 6: consultar `/personal` para la entrega de turno y la cobertura.

**No puede**: modificar o continuar el plan CPOE (solo tratante), emitir el pase de salida (solo caja), asignar o habilitar camas en `/camas`, publicar roles ni administrar usuarios.

### 3.4 Auxiliar de enfermería (`auxiliar_enfermeria`)

**Puede**
- Registrar constantes vitales basales (RF-12) y de monitoreo (RF-26); el expediente muestra quién registró cada lectura.
- Registrar la finalización de actividades de higiene y cuidados básicos, con autor y hora (RF-37).
- Registrar deterioro observado de forma imprevista (RF-40), consultar alertas —y confirmar la recepción cuando suene la sirena— y usar la bandeja de controles. En el detalle de la alerta no tiene el panel de cuidado de enfermería (ese panel es de enfermera de piso y supervisora).
- Consultar el expediente clínico del ingreso (RF-38).
- En `/camas/limpieza`, marcar una unidad como equipada tras la desinfección (RF-76).

**No puede**: usar e-MAR ni CPOE, hacer la valoración inicial ni la conciliación farmacéutica, registrar altas ni salidas, ni publicar roles.

### 3.5 Médico residente (`medico_residente`)

**Puede**
- Revisar valoración, constantes, BPMH y escalas, y firmar electrónicamente las indicaciones médicas basales (RF-16).
- Consultar el expediente consolidado y la visita médica con laboratorio, imágenes y notas de enfermería (RF-23).
- Registrar notas de evolución médica (RF-24) —quedan congeladas al firmarse—.
- Atender alertas: confirmar recepción, registrar evaluación e indicaciones de urgencia (RF-47, RF-49), solicitar al Equipo de Respuesta Rápida (RF-50), autorizar traslado a UCI.
- En el egreso: iniciar la orden de alta (RF-54), escribir la epicrisis (RF-55) y emitir recetas ambulatorias (RF-56).

**No puede**: modificar el plan CPOE (es exclusivo del tratante), administrar medicamentos en e-MAR, registrar salida efectiva ni emitir pases de salida.

### 3.6 Médico tratante (`medico_tratante`)

**Puede**
- Todo lo anterior en indicaciones basales, visita, evolución y alertas (bandeja compartida con residente).
- **CPOE (RF-25)**: crear y modificar el plan activo, elegir frecuencia y primera dosis, agregar o quitar medicamentos, y actualizar el Kardex; el sistema programa las dosis que después ve la enfermera en e-MAR.
- Iniciar el proceso de alta registrando la orden digital (RF-54). En la demostración de [alta.md](alta.md) es quien abre el alta.

**No puede**: usar e-MAR, registrar la salida efectiva ni emitir pases de salida.

### 3.7 Enfermera supervisora de piso (`enfermera_supervisora`)

**Puede**
- Recibir el escalamiento de alertas no atendidas y las derivadas a SUPERVISORA por SLA (RF-45, RF-48), ver `/alertas`, acusar recepción, registrar deterioro y —en el detalle de la alerta— recalcular NEWS2, programar controles y solicitar atención médica, además de autorizar o registrar el traslado a UCI.
- En `/camas`: registrar proyecciones de altas (RF-71), confirmar la recepción de una asignación de lecho notificada por gestión de camas (RF-73) y habilitar la cama en el censo al terminar el ciclo de limpieza (RF-77).
- En `/camas/limpieza`: habilitar la unidad (RF-77).
- En `/personal`: sugerir y aprobar la distribución diaria de pacientes balanceada por NEWS2 (RF-79–RF-80), registrar inasistencias con motivo y ver el rebalanceo (RF-84–RF-85), y confirmar el ingreso efectivo del personal de retén (RF-88).
- Consultar los reportes de monitoreo de alertas (RF-114, `/alertas/reportes`) y los indicadores hospitalarios (RF-115, `/reportes/hospital`).

**No puede**: registrar altas ni salida efectiva, usar e-MAR ni CPOE, publicar el rol mensual (solo jefatura) ni autorizar cobertura extraordinaria (solo RR. HH.).

### 3.8 Equipo de Respuesta Rápida (`equipo_respuesta_rapida`)

**Puede**
- Ver su bandeja de alertas, confirmar la lectura —calla la sirena sin cambiar el estado— y registrar su evaluación (RF-48, RF-51).
- Emitir la orden de traslado a UCI cuando corresponde; médico y enfermera deben autorizarla antes del traslado efectivo. El traslado efectivo y el retorno a sala los registran los roles de enfermería; el traslado también está permitido por API a la supervisora y al camillero, aunque el camillero no tiene acceso al detalle de alertas en la interfaz.

**No puede**: registrar constantes, acusar una alerta como enfermería, prescribir en CPOE, administrar medicamentos ni gestionar altas.

### 3.9 Trabajo social (`trabajo_social`)

**Puede**: ver el listado de altas nuevas que le notifica el sistema (RF-57) y registrar la valoración social pre-egreso con informe y entorno adecuado (RF-58) en `/egreso`.

**No puede**: iniciar o cerrar el alta, consultar el expediente clínico (`/atencion/chart`), prescribir ni emitir pases.

### 3.10 Altas y caja (`altas_caja`)

**Puede**: consultar y validar el estado de cuenta hospitalaria (RF-63), marcar la liquidación conforme y emitir el pase de salida digital (RF-64) en `/egreso`. El pase solo se emite si la cuenta está conforme y ya están registradas la valoración social, el informe de enfermería y la recepción de indicaciones; intentarlo antes devuelve un error de regla pendiente.

**No puede**: registrar la salida efectiva (RF-66, solo enfermera de piso), hacer valoración social ni registrar constantes.

### 3.11 Gestión de camas (`gestion_camas`)

**Puede**
- Registrar solicitudes de cama (RF-68), ver el censo hospitalario en tiempo real (RF-69), consultar la lista de espera priorizada (RF-70) y ver las proyecciones de alta cargadas por la supervisora.
- Ver sugerencias de lecho por aislamiento, especialidad y género (RF-72) y **confirmar la asignación** (RF-73). La asignación queda notificada a la supervisora hasta que esta la reconoce.
- Consultar los indicadores hospitalarios de RF-115 en `/reportes/hospital`.

**No puede**: confirmar su propia asignación —lo hace la supervisora—, limpiar/habilitar camas, configurar infraestructura ni consultar `/pacientes` o `/egreso`.

### 3.12 Servicios generales / Limpieza (`servicios_generales`)

**Puede**: ver las órdenes de limpieza terminal generadas automáticamente al egresar un paciente (RF-74) y registrar la desinfección estándar o profunda con el checklist obligatorio de 4 ítems (RF-75) en `/camas/limpieza`.

**No puede**: marcar la unidad equipada ni habilitarla (auxiliar y supervisora, respectivamente), ver el censo `/camas`, ni consultar alertas.

### 3.13 Jefatura de enfermería (`jefatura_enfermeria`)

**Puede**
- Armar la matriz mensual de turnos (D/N/L/R) en `/personal`, agregar colaboradores al rol y **publicar el rol mensual oficial** (RF-78). Publicar reemplaza el mes completo y pide confirmación.
- Aprobar la convocatoria de personal de retén (RF-86).
- Consultar los reportes de alertas (RF-114) y los indicadores hospitalarios (RF-115).

**No puede**: registrar inasistencias ni aprobar asignaciones diarias (supervisora), autorizar la cobertura extraordinaria (RR. HH.) ni ejecutar acciones clínicas.

### 3.14 Recursos humanos (`recursos_humanos`)

**Puede**: consultar las solicitudes de cobertura en `/personal` y **autorizar la cobertura extraordinaria** (RF-87) cuando jefatura ya aprobó la convocatoria de retén. La transición `solicitada → aprobada_jefatura → autorizada → confirmada` valida el estado previo; no se pueden saltar pasos.

**No puede**: publicar el rol mensual, registrar inasistencias ni confirmar el ingreso del retén (supervisora).

### 3.15 Administrador de accesos (`administrador_accesos`)

**Puede**
- En `/usuarios`: listar y filtrar cuentas por rol y estado (RF-101), crear una cuenta con un único rol operativo y contraseña temporal (RF-102), corregir datos o cambiar el rol (RF-103) y desactivar cuentas sin borrarlas (RF-104). La desactivación es reversible y conserva la trazabilidad. No puede cambiar su propio rol ni desactivarse a sí mismo, y debe quedar al menos un administrador activo.
- En `/infraestructura`: crear y editar pabellones y camas (RF-110), desactivar (reversible) o borrar lógicamente camas y pabellones (RF-111), dar de alta camas en lote con vista previa —tope 200 camas y hasta 6 por habitación— (RF-112) y consultar la bitácora de cambios.

**No puede**: desactivar ni borrar una cama ocupada o en limpieza; una cama desactivada o borrada no se ofrece, sugiere ni asigna. Tampoco tiene acceso a pantallas clínicas: `/pacientes`, `/alertas`, `/egreso`, `/camas` ni a datos de pacientes.

### 3.16 Paciente, familiar y usuario ciudadano (fuera de la web clínica)

No son roles de la web de Vitalsy Clinical. Aparecen como actores de proceso:
- Firman el consentimiento informado asistidos por admisión o enfermería (RF-06).
- Usan la app **Vitalsy Life** con su propia cuenta: gestionan permisos de compartición y el código `VL-` (RF-89–RF-94, RF-113), reclaman el plan post-alta con su código `VLA-` (RF-97) y controlan los datos de biometría.
- Confirman la recepción de indicaciones de alta, asistidos por enfermería (RF-62).

## 4. Quién ejecuta cada acción crítica

| Acción | Único rol o roles autorizados | RF |
| --- | --- | --- |
| Confirmar la orden de internamiento y emitir brazalete | `admision` | RF-01, RF-04 |
| Confirmar traslado y verificar identidad | `camillero` | RF-07, RF-08 |
| Confirmar recepción en piso | `enfermera_piso` | RF-09 |
| Registrar valoración, BPMH y escalas | `enfermera_piso` | RF-11, RF-13, RF-14 |
| Registrar constantes | `enfermera_piso`, `auxiliar_enfermeria` (también el sistema por API) | RF-12, RF-26 |
| Firmar indicaciones basales | `medico_residente`, `medico_tratante` | RF-16 |
| Modificar el plan CPOE | `medico_tratante` | RF-25 |
| Administrar y firmar dosis en e-MAR | `enfermera_piso` | RF-32–RF-35 |
| Registrar cuidados directos | `auxiliar_enfermeria` (notas también `enfermera_piso`) | RF-36, RF-37 |
| Acusar una alerta de enfermería | `enfermera_piso` | RF-44 |
| Evaluar alerta y solicitar ERR | `medico_residente`, `medico_tratante` | RF-47, RF-49, RF-50 |
| Evaluar al ERR y ordenar UCI | `equipo_respuesta_rapida` | RF-51 |
| Registrar valoración social | `trabajo_social` | RF-58 |
| Conciliar fármacos al alta, generar informe y plan Life | `enfermera_piso` | RF-60, RF-61, RF-96 |
| Emitir pase de salida | `altas_caja` | RF-64 |
| Registrar salida efectiva | `enfermera_piso` | RF-66 |
| Registrar solicitud y asignar lecho | `gestion_camas` | RF-68, RF-73 |
| Confirmar la asignación notificada | `enfermera_supervisora` | RF-73 |
| Registrar desinfección | `servicios_generales` | RF-75 |
| Marcar unidad equipada | `auxiliar_enfermeria` | RF-76 |
| Habilitar cama en el censo | `enfermera_supervisora` | RF-77 |
| Publicar rol mensual / aprobar retén | `jefatura_enfermeria` | RF-78, RF-86 |
| Autorizar cobertura extraordinaria | `recursos_humanos` | RF-87 |
| Confirmar ingreso del retén | `enfermera_supervisora` | RF-88 |
| Administrar cuentas e infraestructura | `administrador_accesos` | RF-101–104, RF-110–112 |
| Consultar reportes de alertas | `enfermera_supervisora`, `jefatura_enfermeria` | RF-114 |
| Consultar indicadores hospitalarios | `jefatura_enfermeria`, `enfermera_supervisora`, `gestion_camas` | RF-115 |

## 5. Permisos negativos: cómo comprobarlos

Haga la prueba de dos formas: escribiendo la URL con la sesión del rol indicado y, cuando sea posible, llamando a la API desde la consola del navegador (`fetch('/api/v1/users',{credentials:'include'}).then(r=>r.status)`). En la web debe aparecer el mensaje de vista no disponible; por API, 403.

| ID | Cuenta | Intento | Resultado esperado |
| --- | --- | --- | --- |
| N-01 | `admision` | `/atencion/cpoe`, `/atencion/emar`, `/egreso`, `/camas` | Vista no disponible |
| N-02 | `camillero` | `/pacientes/nuevo`, `/admision/consentimiento` | Vista no disponible |
| N-03 | `auxiliar_enfermeria` | `/atencion/emar`, `/atencion/cpoe` | Vista no disponible |
| N-04 | `medico_residente` | `/atencion/cpoe` | Vista no disponible (solo tratante) |
| N-05 | `medico_tratante` | `/atencion/emar` | Vista no disponible |
| N-06 | `enfermera_piso` | `/camas`, `/usuarios`, `/atencion/cpoe` | Vista no disponible |
| N-07 | `enfermera_supervisora` | `/egreso` | Vista no disponible |
| N-08 | `trabajo_social` | `/pacientes/nuevo`, `/atencion/chart` | Vista no disponible |
| N-09 | `gestion_camas` | `/pacientes`, `/camas/limpieza` | Vista no disponible |
| N-10 | `servicios_generales` | `/camas`, `/alertas` | Vista no disponible |
| N-11 | `recursos_humanos` | `/personal`: publicar rol | Pantalla abre, pero sin «Publicar rol mensual oficial»; API 403 |
| N-12 | `jefatura_enfermeria` | `/personal`: registrar inasistencia o asignar | Sin botón; API 403 |
| N-13 | Cualquier otro rol | `/usuarios`, `GET /api/v1/users` | Vista no disponible / 403 |
| N-14 | `equipo_respuesta_rapida` | Registrar constantes o acusar como enfermería | Sin acceso; API 403 |
| N-15 | `enfermera_piso` | Emitir pase de salida | 403 (solo `altas_caja`) |
| N-16 | `altas_caja` | Registrar salida efectiva | 403 (solo `enfermera_piso`) |
| N-17 | `administrador_accesos` | `/pacientes`, `/alertas`, API clínica | Vista no disponible / 403; nadie puede editar historial de alertas |
| N-18 | Cuenta desactivada | Iniciar sesión | «El correo o la contraseña no son correctos.» |
| N-19 | Cuenta con contraseña temporal | Llamar a la API clínica | 403 `password_change_required`; solo pantalla de cambio |

La guía completa de demostración está en [guia-de-pruebas-clinical.md](../operacion/guia-de-pruebas-clinical.md). Los recorridos por proceso están en [admision.md](admision.md), [monitoreo-alertas.md](monitoreo-alertas.md) y [alta.md](alta.md).

## 6. Cuentas con nombre y casos especiales de la demostración

Además de las 15 cuentas por rol, `db:seed` crea 22 personas con nombre (`nombre.apellido@vitalsy.local`) que se usan en los selectores de `/personal` y en el relevo de turno: `rosa.quispe`, `lucia.mendoza`, `carmen.huaman`, `patricia.salas`, `elena.vargas`, `mariela.torres` (enfermería de piso); `andres.castillo`, `valeria.nunez` (residentes); `ricardo.paredes`, `sofia.landa` (tratantes); `jorge.ramos` (auxiliar); `diana.flores` (admisión); `marco.rivas` (camillero); `teresa.ibanez` (supervisora); `alvaro.guerra` (ERR); `claudia.rojas` (trabajo social); `hugo.palacios` (altas/caja); `natalia.cruz` (gestión de camas); `pedro.ccori` (servicios generales); `gloria.valdivia` (jefatura); `monica.aguilar` (RR. HH.); `ivan.salazar` (administrador).

Casos útiles para probar permisos:
- **Relevo de turno:** `lucia.mendoza` consolida y firma la entrega de `rosa.quispe` durante la ventana sembrada (unas 3 horas desde `db:seed`).
- **Alta de usuario:** al crear `qa.nueva@vitalsy.local` desde `/usuarios`, la cuenta nace con contraseña temporal y solo ve el cambio de contraseña; después entra con el rol asignado.
- **Cambio de rol:** al modificar el rol de una cuenta, el menú cambia en su próximo inicio de sesión.
- **Desactivación:** la cuenta deja de entrar, pero sus registros clínicos conservan el autor.

## 7. Alcance y límites de este documento

- Los permisos descritos corresponden a lo implementado y documentado en el corte actual; cuando un requisito es parcial se indica: RF-80 no notifica de forma persistente a la enfermera y RF-82 guarda el reporte de handover sin validación separada.
- El administrador de accesos **no** es un superusuario clínico: su privilegio se limita a cuentas e infraestructura.
- La latencia en tiempo real y la reconexión (RNF-01/RNF-12), el cifrado y los disparadores de inmutabilidad en PostgreSQL y la app con la banda BLE no están verificados en ejecución en este entorno; ver las limitaciones de la [guía de pruebas](../operacion/guia-de-pruebas-clinical.md#8-limitaciones-de-esta-guía).
