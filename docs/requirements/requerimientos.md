# Requerimientos del Proyecto Vitalsy

## 1. Objetivo

La plataforma web Vitalsy debe digitalizar, coordinar y automatizar la gestión clínica y operativa de pacientes hospitalizados, con foco en seguridad, trazabilidad, interoperabilidad y respuesta clínica en tiempo real.

## 2. Requerimientos Funcionales

A continuación se detallan los requisitos funcionales organizados por módulos del proceso de atención hospitalaria.

### Módulo 1: Admisión y Recepción del Paciente Hospitalizado

1. RF-01: Consultar orden de internamiento digital. El sistema debe permitir visualizar en la interfaz web de admisiones la orden de internamiento digital enviada por el servicio emisor. Actor: Personal administrativo de admisión.
2. RF-02: Validar datos filiatorios y cobertura sanitaria. El sistema debe permitir validar los datos del paciente y el estado de su cobertura sanitaria, aprobando la ficha digital de ingreso cuando esta es válida. Actor: Personal administrativo de admisión.
3. RF-03: Derivar trámites de cobertura pendientes. El sistema debe permitir registrar y notificar al familiar la necesidad de trámite previo en caja o trabajo social cuando la cobertura presente inconformidades. Actor: Personal administrativo de admisión.
4. RF-04: Emitir brazalete de identificación con código de barras. El sistema debe generar e imprimir un brazalete físico con código de barras enlazado al ID del expediente electrónico. Actor: Personal administrativo de admisión.
5. RF-05: Aperturar expediente clínico electrónico de ingreso. El sistema debe habilitar automáticamente el expediente clínico electrónico al validarse la admisión. Actor: Personal administrativo de admisión / Sistema.
6. RF-06: Registrar consentimiento informado digital. El sistema debe permitir la firma digital del formulario de consentimiento informado y administrativo desde un terminal. Actor: Paciente y familiar / cuidador.
7. RF-07: Consultar orden de traslado a piso. El sistema debe mostrar la orden de traslado con número de habitación y lecho asignado. Actor: Celador / Camillero.
8. RF-08: Verificar identidad mediante código de brazalete. El sistema debe permitir escanear o validar el código del brazalete para confirmar la identidad del paciente antes del traslado. Un escaneo exitoso debe confirmar la identidad sin exigir un segundo clic de verificación. Actor: Celador / Camillero.
9. RF-09: Confirmar recepción física en piso. El sistema debe permitir cambiar el estado del paciente a "Ingresado" al confirmarse la recepción en la habitación asignada. Actor: Enfermera de piso.
10. RF-10: Registrar reubicación de paciente. El sistema debe permitir registrar una discrepancia de lecho y notificar a la central para reubicación. Actor: Enfermera de piso.
11. RF-11: Registrar valoración inicial de enfermería. El sistema debe permitir registrar anamnesis, alergias y antecedentes del paciente a pie de cama. Actor: Enfermera de piso.
12. RF-12: Registrar constantes vitales basales. El sistema debe permitir el ingreso de las mediciones fisiológicas iniciales del paciente. Actor: Enfermera de piso (`enfermera_piso`) / Auxiliar de enfermería (`auxiliar_enfermeria`).
13. RF-13: Gestionar conciliación farmacéutica de ingreso (BPMH). El sistema debe permitir registrar los medicamentos domiciliarios del paciente y contrastarlos automáticamente contra alergias e interacciones conocidas. Actor: Enfermera de piso.
14. RF-14: Registrar escalas de riesgo. El sistema debe permitir completar digitalmente las escalas de riesgo de caídas y de úlceras por presión. Actor: Enfermera de piso.
15. RF-15: Generar Kardex electrónico de ingreso. El sistema debe generar automáticamente el Kardex electrónico a partir de la valoración y conciliación registradas. Actor: Sistema.
16. RF-16: Validar y firmar indicaciones médicas basales. El sistema debe permitir al médico residente revisar la valoración de ingreso, validar el BPMH y firmar electrónicamente la hoja de indicaciones médicas. Actor: Médico residente (`medico_residente`).

Los siguientes requisitos se agregan al módulo 1 para unir las pantallas al orden del proceso 1. No renumeran RF-01 a RF-82.

- RF-83 (agregado): Consultar el censo de ingresos del proceso 1. El sistema debe listar los pacientes en curso de admisión y recepción, con identidad, documento, subproceso vigente, ubicación cuando exista y avance de los entregables. Actor: Personal administrativo de admisión, Celador / Camillero, Enfermera de piso y Médico residente / de guardia.
- RF-84 (agregado): Consultar la ficha del ingreso y sus entregables. El sistema debe mostrar, para un paciente del censo, los datos registrados y el estado de los entregables del proceso 1: ficha digital de admisión, brazalete, expediente clínico, consentimiento, recepción en piso, valoración inicial, registro basal de signos vitales, conciliación farmacéutica (BPMH), escalas de riesgo, Kardex electrónico e indicaciones médicas. Actor: el perfil que interviene en el caso.
- RF-85 (agregado): Continuar el ingreso en el paso vigente. El sistema debe abrir, desde el censo o la ficha, la actividad del proceso 1 que corresponde al rol, con el paciente ya identificado. Actor: el perfil responsable del paso.
- RF-92 (agregado): Buscar un ingreso del censo escaneando el brazalete. El sistema debe permitir, desde el listado de pacientes, escanear el código del brazalete para filtrar y localizar el ingreso correspondiente de forma rápida. Actor: Personal administrativo de admisión, Celador / Camillero, Enfermera de piso y Médico residente / de guardia.

### Módulo 2: Atención y Seguimiento del Paciente Hospitalizado

17. RF-17: Integrar resultados de laboratorio (LIS) vía API. El sistema debe consumir e integrar automáticamente, mediante interoperabilidad HL7/FHIR, los resultados de laboratorio del paciente. Actor: Sistema.
18. RF-18: Integrar informes de imágenes (PACS) vía API. El sistema debe consumir e integrar automáticamente los informes de imágenes diagnósticas. Actor: Sistema.
19. RF-19: Consolidar información clínica para la visita médica. El sistema debe desplegar en una sola pantalla los resultados de laboratorio, informes de imágenes y notas de enfermería del día. Actor: Médico tratante (`medico_tratante`) / Médico residente (`medico_residente`).
20. RF-20: Registrar nota de evolución médica digital. El sistema debe permitir el registro de la evolución clínica del paciente durante la visita médica. Actor: Médico residente (`medico_residente`).
21. RF-21: Gestionar prescripción electrónica (CPOE). El sistema debe permitir modificar o continuar el plan terapéutico y actualizar automáticamente el Kardex electrónico. Actor: Médico tratante (`medico_tratante`).
22. RF-22: Capturar constantes vitales manual o automáticamente. El sistema debe permitir el ingreso manual de constantes vitales o su ingesta automática desde monitores compatibles vía API REST. Actor: Auxiliar de enfermería (`auxiliar_enfermeria`) / Enfermera de piso (`enfermera_piso`) / Sistema.
23. RF-23: Filtrar digitalmente señales fisiológicas. El sistema debe aplicar un filtro digital (Butterworth de cuarto orden, fase cero) para atenuar ruido o interferencias en las señales capturadas. Actor: Sistema.
24. RF-24: Calcular automáticamente el score NEWS2. El sistema debe calcular de forma determinista la puntuación NEWS2 a partir de las constantes vitales registradas. Actor: Sistema.
25. RF-25: Generar gráfica evolutiva de signos vitales. El sistema debe representar gráficamente la evolución de las constantes vitales del paciente. Actor: Sistema.
26. RF-26: Activar automáticamente el proceso de gestión de alertas. El sistema debe iniciar automáticamente el flujo de alertas cuando el score NEWS2 sea igual o mayor a 1 punto. Actor: Sistema.
27. RF-27: Programar el siguiente control rutinario. El sistema debe fijar automáticamente el siguiente control a 12 horas cuando el NEWS2 sea 0. Actor: Sistema.
28. RF-28: Consultar hoja de administración de medicamentos electrónica (e-MAR). El sistema debe mostrar las dosis programadas para el turno vigente. Actor: Enfermera de piso (`enfermera_piso`).
29. RF-29: Verificar los cinco correctos antes de administrar medicación. El sistema debe validar mediante código de barras que paciente, fármaco, dosis, vía y hora coincidan con la prescripción CPOE. Actor: Sistema / Enfermera de piso (`enfermera_piso`).
30. RF-30: Bloquear administración ante inconsistencias. El sistema debe emitir una advertencia y bloquear el registro de administración cuando detecte una discrepancia. Actor: Sistema.
31. RF-31: Firmar digitalmente la dosis administrada. El sistema debe permitir la firma digital de cada dosis aplicada en el e-MAR, generando un registro inmutable. Actor: Enfermera de piso (`enfermera_piso`).
32. RF-32: Registrar nota de evolución de enfermería. El sistema debe permitir documentar la evolución y cuidados brindados durante el turno. Actor: Enfermera de piso (`enfermera_piso`).
33. RF-33: Registrar finalización de cuidados directos. El sistema debe permitir marcar la finalización de actividades de higiene y cuidados básicos. Actor: Auxiliar de enfermería (`auxiliar_enfermeria`).

- RF-93 (agregado): Consultar el expediente clínico del ingreso hospitalizado. El sistema debe mostrar, en una sola pantalla de lectura, el historial clínico del paciente desde la hospitalización: registros del proceso de admisión (valoración, constantes basales, BPMH, escalas, indicaciones), constantes y NEWS2 con gráfica evolutiva, laboratorio e imágenes, evoluciones médica y de enfermería, plan CPOE/Kardex y administraciones e-MAR relevantes. Actor: Médico tratante (`medico_tratante`) / Médico residente (`medico_residente`) / Enfermera de piso (`enfermera_piso`) / Auxiliar de enfermería (`auxiliar_enfermeria`).

### Módulo 3: Gestión de Alertas y Respuesta ante Alteraciones del Estado Clínico

34. RF-34: Generar alerta automática ante alteración fisiológica. El sistema debe generar y dirigir automáticamente una alerta a la enfermera de piso responsable al detectar una alteración. Actor: Sistema.
35. RF-35: Registrar deterioro observado de forma imprevista. El sistema debe permitir registrar una observación o alerta de deterioro clínico no derivada del monitoreo rutinario. Actor: Auxiliar de enfermería.
36. RF-36: Recalcular el score NEWS2 tras nueva valoración. El sistema debe recalcular automáticamente el NEWS2 al registrarse nuevas constantes vitales. Actor: Sistema.
37. RF-37: Programar nueva frecuencia de monitoreo. El sistema debe permitir establecer un nuevo horario de control y notificar automáticamente al responsable, controlando su cumplimiento. Actor: Enfermera de piso / Sistema.
38. RF-38: Confirmar necesidad de atención médica. El sistema debe permitir a la enfermera confirmar digitalmente la necesidad de atención médica ante deterioro significativo o "nurse's worry". Actor: Enfermera de piso.
39. RF-39: Controlar tiempo de respuesta y confirmación de alertas de enfermería. El sistema debe registrar la hora de generación, entrega y confirmación de recepción de cada alerta. Actor: Sistema / Enfermera de piso.
40. RF-40: Escalar automáticamente alertas no atendidas por enfermería. El sistema debe generar una alerta de escalamiento a la enfermera supervisora si la alerta no es confirmada dentro del tiempo establecido. Actor: Sistema.
41. RF-41: Notificar automáticamente al médico de guardia. El sistema debe enviar una notificación de alta prioridad con datos clínicos relevantes al médico responsable cuando persista una condición de riesgo. Actor: Sistema.
42. RF-42: Registrar confirmación de recepción médica. El sistema debe permitir al médico confirmar digitalmente la recepción de la alerta, registrando fecha y hora. Actor: Médico residente / de guardia.
43. RF-43: Controlar el tiempo de respuesta médica y escalar automáticamente. El sistema debe iniciar un control de 15 minutos tras la notificación médica y escalar automáticamente a la supervisora y al Equipo de Respuesta Rápida si no hay atención registrada. Actor: Sistema.
44. RF-44: Registrar evaluación e indicaciones médicas de urgencia. El sistema debe permitir documentar la evaluación, indicaciones y reevaluación del paciente. Actor: Médico residente / de guardia.
45. RF-45: Registrar solicitud de intervención del Equipo de Respuesta Rápida. El sistema debe permitir generar la solicitud digital de intervención especializada. Actor: Médico residente / de guardia.
46. RF-46: Registrar evaluación y orden de traslado a UCI. El sistema debe permitir al Equipo de Respuesta Rápida registrar su evaluación y emitir la orden digital de traslado cuando corresponda. Actor: Equipo de Respuesta Rápida (ERR).
47. RF-47: Consolidar historial de eventos y alertas. El sistema debe almacenar de forma trazable la generación, recepción, atención, escalamiento y cierre de cada evento. Actor: Sistema.

### Módulo 4: Alta y Egreso Hospitalario

48. RF-48: Registrar orden digital de alta. El sistema debe permitir autorizar y registrar el egreso del paciente según criterios clínicos. Actor: Médico tratante / residente.
49. RF-49: Generar epicrisis electrónica. El sistema debe permitir el registro de diagnósticos, procedimientos y evolución del paciente en un documento digital de epicrisis. Actor: Médico residente.
50. RF-50: Generar recetas médicas ambulatorias digitales. El sistema debe permitir la emisión de recetas digitales asociadas al alta. Actor: Médico residente.
51. RF-51: Notificar automáticamente a trabajo social. El sistema debe notificar al profesional de trabajo social cuando se registre una orden digital de alta. Actor: Sistema.
52. RF-52: Registrar valoración social pre-egreso. El sistema debe permitir registrar el informe de valoración social o la validación de continuidad del alta. Actor: Profesional de trabajo social.
53. RF-53: Consultar información para conciliación farmacéutica al alta. El sistema debe mostrar la medicación administrada, la epicrisis y las recetas ambulatorias. Actor: Enfermera de piso.
54. RF-54: Registrar conciliación farmacéutica al alta. El sistema debe permitir documentar la hoja de conciliación farmacéutica de egreso. Actor: Enfermera de piso.
55. RF-55: Generar informe digital de alta de enfermería. El sistema debe generar el informe con indicaciones de medicamentos, signos de alarma y cuidados domiciliarios, incorporando el informe social cuando exista. Actor: Enfermera de piso.
56. RF-56: Registrar confirmación de recepción de indicaciones. El sistema debe permitir al paciente o familiar confirmar digitalmente la recepción de las indicaciones de alta. Actor: Paciente y familiar / cuidador.
57. RF-57: Verificar estado de cuenta hospitalaria. El sistema debe permitir consultar y validar el estado de pago o cobertura del paciente. Actor: Personal administrativo de altas / caja.
58. RF-58: Generar pase de salida digital. El sistema debe emitir el pase de salida una vez conforme la liquidación administrativa. Actor: Personal administrativo de altas / caja.
59. RF-59: Consultar autorización de salida y trasladar al paciente. El sistema debe permitir verificar la autorización antes del traslado físico del paciente. Actor: Celador / Camillero.
60. RF-60: Registrar salida efectiva del paciente. El sistema debe permitir confirmar el egreso físico del paciente. Actor: Enfermera de piso.
61. RF-61: Actualizar automáticamente el estado de cama. El sistema debe generar la notificación digital de cama vacante al registrarse la salida efectiva. Actor: Sistema.

### Módulo 5: Gestión y Asignación de Camas

62. RF-62: Recibir solicitudes digitales de cama. El sistema debe permitir el registro y recepción de solicitudes de cama provenientes de urgencias, quirófano o admisiones. Actor: Personal de la Unidad Central de Gestión de Camas.
63. RF-63: Visualizar censo hospitalario en tiempo real. El sistema debe mostrar un dashboard actualizado con la disponibilidad de lechos por servicio. Actor: Personal de la Unidad Central de Gestión de Camas.
64. RF-64: Gestionar lista de espera priorizada. El sistema debe ubicar automáticamente las solicitudes sin disponibilidad en una lista jerarquizada por gravedad. Actor: Sistema.
65. RF-65: Registrar proyecciones de alta. El sistema debe permitir a la enfermera supervisora alimentar la disponibilidad futura del censo. Actor: Enfermera supervisora de piso.
66. RF-66: Sugerir asignación de lecho según perfil del paciente. El sistema debe filtrar y sugerir habitaciones de aislamiento o lechos compatibles por género y especialidad según el caso. Actor: Sistema.
67. RF-67: Confirmar asignación de lecho. El sistema debe permitir confirmar la asignación y notificar automáticamente a la enfermera supervisora. Actor: Personal de la Unidad Central de Gestión de Camas / Sistema.
68. RF-68: Despachar orden de limpieza terminal automáticamente. El sistema debe generar y enviar una orden de trabajo digital al personal de limpieza al registrarse el egreso de un paciente. Actor: Sistema.
69. RF-69: Registrar ejecución del protocolo de desinfección. El sistema debe permitir registrar la desinfección estándar o profunda según corresponda. Actor: Personal de servicios generales / limpieza.
70. RF-70: Registrar habilitación de la unidad. El sistema debe permitir marcar la unidad como equipada tras la colocación de lencería e insumos. Actor: Auxiliar de enfermería.
71. RF-71: Actualizar estado de cama a disponible. El sistema debe permitir a la supervisora confirmar y actualizar el estado de la cama en el censo central. Actor: Enfermera supervisora de piso.

### Módulo 6: Gestión del Personal Asistencial

72. RF-72: Publicar rol mensual de turnos digital. El sistema debe permitir elaborar y publicar el rol de turnos del personal asistencial. Actor: Jefatura de enfermería / Dirección médica.
73. RF-73: Sugerir distribución balanceada de pacientes. El sistema debe calcular una distribución equitativa de pacientes por enfermera considerando el score NEWS2 y la carga de cuidados. Actor: Sistema.
74. RF-74: Aprobar y despachar asignación diaria. El sistema debe permitir aprobar la distribución sugerida y notificarla al personal correspondiente. Actor: Enfermera supervisora de piso.
75. RF-75: Consolidar información para el handover. El sistema debe reunir automáticamente constantes fisiológicas, e-MAR y alertas del turno para el módulo de entrega de turno. Actor: Sistema.
76. RF-76: Registrar y validar el reporte de cambio de turno. El sistema debe permitir transmitir y validar la información clínica durante el recorrido a pie de cama. Actor: Enfermera de piso (saliente/entrante).
77. RF-77: Firmar digitalmente la recepción de turno. El sistema debe generar el registro electrónico de cambio de turno tras la firma digital de la enfermera entrante. Actor: Enfermera de piso (entrante).
78. RF-78: Registrar inasistencias de personal. El sistema debe permitir registrar el ausentismo del personal al inicio del turno. Actor: Enfermera supervisora de piso.
79. RF-79: Reasignar cargas o tramitar cobertura extraordinaria. El sistema debe evaluar automáticamente el impacto del ausentismo y activar la reasignación de cargas o la solicitud de retén. Actor: Sistema / Enfermera supervisora de piso.
80. RF-80: Aprobar convocatoria de personal de retén. El sistema debe permitir a la jefatura aprobar la convocatoria digital del profesional de retén. Actor: Jefatura de enfermería / Dirección médica.
81. RF-81: Autorizar cobertura extraordinaria. El sistema debe permitir a recursos humanos validar la justificación y autorizar la guardia extraordinaria. Actor: Personal de recursos humanos.
82. RF-82: Confirmar ingreso del personal de retén. El sistema debe permitir registrar el ingreso efectivo del retén en el módulo de asistencia. Actor: Enfermera supervisora de piso.

### Acceso y gestión de usuarios

Requisitos transversales. No pertenecen a un proceso clínico. El control de acceso y el cierre por inactividad se precisan además en RNF-08 y RNF-09. La pantalla de administración de cuentas no forma parte del corte actual del módulo 1.

#### Catálogo de roles operativos (claves técnicas)

Los actores de proceso se implementan con una clave de rol por responsabilidad. No se usan claves genéricas `enfermeria` ni `medico`.

| Clave técnica | Etiqueta en UI / actor de proceso | Alcance principal |
|---|---|---|
| `admision` | Admisión / Personal administrativo de admisión | Módulo 1 (RF-01–06, RF-83–85) |
| `camillero` | Celador / Camillero | Módulo 1 (RF-07–08, RF-92) |
| `enfermera_piso` | Enfermera de piso | Módulo 1 (RF-09–15) y Módulo 2 (RF-22, RF-28–32, RF-93) |
| `auxiliar_enfermeria` | Auxiliar de enfermería | Constantes (RF-12, RF-22), cuidados (RF-33) y expediente (RF-93) |
| `medico_residente` | Médico residente | Indicaciones (RF-16), visita/evolución (RF-19–20) y expediente (RF-93) |
| `medico_tratante` | Médico tratante | Visita (RF-19), CPOE (RF-21) y expediente (RF-93) |

- RF-86 (agregado): Iniciar sesión. El sistema debe autenticar al personal con correo y contraseña, y abrir el espacio de trabajo de su rol. Actor: usuario autorizado.
- RF-87 (agregado): Cerrar sesión. El sistema debe permitir cerrar la sesión de forma explícita e invalidar el acceso hasta un nuevo inicio. Actor: usuario autenticado.
- RF-88 (agregado): Consultar usuarios y roles. El sistema debe listar las cuentas del personal con nombre, correo, rol asignado y estado. Actor: administrador de accesos.
- RF-89 (agregado): Registrar un usuario y asignarle un rol. El sistema debe permitir crear una cuenta y asociarla a un único rol operativo del catálogo. Actor: administrador de accesos.
- RF-90 (agregado): Actualizar datos o rol de un usuario. El sistema debe permitir corregir los datos de la cuenta o cambiar el rol asignado. Actor: administrador de accesos.
- RF-91 (agregado): Desactivar un usuario. El sistema debe permitir desactivar una cuenta sin eliminarla, de modo que no pueda iniciar sesión y se conserve la trazabilidad. Actor: administrador de accesos.

## 3. Requerimientos No Funcionales

Los requerimientos no funcionales definen los atributos de calidad, restricciones técnicas y estándares de rendimiento que debe cumplir la plataforma para garantizar operación segura, confiable y eficiente en el entorno hospitalario.

### 3.1 Rendimiento y tiempo de respuesta

- RNF-01: Tiempo de despacho de alertas críticas. El envío de la notificación push vía WebSockets hacia el dispositivo del personal asignado debe completarse en un tiempo máximo de 2 segundos, medido desde que el servidor calcula un score NEWS2 ≥ 7 o registra una alerta forzada, hasta la recepción confirmada por el cliente.
- RNF-02: Tiempo de procesamiento de algoritmos fisiológicos. El filtro digital Butterworth de cuarto orden y el cálculo determinista del score NEWS2 deben ejecutarse en el servidor en un tiempo menor o igual a 1 segundo por registro de constantes vitales ingresado.
- RNF-03: Tiempo de carga de interfaces principales. Los dashboards de censo de camas y de lista de pacientes asignados deben renderizarse completamente en un tiempo menor o igual a 2 segundos, bajo condiciones de red local hospitalaria estándar (mínimo 10 Mbps, 50 usuarios concurrentes).
- RNF-04: Capacidad de concurrencia del sistema. La plataforma debe soportar al menos 200 usuarios concurrentes activos (registrando datos, consultando dashboards o recibiendo alertas) sin que el tiempo de respuesta promedio de las operaciones críticas (RNF-01 y RNF-02) se degrade en más del 10%.

### 3.2 Seguridad y privacidad de la información

- RNF-05: Cifrado de datos en tránsito. El 100% de las comunicaciones entre los clientes web y el servidor deben realizarse mediante HTTPS/TLS 1.3, sin permitir conexiones HTTP no cifradas.
- RNF-06: Cifrado de datos en reposo. La totalidad de los campos de información clínica sensible almacenados en base de datos deben cifrarse mediante el estándar AES-256.
- RNF-07: Inmutabilidad de registros de trazabilidad. Los registros de historial de alertas, acuses de recibo, firmas digitales y controles de tiempo (SLA) no deben permitir edición ni eliminación por ningún perfil de usuario, incluido el administrador, una vez confirmados.
- RNF-08: Control de acceso basado en roles. El sistema debe restringir las funcionalidades disponibles según el perfil del usuario (administrativo, enfermería, médico, supervisión, limpieza, RRHH), de modo que ningún usuario pueda acceder a funciones fuera de su rol asignado.
- RNF-09: Cierre de sesión automático por inactividad. La Web App debe finalizar automáticamente la sesión activa tras 5 minutos de inactividad del usuario, exigiendo reautenticación.

### 3.3 Disponibilidad y confiabilidad

- RNF-10: Alta disponibilidad del servicio. El sistema debe mantener una disponibilidad igual o mayor al 99.9% medida de forma anual (equivalente a un máximo de 8.76 horas de inactividad no programada al año).
- RNF-11: Reconexión automática ante fallos de red. Ante una pérdida de conectividad, el cliente debe intentar reconectarse automáticamente al servidor WebSocket en un máximo de 5 segundos tras restablecerse la señal, y sincronizar el 100% de los registros y notificaciones pendientes generados durante la desconexión.
- RNF-12: Recuperación ante desastres (RTO/RPO). El sistema debe contar con respaldo automático de base de datos con una frecuencia máxima de 24 horas (Recovery Point Objective ≤ 24h) y un tiempo de recuperación ante fallo catastrófico no mayor a 4 horas (Recovery Time Objective ≤ 4h).

### 3.4 Usabilidad y carga cognitiva

- RNF-13: Diseño responsivo. La interfaz debe renderizarse correctamente (sin pérdida de funcionalidad ni elementos superpuestos) en al menos tres tipos de resolución: escritorio (≥1366px), tablet (768–1024px) y smartphone (360–414px).
- RNF-14: Eficiencia de interacción en tareas críticas. Las acciones frecuentes definidas como críticas (registro de signos vitales, confirmación de acuse de recibo de alerta, administración de medicamento en e-MAR) deben completarse en un máximo de 3 clics o toques desde la pantalla principal correspondiente.
- RNF-15: Codificación visual estandarizada del riesgo clínico. El sistema debe representar el nivel de riesgo NEWS2 mediante un código de colores estandarizado (verde: 0, amarillo: 1–4 o 5–6 según banda de riesgo medio, rojo: ≥7), aplicado de manera consistente en el 100% de las pantallas donde se muestre el score.

### 3.5 Interoperabilidad y compatibilidad

- RNF-16: Interoperabilidad bajo estándares de salud. El sistema debe exponer y consumir servicios mediante estándares HL7 v2.x y/o FHIR para el intercambio de información con los sistemas HIS, LIS y PACS, logrando una tasa de éxito de integración (mensajes procesados correctamente) igual o mayor al 99%.
- RNF-17: Compatibilidad multinavegador. La Web App debe operar sin errores funcionales ni visuales en las últimas dos versiones estables de Google Chrome, Microsoft Edge, Mozilla Firefox y Safari, sin requerir instalación de plugins adicionales.

## 4. Criterio de implementación

Toda funcionalidad nueva debe:

- consultarse con el documento de requisitos,
- implementarse mediante pruebas primero (TDD),
- validarse con documentación y pruebas relevantes,
- respetar las reglas definidas en [docs/architecture/reglas.md](../architecture/reglas.md) y [CONTRIBUTING.md](../../CONTRIBUTING.md).
