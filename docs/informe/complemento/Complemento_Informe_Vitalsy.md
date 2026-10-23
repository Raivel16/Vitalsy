# Complemento académico del informe del proyecto Vitalsy

**Proyecto:** «Diseño e implementación de una Plataforma SaaS para la Vigilancia Fisiológica Longitudinal y Gestión de Alertas Tempranas en la Continuidad Asistencial»

**Documento complementado:** `docs/informe/Plantilla Estructura de proyecto final.md`

**Fecha de elaboración:** 17 de octubre de 2026

**Revisión del código analizada:** rama `dev`, commit `a7aac4d` (16/10/2026)

**Referencia metodológica obligatoria:** `docs/plan_de_pruebas/Plan de Pruebas de Software.pdf` (versión del 03/10/2026)

---

## Nota de uso y convenciones

Este documento **complementa** el informe original; no lo reemplaza ni lo reproduce. Contiene, en este orden: (1) los párrafos del informe que requieren incorporar o corregir una cita, con su ubicación exacta; (2) el desarrollo del Capítulo 13; (3) las Conclusiones; (4) las Recomendaciones; (5) las Referencias bibliográficas, y (6) una propuesta de anexos. El Capítulo 14 no se desarrolla.

**Estilo de citación.** Las referencias siguen la norma ISO 690 con el sistema autor-fecha (ISO, 2021). Se prioriza la cita narrativa: el apellido del autor o el nombre de la institución forma parte de la oración y el año va entre paréntesis. La convención aplicada en el texto es la siguiente: un autor, «Apellido (año)»; dos autores, «Apellido y Apellido (año)»; tres o más autores, «Apellido et al. (año)». En la lista de referencias figuran todos los autores. Esta forma abreviada para tres o más autores es la convención adoptada en este complemento; conviene confirmarla con la guía de estilo de la universidad antes de la entrega final. Cuando dos obras comparten autor y año, se distinguen con una letra (2021a, 2021b).

**Marcadores.** El texto `[PENDIENTE: …]` señala un dato que todavía debe obtenerse y `[CAPTURA: …]` señala dónde debe insertarse una imagen. Ningún marcador sustituye un resultado.

**Hallazgos previos que condicionan el complemento.** Durante la revisión se encontraron los siguientes hechos verificables:

1. El apartado introductorio del Capítulo 11 afirma que el texto del plan de pruebas «no pudo extraerse». En esta revisión el PDF se leyó completo (86 páginas) con `pdftotext`, y se extrajeron sus 221 casos de prueba. Conviene corregir esa frase del informe.
2. Los Capítulos 1 y 5 describen herramientas y mecanismos que no coinciden con el repositorio: autenticación JWT/OAuth2 (el sistema usa sesión por cookie con Laravel Sanctum), Postman/Newman, Apache JMeter y Cypress (no instalados), Tailwind CSS, LOINC y SNOMED CT (no implementados), colas asíncronas (la cola está en modo `sync`), una validación con JSON Schema y un registro de auditoría con dirección IP (no existen), y una cobertura del 100 % en las clases deterministas (no hay umbral configurado). En cambio, **sí existen** y deben mantenerse: las notificaciones por WebSockets con Laravel Reverb, los escenarios de carga k6 en `scripts/load/` (escritos y sin corrida registrada) y los recorridos de navegador con Playwright (`frontend/web/e2e/` y `.github/workflows/browser-matrix.yml`, sin ejecución). Son hechos del proyecto: no se resuelven con citas, sino alineando el texto con la implementación. La sección «Correcciones de coherencia con la implementación», al final de la Parte 1, da el texto de reemplazo de cada pasaje.
3. El informe menciona `services/movil`; la ruta real de la aplicación móvil es `movil/`. Además, el repositorio ya declara las rutas `/api/life/*`, que los Capítulos 6, 7 y 12 dan por inexistentes.

---

## Parte 1. Párrafos del informe que requieren incorporar o corregir una cita

Los párrafos se presentan en el orden en que aparecen en el informe. Las etiquetas *Capítulo*, *Subtítulo*, *Ubicación exacta*, *Fuente utilizada* y *Justificación* son información auxiliar: solo el texto del bloque citado debe incorporarse al informe. Las citas se marcan en **negrita** para facilitar su localización.

---

**Capítulo:** CAPÍTULO 1. INFORMACIÓN GENERAL DEL PROYECTO

**Subtítulo:** 1.1. Resumen Ejecutivo

**Ubicación exacta:** primer párrafo de 1.1, que empieza «En el contexto actual de la salud digital, la atención médica enfrenta una severa fragmentación…».

**Párrafo completo con cita incorporada:**

> En el contexto actual de la salud digital, la atención médica enfrenta una severa fragmentación entre el autocuidado preventivo de los ciudadanos en su vida cotidiana y los flujos asistenciales intrahospitalarios. El problema identificado radica en que la vigilancia de pacientes en salas de hospitalización general ha dependido tradicionalmente de controles manuales e intermitentes de signos vitales en papel; según **Yadav et al. (2024)**, los controles puntuales de frecuencia cardíaca, frecuencia respiratoria y presión arterial cada tres a seis horas son la norma en las salas generales y pueden pasar por alto cambios relevantes entre una medición y otra. Este modelo somete al personal de enfermería a una alta carga cognitiva y fatiga por alarma, retrasando la detección del deterioro fisiológico agudo y la activación de respuestas médicas oportunas; **Henry y Giannini (2024)** recuerdan que la descompensación clínica y los eventos adversos inesperados ocurren en alrededor del 10 % de los ingresos hospitalarios. Además, los profesionales de la salud carecen de un historial fisiológico longitudinal pre-hospitalario que sirva como punto de comparación o línea de base individual (*intra-individual baseline*), y pierden visibilidad del paciente tras el alta, lo que incrementa el riesgo de reingresos no programados.

**Fuente utilizada:** Yadav et al. (2024), *Early detection of deteriorating patients in general wards through continuous contactless vital signs monitoring*; Henry y Giannini (2024), *Early Warning Systems for Critical Illness Outside the ICU*.

**Justificación:** Yadav et al. describen expresamente los controles intermitentes de 3–6 h como práctica habitual en las salas generales y su limitación para detectar cambios. Henry y Giannini aportan la magnitud del problema (aproximadamente el 10 % de los ingresos). La afirmación sobre la «fatiga por alarma» no tiene, en estas fuentes, un dato cuantitativo y se mantiene como planteamiento del problema.

---

**Capítulo:** CAPÍTULO 1. INFORMACIÓN GENERAL DEL PROYECTO

**Subtítulo:** 1.1. Resumen Ejecutivo

**Ubicación exacta:** cuarto párrafo de 1.1, que empieza «El enfoque de calidad aplicado se basa en que la plataforma opera bajo un motor de reglas clínicas deterministas…».

**Párrafo completo con cita incorporada:**

> El enfoque de calidad aplicado se basa en que la plataforma opera bajo un motor de reglas clínicas deterministas y transparentes en lugar de modelos probabilísticos de caja negra, haciendo que la lógica del software sea totalmente predecible y auditable. Se aplicó un marco de Aseguramiento de la Calidad de Software (SQA) guiado por el modelo de calidad de producto de **ISO/IEC (2023)** y por las normas de pruebas de software de **ISO/IEC/IEEE (2021a; 2021b)**, combinadas con las categorías de riesgo del **OWASP Foundation (2021)**. La validación de la lógica clínica y de las reglas de negocio se ejecutó mediante pruebas de caja negra (partición de equivalencia y análisis de valores límite, técnicas que describe **ISO/IEC/IEEE (2021b)**), respaldadas por una suite de automatización con PHPUnit (API), Vitest (web) y Jest (móvil), ejecutada en GitHub Actions junto con el análisis estático de SonarQube Cloud; los recorridos de navegador con Playwright y los escenarios de carga con k6 están definidos en el repositorio.

**Fuente utilizada:** ISO/IEC (2023), *ISO/IEC 25010:2023*; ISO/IEC/IEEE (2021a), *ISO/IEC/IEEE 29119-3:2021*; ISO/IEC/IEEE (2021b), *ISO/IEC/IEEE 29119-4:2021*; OWASP Foundation (2021), *OWASP Top 10:2021*.

**Justificación:** El párrafo nombra normas sin referenciarlas; la cita identifica la edición. **Corrección de coherencia incorporada:** la lista original «PHPUnit, Jest, Postman/Newman y Cypress» se sustituyó por las herramientas que existen en el repositorio. No hay Postman/Newman ni Cypress; Playwright y k6 están definidos pero sin ejecución registrada, por eso se presentan como «definidos» y no como ejecutados.

---

**Capítulo:** CAPÍTULO 1. INFORMACIÓN GENERAL DEL PROYECTO

**Subtítulo:** 1.2. Introducción

**Ubicación exacta:** primer párrafo de 1.2, que empieza «En el campo de la ingeniería de software aplicada a la salud digital (*HealthTech*)…» y continúa tras el salto de página con «pacientes en salas de hospitalización general ha dependido…».

**Párrafo completo con cita incorporada:**

> En el campo de la ingeniería de software aplicada a la salud digital (*HealthTech*), la transformación de los procesos asistenciales exige soluciones capaces de integrar la captura continua de biometría en la vida diaria con los flujos de trabajo dentro de las instituciones hospitalarias. El contexto general del proyecto se enmarca en la necesidad de superar la fragmentación de la información médica. Históricamente, el seguimiento de pacientes en salas de hospitalización general ha dependido de registros físicos aislados, evaluaciones intermitentes y comunicaciones verbales no estructuradas. Con la convergencia de la Internet de las Cosas Médicas (IoMT), las arquitecturas en la nube (*SaaS*) y los dispositivos *wearables*, surge la oportunidad de articular el historial fisiológico del ciudadano con el expediente hospitalario, optimizando la toma de decisiones clínicas basadas en evidencia. **Köhler et al. (2024)** clasifican el uso sanitario de los relojes inteligentes en tres dominios —monitorizar, incentivar conductas (*nudging*) y predecir—, y **Wan et al. (2018)** describen arquitecturas de monitorización en tiempo real basadas en sensores vestibles e IoT.

**Fuente utilizada:** Köhler et al. (2024), *The Value of Smartwatches in the Health Care Sector for Monitoring, Nudging, and Predicting*; Wan et al. (2018), *Wearable IoT enabled real-time health monitoring system*.

**Justificación:** Ambas fuentes sustentan la convergencia entre dispositivos vestibles, IoT y monitorización sanitaria. La de Köhler et al. respalda además el término *nudging*, que el informe usa para Vitalsy Life. Ninguna demuestra el beneficio clínico de Vitalsy: solo fundamentan la oportunidad tecnológica.

---

**Capítulo:** CAPÍTULO 1. INFORMACIÓN GENERAL DEL PROYECTO

**Subtítulo:** 1.2. Introducción

**Ubicación exacta:** segundo párrafo de 1.2, que empieza «En el desarrollo de software moderno, la importancia de las pruebas de software adquiere un carácter crítico…».

**Párrafo completo con cita incorporada:**

> En el desarrollo de software moderno, la importancia de las pruebas de software adquiere un carácter crítico cuando se trabaja con aplicaciones clasificadas como *Software como Dispositivo Médico (SaMD)* o Sistemas de Soporte a la Decisión Clínica (*CDSS*). En estos entornos, el Aseguramiento de la Calidad de Software (*SQA*) no es una fase final opcional, sino un pilar estratégico continuo: un fallo en la lógica de cálculo de riesgo, una latencia en la transmisión por *WebSockets* o un error en el temporizador del SLA de escalamiento puede provocar la omisión de una alerta temprana y comprometer la vida de un paciente. **Faraji y Pombo (2025)** señalan que, en el software crítico para la seguridad, el tiempo de respuesta y la precisión son determinantes, y que la automatización de pruebas integrada en el ciclo de vida permite detectar fallos antes. Por ello, la implementación rigurosa de estrategias de prueba automatizadas, unitarias, de integración y de sistema bajo estándares internacionales como **ISO/IEC (2023)** e **ISO/IEC/IEEE (2021a)** resulta indispensable para garantizar la confiabilidad, inmutabilidad, seguridad y alta disponibilidad del sistema.

**Fuente utilizada:** Faraji y Pombo (2025), *AI-Driven Software Test Automation: An AI4SE-Oriented Survey of Techniques, Tools, and Challenges*; ISO/IEC (2023); ISO/IEC/IEEE (2021a).

**Justificación:** La revisión de Faraji y Pombo menciona expresamente el software crítico para la seguridad y la detección temprana de fallos como beneficio de la automatización. Las normas quedan identificadas por su edición.

---

**Capítulo:** CAPÍTULO 2. CONTEXTO ORGANIZACIONAL Y ANÁLISIS DEL PROBLEMA

**Subtítulo:** 2.1.3. Área donde se presenta el problema

**Ubicación exacta:** párrafo que empieza «Sin embargo, en el macroproceso misional de Atención de Hospitalización, existe una severa brecha tecnológica…».

**Párrafo completo con cita incorporada:**

> Sin embargo, en el macroproceso misional de Atención de Hospitalización, existe una severa brecha tecnológica. A diferencia de las Unidades de Cuidados Intensivos (UCI) (donde la monitorización es continua y automatizada), en las salas de hospitalización general la relación de pacientes por profesional de enfermería es sensiblemente mayor y la vigilancia recae en evaluaciones manuales e intermitentes. **Donnelly et al. (2024)**, en una revisión de alcance sobre el papel de la enfermera de sala, encontraron una variabilidad significativa en cómo se valora, monitoriza y escala el deterioro clínico en esas unidades.

**Fuente utilizada:** Donnelly et al. (2024), *The role of the ward nurse in recognition and response to clinical deterioration: a scoping review*.

**Justificación:** La fuente respalda que la vigilancia en sala depende de la enfermera y es heterogénea. La afirmación sobre la mayor razón paciente/enfermera no se cuantifica en las fuentes revisadas y queda como descripción del escenario.

---

**Capítulo:** CAPÍTULO 2. CONTEXTO ORGANIZACIONAL Y ANÁLISIS DEL PROBLEMA

**Subtítulo:** 2.1.3. Área donde se presenta el problema

**Ubicación exacta:** punto 2 de la lista, que empieza «**Brecha Intrahospitalaria (Piso de Hospitalización):** Las constantes vitales se toman intermitentemente…».

**Párrafo completo con cita incorporada:**

> **Brecha Intrahospitalaria (Piso de Hospitalización):** Las constantes vitales se toman intermitentemente cada 4, 6 u 8 horas. **Clement-Santamaría y Domingo-Pozo (2022)**, al comentar la evidencia sobre sistemas de alerta temprana, señalan que los cambios fisiológicos anormales son observables en las constantes vitales documentadas entre una y cuatro horas antes de la parada cardíaca. Sin embargo, la falta de monitoreo inteligente en sala general crea una "ventana ciega" donde el deterioro pasa desapercibido.

**Fuente utilizada:** Clement-Santamaría y Domingo-Pozo (2022), *Sistemas de alerta temprana y sistemas de respuesta rápida para la prevención del deterioro agudo del paciente adulto hospitalizado [evidencia comentada]*.

**Justificación:** El original decía «Los estudios demuestran…» sin fuente; el dato de una a cuatro horas aparece literalmente en la fuente. Se sustituye la generalización por una cita narrativa. La periodicidad «cada 4, 6 u 8 horas» es una descripción del escenario; Yadav et al. (2024) informan intervalos de 3–6 h.

---

**Capítulo:** CAPÍTULO 2. CONTEXTO ORGANIZACIONAL Y ANÁLISIS DEL PROBLEMA

**Subtítulo:** 2.1.4. Herramientas tecnológicas utilizadas actualmente

**Ubicación exacta:** segundo párrafo de 2.1.4, que empieza «Estas herramientas carecen por completo de motores de validación…» y termina tras el salto de página con «…hacia los dispositivos del equipo de respuesta».

**Párrafo completo con cita incorporada:**

> Estas herramientas carecen por completo de motores de validación, lógica de procesamiento o Sistemas de Soporte a la Decisión Clínica (CDSS). No integran algoritmos validados internacionalmente, como el estándar NEWS2 (*National Early Warning Score 2*), que permitan ponderar en tiempo real múltiples variables fisiológicas para emitir una calificación global de riesgo. **Arévalo-Buitrago et al. (2022)** validaron en España la escala NEWS-2 y hallaron una alta capacidad predictiva de eventos adversos e ingresos hospitalarios en el triaje de urgencias, aunque **Gerry et al. (2020)** advierten que muchas escalas de alerta temprana en uso clínico presentan debilidades metodológicas en su desarrollo y validación. Asimismo, la comunicación de cualquier anomalía detectada se realiza a través de canales informales, verbales y descentralizados (llamadas telefónicas, búsqueda física del médico por los pasillos). No existe un canal de notificaciones clínicas unificado que centralice, priorice o valide electrónicamente las alertas críticas hacia los dispositivos del equipo de respuesta.

**Fuente utilizada:** Arévalo-Buitrago et al. (2022), *Validación en España de la escala National Early Warning Score 2 (NEWS-2)…*; Gerry et al. (2020), *Early warning scores for detecting deterioration in adult hospital patients: systematic review and critical appraisal of methodology*.

**Justificación:** «Validados internacionalmente» requería sustento. Arévalo-Buitrago et al. aportan una validación (en urgencias, no en sala de hospitalización), y Gerry et al. matizan la calidad metodológica de las escalas. Con ambas, la afirmación queda equilibrada y no se sobredimensiona la evidencia.

---

**Capítulo:** CAPÍTULO 2. CONTEXTO ORGANIZACIONAL Y ANÁLISIS DEL PROBLEMA

**Subtítulo:** 2.2.1. Descripción detallada del problema

**Ubicación exacta:** segundo párrafo de 2.2.1, que empieza «En la práctica clínica en piso, la simple recolección y registro en papel de un signo vital alterado no garantiza una intervención médica oportuna…».

**Párrafo completo con cita incorporada:**

> En la práctica clínica en piso, la simple recolección y registro en papel de un signo vital alterado no garantiza una intervención médica oportuna. El personal de enfermería debe calcular e interpretar mentalmente cada variable de manera aislada frente a un volumen masivo de datos planos, lo que genera una alta "fatiga cognitiva" que dificulta la priorización inmediata de los casos críticos. Esta falla en la detección y comunicación crea una ventana de inactividad asistencial en la que el paciente inestable permanece desatendido durante horas cruciales. **Chua et al. (2026)** recuerdan que la activación tradicional de los sistemas de respuesta rápida depende de que el personal de sala reconozca el deterioro y escale manualmente, proceso que puede verse obstaculizado por la toma tardía de constantes, por vacíos en su interpretación y por barreras socioculturales para escalar la atención.

**Fuente utilizada:** Chua et al. (2026), *Effects of Real-Time Automated Clinical Deterioration Alert and Trigger Systems on Clinical Outcomes in Adult General Ward Patients: A Systematic Review and Meta-Analysis*.

**Justificación:** La fuente enumera, en su introducción, las barreras del reconocimiento y del escalamiento manual que el párrafo describe. La expresión «fatiga cognitiva» se mantiene como interpretación del equipo, porque no figura con ese nombre en la fuente.

---

**Capítulo:** CAPÍTULO 2. CONTEXTO ORGANIZACIONAL Y ANÁLISIS DEL PROBLEMA

**Subtítulo:** 2.2.2. Causas del problema

**Ubicación exacta:** punto 3 de la lista, que empieza «**Falta de flujos de escalamiento automatizados y gestión de SLAs:**».

**Párrafo completo con cita incorporada:**

> **Falta de flujos de escalamiento automatizados y gestión de SLAs:** El proceso asistencial no cuenta con disparadores temporizados. Si el médico de guardia no responde a una alerta roja en un plazo establecido (SLA de 15 minutos), el sistema manual no posee la capacidad de desviar y escalar autónomamente el aviso hacia la supervisión de enfermería o al Equipo de Respuesta Rápida (ERR). En el metaanálisis de **Chua et al. (2026)**, los sistemas automatizados de alerta y disparo en tiempo real se asociaron con una reducción de las paradas cardíacas intrahospitalarias, y sus autores precisan que el posible beneficio en mortalidad aparece cuando se integran en vías de escalamiento estructuradas.

**Fuente utilizada:** Chua et al. (2026).

**Justificación:** La conclusión de la fuente vincula el beneficio con un escalamiento estructurado, que es justamente lo que el párrafo identifica como ausente. El plazo de 15 minutos es una decisión del proyecto y no procede de la fuente.

---

**Capítulo:** CAPÍTULO 2. CONTEXTO ORGANIZACIONAL Y ANÁLISIS DEL PROBLEMA

**Subtítulo:** 2.2.4. Impacto en la eficiencia del proceso

**Ubicación exacta:** primer punto de la lista, que empieza «**Vulnerabilidad en la seguridad del paciente:**».

**Párrafo completo con cita incorporada:**

> **Vulnerabilidad en la seguridad del paciente:** El fallo en el reconocimiento temprano del deterioro se asocia con una mayor incidencia de paros cardiorrespiratorios en piso, mayor mortalidad intrahospitalaria y más transferencias de emergencia no planificadas hacia la Unidad de Cuidados Intensivos (UCI). **Wu et al. (2021)** observaron que la implantación de un sistema electrónico NEWS que se actualizaba cada hora se asoció con menos eventos adversos, en particular reanimaciones en sala y traslados a UCI, y **Alves Silva et al. (2021)** describieron una menor mortalidad hospitalaria tras implantar un equipo de respuesta rápida activado por la escala MEWS. Con todo, **Clement-Santamaría y Domingo-Pozo (2022)** advierten que la evidencia de mayor calidad sobre estos sistemas es todavía de certeza limitada.

**Fuente utilizada:** Wu et al. (2021), *Implementation of an Electronic National Early Warning System to Decrease Clinical Deterioration…*; Alves Silva et al. (2021), *Clinical impact of implementing a rapid-response team based on the Modified Early Warning Score…*; Clement-Santamaría y Domingo-Pozo (2022).

**Justificación:** El original afirmaba una relación causal («incrementa…», «eleva…», «multiplica…»). Se ajusta mínimamente a «se asocia con», porque las fuentes son observacionales o de antes y después y la síntesis Cochrane comentada por Clement-Santamaría y Domingo-Pozo califica la evidencia como de certeza baja.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** Introducción del capítulo (antes de 3.1)

**Ubicación exacta:** párrafo que empieza «Este capítulo analiza cómo funcionan los procesos organizacionales antes de implementar el sistema…».

**Párrafo completo con cita incorporada:**

> Este capítulo analiza cómo funcionan los procesos organizacionales antes de implementar el sistema. Se utilizan técnicas de Business Process Management (BPM) para comprender el flujo de trabajo actual. El mapeo de procesos es una técnica empleada en el ámbito hospitalario para hacer visibles los pasos, los actores y los recursos de un flujo asistencial: **Holbrook et al. (2016)** la aplicaron a la conciliación de medicamentos como paso previo a la mejora de la calidad, y **Johnson et al. (2012)** la utilizaron para identificar los vacíos de información en las transiciones entre el hospital y la atención primaria.

**Fuente utilizada:** Holbrook et al. (2016), *Process mapping evaluation of medication reconciliation in academic teaching hospitals…*; Johnson et al. (2012), *Searching for the missing pieces between the hospital and primary care…*.

**Justificación:** Ambas fuentes aplican el mapeo de procesos en hospitales y sustentan la elección metodológica del capítulo (AS-IS/TO-BE). Se añade una oración de enlace; el texto original se conserva íntegro.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.1.1. Descripción del Macroproceso

**Ubicación exacta:** párrafo único de 3.1.1, que empieza «El macroproceso misional de Atención de Hospitalización abarca el conjunto de actuaciones…».

**Párrafo completo con cita incorporada:**

> El macroproceso misional de Atención de Hospitalización abarca el conjunto de actuaciones clínicas, administrativas, logísticas y asistenciales desarrolladas de forma continua (24/7) para brindar diagnóstico, tratamiento, observación prolongada y rehabilitación a pacientes que requieren internamiento. En la situación actual, este macroproceso opera mediante una arquitectura descentralizada y desconectada de la vida diaria del paciente. La captura de constantes fisiológicas, la evaluación de riesgos y la gestión asistencial en piso se realizan combinando planillas físicas en papel, módulos informáticos pasivos e interacciones verbales. Esta operativa genera dos graves desconexiones en la cadena de atención: en primer lugar, un "punto ciego" pre-hospitalario, donde el hospital carece de visibilidad sobre el patrón fisiológico habitual del usuario (*intra-individual baseline*) previo al ingreso; y en segundo lugar, un "punto ciego" post-alta, donde el egreso rompe todo seguimiento remoto en el hogar, dejando al paciente vulnerable a complicaciones no detectadas y reingresos no programados. **Johnson et al. (2012)** y **Britton et al. (2020)** documentaron, mediante mapeo de procesos, que las transiciones del hospital hacia la atención primaria o hacia centros de cuidados presentan vacíos de comunicación y de información que comprometen la continuidad asistencial.

**Fuente utilizada:** Johnson et al. (2012); Britton et al. (2020), *Mapping the Care Transition from Hospital to Skilled Nursing Facility*.

**Justificación:** Las dos fuentes sustentan el «punto ciego post-alta» como problema de transición asistencial. El «punto ciego pre-hospitalario» (ausencia de línea de base individual) no tiene respaldo directo en ellas y se mantiene como planteamiento del proyecto.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.3.1. Predominio de procesos manuales e intermitentes

**Ubicación exacta:** párrafo único de 3.3.1, que empieza «En la práctica asistencial diaria, la supervisión de las constantes fisiológicas…» y continúa tras el salto de página con «nivel de riesgo se realiza a través de la revisión mental…».

**Párrafo completo con cita incorporada:**

> En la práctica asistencial diaria, la supervisión de las constantes fisiológicas (frecuencia respiratoria, saturación de oxígeno, presión arterial, frecuencia cardíaca, temperatura y nivel de consciencia) depende de toma de datos manuales ejecutados de forma intermitente en intervalos fijos de varias horas (usualmente cada 4, 6 u 8 horas). Esta dinámica genera una peligrosa "ventana ciega" operativa de inacción, dentro de la cual variaciones fisiológicas sutiles pueden pasar completamente desapercibidas entre un control y otro; **Yadav et al. (2024)** identifican esta limitación de los controles puntuales intermitentes como motivo para explorar la monitorización continua en salas generales. Asimismo, la evaluación del nivel de riesgo se realiza a través de la revisión mental individual de cada parámetro fisiológico de forma aislada, sin contar con herramientas informáticas que integren y ponderen automáticamente algoritmos deterministas de alerta temprana, como el score estandarizado NEWS2.

**Fuente utilizada:** Yadav et al. (2024).

**Justificación:** La fuente describe la misma limitación de los controles intermitentes. No se cita para los intervalos concretos de 4, 6 u 8 h, que son descriptivos del escenario.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.3.2. Duplicación de tareas y sobrecarga laboral (Muda de Sobreprocesamiento)

**Ubicación exacta:** párrafo único de 3.3.2, que empieza «El personal asistencial invierte una cantidad considerable de tiempo en la retranscripción de datos…».

**Párrafo completo con cita incorporada:**

> El personal asistencial invierte una cantidad considerable de tiempo en la retranscripción de datos entre múltiples soportes. El procedimiento habitual exige anotar las mediciones físicas en libretas o borradores en papel, para luego transcribirlas manualmente a las planillas impresas de la historia clínica o a módulos electrónicos que funcionan como repositorios pasivos. Además, la falta de integración entre las distintas áreas obliga a repetir las mismas preguntas e interrogatorios al paciente en múltiples etapas del flujo (admisión, pase de visita, cambios de turno e interconsultas). Este esfuerzo administrativo redundante genera sobrecarga cognitiva e interrupciones constantes, restando tiempo valioso que podría dedicarse a la atención directa y al cuidado del paciente. El término *muda* procede del enfoque Lean, que **Morales-Contreras et al. (2020)** aplicaron a un proceso hospitalario para identificar los principales tipos de desperdicio y rediseñar el flujo de atención.

**Fuente utilizada:** Morales-Contreras et al. (2020), *Applying Lean in Process Innovation in Healthcare: The Case of Hip Fracture*.

**Justificación:** El título del apartado usa la categoría Lean «muda de sobreprocesamiento» sin fuente. Morales-Contreras et al. aplican Lean para identificar desperdicios en un proceso hospitalario. No se cita para cuantificar el tiempo de retranscripción, porque la fuente no lo mide para este escenario.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.3.4. Retrasos críticos en el flujo de trabajo (Muda de Espera / Delays)

**Ubicación exacta:** párrafo único de 3.3.4, que empieza «El proceso actual carece de disparadores temporizados automatizados…» y continúa tras el salto de página con «Rápida (ERR). La falta de un canal unificado…».

**Párrafo completo con cita incorporada:**

> El proceso actual carece de disparadores temporizados automatizados y Acuerdos de Nivel de Servicio (SLA). Si un médico de guardia no responde de inmediato a la llamada informal de la enfermera debido a sobrecarga de tareas o falta de señal en su dispositivo, el sistema no posee la capacidad de realizar un escalamiento automático jerárquico hacia la supervisión de enfermería o al Equipo de Respuesta Rápida (ERR). La falta de un canal unificado de notificaciones push institucionales genera demoras en la respuesta presencial a pie de cama, prolongando innecesariamente el tiempo en que el paciente permanece en estado de inestabilidad fisiológica crítica. En el estudio de métodos mixtos de **Chua et al. (2023)**, las enfermeras valoraron la activación automatizada del sistema de respuesta rápida como una red de seguridad que reduce las demoras para acceder a recursos de cuidados críticos, aunque esa automatización no eliminó las barreras socioculturales del escalamiento.

**Fuente utilizada:** Chua et al. (2023), *Automated rapid response system activation—Impact on nurses' attitudes and perceptions towards recognising and responding to clinical deterioration: Mixed-methods study*.

**Justificación:** La fuente respalda que la activación automatizada reduce las demoras de acceso, y también su límite, lo que evita presentar la automatización como solución completa.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.3.5. Fatiga cognitiva y vulnerabilidad en la seguridad del paciente

**Ubicación exacta:** párrafo único de 3.3.5, que empieza «Afrontar un volumen masivo de datos clínicos sin categorización gráfica de riesgo…».

**Párrafo completo con cita incorporada:**

> Afrontar un volumen masivo de datos clínicos sin categorización gráfica de riesgo produce una severa fatiga cognitiva en el personal, lo que dificulta la priorización inmediata de los pacientes que requieren atención urgente. La combinación de evaluaciones intermitentes, notificaciones verbales desestructuradas y demoras en el escalamiento incrementa la tasa de deterioro clínico no detectado. Esto deriva en complicaciones graves pero prevenibles, aumentando la incidencia de paros cardiorrespiratorios en piso, la mortalidad intrahospitalaria y la necesidad de traslados de emergencia no planificados hacia la Unidad de Cuidados Intensivos (UCI), lo cual incrementa los costos operativos y degrada la calidad del servicio hospitalario. **Henry y Giannini (2024)** subrayan que un cambio clínico potencialmente mortal debe detectarse y atenderse con rapidez en el paciente hospitalizado, y **Chua et al. (2026)** asocian los sistemas automatizados de alerta con menos paradas cardíacas intrahospitalarias, sin efectos significativos en los traslados no planificados a UCI ni en la estancia.

**Fuente utilizada:** Henry y Giannini (2024); Chua et al. (2026).

**Justificación:** Las fuentes sustentan la importancia de la detección rápida y el efecto en las paradas cardíacas. Chua et al. no encontraron efecto en los traslados a UCI, por lo que se incorpora ese matiz en lugar de citar la fuente como respaldo de esa parte de la afirmación. La relación con los «costos operativos» no tiene respaldo en las fuentes revisadas.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.3.7. Fragmentación de la información y pérdida de continuidad asistencial (Puntos Ciegos Pre y Post-Hospitalarios)

**Ubicación exacta:** párrafo único de 3.3.7, que empieza «El modelo de procesos actual limita la visión médica a los eventos ocurridos estrictamente dentro de los muros de la clínica…».

**Párrafo completo con cita incorporada:**

> El modelo de procesos actual limita la visión médica a los eventos ocurridos estrictamente dentro de los muros de la clínica. Al momento de la admisión, el equipo de salud no cuenta con herramientas para importar el contexto biológico previo registrado por el ciudadano en su vida cotidiana mediante dispositivos *wearables*, obligando a evaluar signos vitales aislados contra rangos poblacionales genéricos. Asimismo, al otorgarse el alta, el proceso finaliza de forma abrupta sin mecanismos de telemonitoreo en casa, impidiendo la verificación de la recuperación y aumentando la probabilidad de descompensaciones agudas que derivan en reingresos no planificados. **Britton et al. (2020)** recogen que los participantes de su mapeo de la transición al alta reclamaban una evaluación más temprana del estado funcional y de los apoyos del paciente, incluidos servicios fiables en el domicilio, y **Kakria et al. (2015)** presentan un sistema de monitorización remota en tiempo real con teléfono inteligente y sensores vestibles para pacientes cardíacos.

**Fuente utilizada:** Britton et al. (2020); Kakria et al. (2015), *A Real-Time Health Monitoring System for Remote Cardiac Patients Using Smartphone and Wearable Sensors*.

**Justificación:** Britton et al. sustentan la necesidad de continuidad al alta; Kakria et al., la factibilidad técnica del telemonitoreo. La relación causal entre la ausencia de telemonitoreo y los reingresos no se demuestra en estas fuentes y se mantiene como hipótesis del proyecto.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.4. Propuesta de Mejora (Proceso TO-BE)

**Ubicación exacta:** primer párrafo de 3.4, que empieza «La propuesta de mejora comprende la optimización integral del macroproceso de Atención de Hospitalización…».

**Párrafo completo con cita incorporada:**

> La propuesta de mejora comprende la optimización integral del macroproceso de Atención de Hospitalización y la garantía de la continuidad asistencial (*comunidad → hospital → hogar*) mediante la implementación de **Vitalsy Platform** (arquitectura de marca sombrilla). Dado que el ecosistema software gestiona de forma transversal la atención clínica, la logística y la administración del servicio, la transformación del modelo AS-IS al modelo TO-BE contempla el reemplazo sistemático de tareas manuales, planillas en papel y comunicaciones verbales por flujos de trabajo digitalizados e interconectados en tiempo real entre el módulo asistencial intrahospitalario (**Vitalsy Clinical**) y el módulo preventivo/domiciliario (**Vitalsy Life**). Este enfoque se apoya en experiencias previas: **Ortiga et al. (2012)** mostraron que la estandarización de los procesos de admisión y alta mejoró el flujo de pacientes y la capacidad de camas en un hospital universitario, y **Alhmoud et al. (2023)** describieron la transición de NEWS desde el papel a un formato integrado en la historia clínica electrónica y calculado a partir de cada medición.

**Fuente utilizada:** Ortiga et al. (2012), *Standardizing admission and discharge processes to improve patient flow: A cross sectional study*; Alhmoud et al. (2023), *Implementation of a digital early warning score (NEWS2) in a cardiac specialist and general hospital settings in the COVID-19 pandemic: a qualitative study*.

**Justificación:** Las fuentes fundamentan dos ejes del TO-BE: la estandarización de admisión y alta y la digitalización de NEWS. No demuestran los efectos de Vitalsy, que deben medirse en el propio proyecto.

---

**Capítulo:** CAPÍTULO 3. ANÁLISIS DE PROCESOS DE NEGOCIO

**Subtítulo:** 3.4.2.7. PROCESO 7: Monitoreo Preventivo y Autogestión Ciudadana en la Vida Cotidiana (Vitalsy Life) — Descripción del Proceso

**Ubicación exacta:** párrafo que empieza «Este proceso engloba la captura pasiva, continua y no invasiva de constantes fisiológicas y hábitos de vida del ciudadano…».

**Párrafo completo con cita incorporada:**

> Este proceso engloba la captura pasiva, continua y no invasiva de constantes fisiológicas y hábitos de vida del ciudadano en su entorno cotidiano a través de dispositivos wearables y la App móvil Vitalsy Life. Permite la construcción dinámica de la línea de base fisiológica habitual del usuario (intra-individual baseline), el envío de recomendaciones y alertas preventivas de autocuidado (nudging), y la administración soberana del consentimiento informado para la futura sincronización transversal de datos en caso de una admisión hospitalaria o de un plan de seguimiento remoto post-alta. **Köhler et al. (2024)** sitúan este uso en el dominio del *nudging*, es decir, el uso individual del reloj inteligente con fines de salud fuera de un entorno médico concreto, y **Youssef Ali Amer et al. (2020)** mostraron que la monitorización continua con tecnología vestible permite calcular puntuaciones de alerta temprana a partir de signos vitales.

**Fuente utilizada:** Köhler et al. (2024); Youssef Ali Amer et al. (2020), *Vital Signs Prediction and Early Warning Score Calculation Based on Continuous Monitoring of Hospitalised Patients Using Wearable Technology*.

**Justificación:** Köhler et al. definen el *nudging* con la misma acepción que el informe. Youssef Ali Amer et al. sustentan el cálculo de puntuaciones de alerta a partir de datos vestibles, aunque en pacientes hospitalizados y no en población general, límite que conviene mantener presente.

---

**Capítulo:** CAPÍTULO 5. PLANIFICACIÓN DEL PROYECTO Y PLAN DE CALIDAD

**Subtítulo:** 5.3.1. ISO/IEC 25010 – Calidad del Producto Software

**Ubicación exacta:** frase introductoria de 5.3.1, «Se evalúan y garantizan los siguientes atributos de calidad clave:», que precede a la lista que va de «Adecuación Funcional» a «Usabilidad y Prevención de Errores».

**Párrafo completo con cita incorporada:**

> Se evalúan los siguientes atributos de calidad clave, definidos en el modelo de calidad de producto de **ISO/IEC (2023)**, que en su edición vigente organiza la calidad en nueve características: adecuación funcional, eficiencia de desempeño, compatibilidad, capacidad de interacción, fiabilidad, seguridad, mantenibilidad, flexibilidad y protección (*safety*). En esa edición, la antigua «usabilidad» se denomina «capacidad de interacción»:

**Fuente utilizada:** ISO/IEC (2023), *ISO/IEC 25010:2023 Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model*.

**Justificación:** El apartado cita la norma sin edición y usa el término «Usabilidad», propio de la edición de 2011. Se identifica la edición de 2023, la que se usa en la evaluación del 13.4. Además, se elimina el verbo «garantizan», porque el proyecto no realizó una evaluación formal de conformidad que permita garantizar esos atributos. **Advertencia de contenido:** la viñeta «Se verifica con un 100 % de cobertura de código en las clases deterministas de servicio» no está respaldada por la medición: no hay un umbral configurado y el informe Clover del backend muestra un 94,28 % de sentencias cubiertas en el conjunto del backend (véase 13.3). Debe corregirse o eliminarse.

---

**Capítulo:** CAPÍTULO 5. PLANIFICACIÓN DEL PROYECTO Y PLAN DE CALIDAD

**Subtítulo:** 5.3.2. ISO/IEC/IEEE 29119 – Pruebas de Software

**Ubicación exacta:** frase introductoria de 5.3.2, «Estándar aplicado para normar el ciclo de vida del proceso de pruebas:», que precede a las viñetas «Parte 3» y «Parte 4».

**Párrafo completo con cita incorporada:**

> Estándar tomado como referencia para el ciclo de vida del proceso de pruebas: la documentación de pruebas se orienta por la Parte 3 (**ISO/IEC/IEEE, 2021a**) y las técnicas de diseño de casos, como la partición de equivalencia y el análisis de valores límite, por la Parte 4 (**ISO/IEC/IEEE, 2021b**):

**Fuente utilizada:** ISO/IEC/IEEE (2021a), *ISO/IEC/IEEE 29119-3:2021 — Part 3: Test documentation*; ISO/IEC/IEEE (2021b), *ISO/IEC/IEEE 29119-4:2021 — Part 4: Test techniques*.

**Justificación:** Se identifican las partes y ediciones de la norma. Se sustituye «aplicado para normar» por «tomado como referencia», porque la viñeta de la Parte 3 menciona «Registros de Defectos» y «Reportes de Cierre de Calidad» que no existen como documentos del proyecto (véase 13.2). Aquí se usa la cita parentética porque la norma se nombra dentro de un inciso.

---

**Capítulo:** CAPÍTULO 5. PLANIFICACIÓN DEL PROYECTO Y PLAN DE CALIDAD

**Subtítulo:** 5.3.3. Buenas Prácticas de Desarrollo Seguro (OWASP Top 10 + HIPAA/RGPD)

**Ubicación exacta:** primera viñeta, que empieza «**Protección de Datos y Soberanía (A01:2021 / RGPD):**».

**Párrafo completo con cita incorporada:**

> **Protección de Datos y Soberanía (A01:2021 / RGPD):** Los datos biométricos de *Vitalsy Life* no son accesibles por el centro hospitalario a menos que exista un token de consentimiento activo firmado digitalmente por el usuario. La categoría A01:2021 corresponde a la pérdida de control de acceso (*Broken Access Control*) en la clasificación del **OWASP Foundation (2021)**.

**Fuente utilizada:** OWASP Foundation (2021), *OWASP Top 10:2021*.

**Justificación:** El código A01:2021 se cita sin fuente. Se precisa la categoría para que el lector entienda que la medida es un control de acceso. El RGPD y la HIPAA no se citan porque no se dispone de los textos normativos en las fuentes del proyecto: `[PENDIENTE: incorporar la referencia al Reglamento (UE) 2016/679 y a la normativa peruana de protección de datos personales si el equipo decide mantener esa mención]`.

---

**Capítulo:** CAPÍTULO 8. DESARROLLO DEL SISTEMA

**Subtítulo:** Introducción del capítulo (antes de 8.1)

**Ubicación exacta:** primer párrafo del capítulo, que empieza «El desarrollo de Vitalsy siguió el ciclo de vida dirigido por inteligencia artificial…».

**Párrafo completo con cita incorporada:**

> El desarrollo de Vitalsy siguió el ciclo de vida dirigido por inteligencia artificial (AI-DLC) que define **Raja SP (2025)**. Ese método no consiste en insertar un asistente dentro de Scrum o de Kanban. Esas formas fueron pensadas para iteraciones de semanas y para rituales de sincronización humana. Con un asistente capaz de descomponer trabajo en horas, el ciclo se ordena en tres fases y en ciclos cortos, llamados Bolts; **Raja SP (2025)** propone ese nombre para sustituir al *sprint* y subrayar ciclos de construcción y validación medidos en horas o días.

**Fuente utilizada:** Raja SP (2025), *AI-Driven Development Lifecycle (AI-DLC) Method Definition*.

**Justificación:** Los conceptos AI-DLC, Inception/Construction/Operations y Bolt proceden literalmente de esta fuente (secciones de marco central y de fases), pero el párrafo no la nombraba.

---

**Capítulo:** CAPÍTULO 8. DESARROLLO DEL SISTEMA

**Subtítulo:** Introducción del capítulo (antes de 8.1)

**Ubicación exacta:** tercer párrafo del capítulo, que empieza «El modelo V-Bounce acompaña ese orden…».

**Párrafo completo con cita incorporada:**

> El modelo V-Bounce de **Hymel (2024)** acompaña ese orden: el esfuerzo fuerte está en el intent, en la arquitectura y en la validación continua. La generación de código es la parte breve del Bolt. **Hymel (2024)** describe ese desplazamiento como un cambio del papel humano, que pasa de implementador principal a validador y verificador. En un esquema afín de equipos con agentes, **Bandara et al. (2025)** sitúan a la persona como orquestadora de agentes especializados de planificación, codificación y prueba bajo supervisión humana. Los apartados siguientes recogen lo que se hizo en cada fase.

**Fuente utilizada:** Hymel (2024), *The AI-Native Software Development Lifecycle: A Theoretical and Practical New Methodology*; Bandara et al. (2025), *Agentsway — Software Development Methodology for AI Agents-based Teams*.

**Justificación:** El modelo V-Bounce es una propuesta de Hymel, y la figura de la persona orquestadora procede de Bandara et al. Ambas son propuestas metodológicas (un libro blanco y una preimpresión) y no estudios empíricos, lo que conviene tener presente al valorar su peso como evidencia.

---

**Capítulo:** CAPÍTULO 11. ESTRATEGIA DE PRUEBAS DE SOFTWARE

**Subtítulo:** Introducción del capítulo (antes de 11.1)

**Ubicación exacta:** primer párrafo del capítulo, que empieza «Este capítulo fija la estrategia de pruebas de Vitalsy a partir de las fuentes sobre calidad…».

**Párrafo completo con cita incorporada:**

> Este capítulo fija la estrategia de pruebas de Vitalsy a partir de las fuentes sobre calidad, desarrollo guiado por pruebas e inteligencia artificial aplicada al testing: el desarrollo guiado por pruebas según **Cudco Pomagualli (2024)**, las pruebas basadas en propiedades asistidas por modelos de lenguaje de **Quintero Meza y Gil García (2025)** y las revisiones sobre automatización de pruebas con IA de **Antonenko et al. (2025)** y **Faraji y Pombo (2025)**. La estrategia es la que el proyecto debe seguir. El apartado final de cada bloque separa lo que el repositorio ya ejecuta. Lo que falta está especificado en plan_implementacion_mejoras.md.

**Fuente utilizada:** Cudco Pomagualli (2024); Quintero Meza y Gil García (2025); Antonenko et al. (2025); Faraji y Pombo (2025).

**Justificación:** El párrafo remite a «las fuentes» sin identificarlas. **Corrección de hecho asociada (párrafo siguiente del informe):** la frase «Su texto no pudo extraerse en esta revisión (el lector devolvió páginas vacías)» ya no es exacta, porque el plan se extrajo completo en esta revisión. Se recomienda sustituirla por una remisión al Capítulo 13, que contrasta el plan con la ejecución.

---

**Capítulo:** CAPÍTULO 11. ESTRATEGIA DE PRUEBAS DE SOFTWARE

**Subtítulo:** 11.1. Enfoque de Pruebas del Proyecto

**Ubicación exacta:** primer párrafo de 11.1, que empieza «El objetivo es detectar fallos pronto, sobre criterios de aceptación explícitos…».

**Párrafo completo con cita incorporada:**

> El objetivo es detectar fallos pronto, sobre criterios de aceptación explícitos, y repetir esa detección cada vez que el código cambia. Las fuentes describen la calidad como una actividad transversal, no como una etapa final: **Hymel (2024)** propone generar los casos de prueba a medida que se formaliza cada requisito, de modo que este sea comprobable desde que se concibe. El desarrollo guiado por pruebas concreta esa idea en un lazo corto: una prueba que falla expresa el comportamiento esperado; el código mínimo la pone en verde; la refactorización no altera ese comportamiento. Ese lazo mejora el diseño porque la unidad tiene que ser comprobable; **Cudco Pomagualli (2024)** concluye que TDD no solo cubre el testing de la aplicación, sino que promueve un diseño óptimo y un código más tolerante al cambio.

**Fuente utilizada:** Hymel (2024); Cudco Pomagualli (2024), *Implementación de la metodología Test Driven Development en el desarrollo de un prototipo de sistema de control de inventario*.

**Justificación:** Cada una de las dos afirmaciones teóricas del párrafo, la validación continua y el efecto de TDD en el diseño, recibe su fuente. El estudio de Cudco Pomagualli es un prototipo con diseño cuasi experimental en Java/JUnit, por lo que su resultado se cita como hallazgo de ese caso y no como prueba general.

---

**Capítulo:** CAPÍTULO 11. ESTRATEGIA DE PRUEBAS DE SOFTWARE

**Subtítulo:** 11.1. Enfoque de Pruebas del Proyecto

**Ubicación exacta:** segundo párrafo de 11.1, que empieza «La inteligencia artificial entra como ayuda para proponer casos, datos y propiedades…».

**Párrafo completo con cita incorporada:**

> La inteligencia artificial entra como ayuda para proponer casos, datos y propiedades, y para señalar zonas de riesgo. No sustituye el oráculo. **Faraji y Pombo (2025)** advierten que los scripts estáticos se vuelven frágiles porque codifican una lógica de control fija y selectores quebradizos ligados a la presentación; **Abdalhamid y Almabruk (2025)** recuerdan que los evaluadores humanos siguen reconociendo problemas de usabilidad y casos límite que la automatización puede pasar por alto, y que el código generado con asistencia de IA requiere validación humana para asegurar su exactitud y su seguridad. Por eso cada caso propuesto por un modelo se revisa antes de entrar en la suite, igual que se revisa el código de producción.

**Fuente utilizada:** Faraji y Pombo (2025); Abdalhamid y Almabruk (2025), *Transforming Software Development: A Comparative Study of Traditional and AI-Integrated SDLC Approaches*.

**Justificación:** El original atribuía las tres advertencias a «las fuentes de automatización inteligente». Se reparten entre las fuentes que las contienen. Abdalhamid y Almabruk mencionan además un dato sobre vulnerabilidades del código generado sin revisión, pero lo toman de una fuente secundaria (su referencia n.º 28), por lo que no se reproduce como cifra.

---

**Capítulo:** CAPÍTULO 11. ESTRATEGIA DE PRUEBAS DE SOFTWARE

**Subtítulo:** 11.1. Enfoque de Pruebas del Proyecto

**Ubicación exacta:** tercer párrafo de 11.1, que empieza «El ciclo de vida dirigido por IA coloca esa generación dentro de Construction…».

**Párrafo completo con cita incorporada:**

> El ciclo de vida dirigido por IA de **Raja SP (2025)** coloca esa generación dentro de Construction y vuelve a ejecutarla al cerrar la unidad de despliegue: pruebas funcionales, de seguridad y de requisitos no funcionales, con una persona que ajusta los escenarios antes de darlos por buenos. El V-Bounce de **Hymel (2024)** pide que la validación sea continua y no un tramo final. El marco de agentes de **Bandara et al. (2025)** separa un papel de prueba del papel de codificación, de modo que quien propone el código no sea la única voz que propone la verificación.

**Fuente utilizada:** Raja SP (2025); Hymel (2024); Bandara et al. (2025).

**Justificación:** Cada mecanismo nombrado (Construction con unidades de despliegue probadas, validación continua y agentes de prueba diferenciados) se atribuye a la fuente que lo define. Bandara et al. describen expresamente los *Testing Agents* como un papel distinto de los *Coding Agents*.

---

**Capítulo:** CAPÍTULO 11. ESTRATEGIA DE PRUEBAS DE SOFTWARE

**Subtítulo:** 11.1. Enfoque de Pruebas del Proyecto

**Ubicación exacta:** viñeta que empieza «Las reglas puras (NEWS2, Morse, Braden, filtro, validación de documento y teléfono) se comprueban además con propiedades…».

**Párrafo completo con cita incorporada:**

> Las reglas puras (NEWS2, Morse, Braden, filtro, validación de documento y teléfono) se comprueban además con propiedades: afirmaciones que deben cumplirse para muchos datos, no solo para un ejemplo. **Quintero Meza y Gil García (2025)** desarrollan esta técnica con modelos de lenguaje y la biblioteca Hypothesis sobre Python. En Vitalsy ese principio debe aplicarse sobre PHP y TypeScript, que son los lenguajes del repositorio. Hoy no hay una suite de propiedades en esos lenguajes. No se introduce un servicio Python de pruebas que el sistema no tiene.

**Fuente utilizada:** Quintero Meza y Gil García (2025), *Automatización de pruebas de software basadas en propiedades mediante ingeniería de prompts e inteligencia artificial*.

**Justificación:** El original decía «La fuente que desarrolla esta técnica…» sin nombrarla. La afirmación «Hoy no hay una suite de propiedades» se comprobó en esta revisión: no hay fast-check ni un generador de propiedades en PHP en el repositorio.

---

**Capítulo:** CAPÍTULO 11. ESTRATEGIA DE PRUEBAS DE SOFTWARE

**Subtítulo:** 11.1. Enfoque de Pruebas del Proyecto

**Ubicación exacta:** viñeta que empieza «La priorización, cuando la suite crezca, debe favorecer lo que el cambio tocó…» y continúa tras el salto de página con «historial; hasta que exista ese historial…».

**Párrafo completo con cita incorporada:**

> La priorización, cuando la suite crezca, debe favorecer lo que el cambio tocó y lo que el dominio considera crítico (identidad, medicación, alerta, salida). **Faraji y Pombo (2025)** llaman a eso análisis de impacto de pruebas y priorización basada en modelos de predicción de fallos, y **Antonenko et al. (2025)** incluyen la predicción de defectos y la optimización de la prioridad de las pruebas en CI/CD entre los aportes de la IA al testing. Vitalsy no tiene todavía un modelo entrenado con su historial; hasta que exista ese historial, la prioridad la marca el criterio clínico del requisito, no un clasificador.

**Fuente utilizada:** Faraji y Pombo (2025); Antonenko et al. (2025), *Prospects of using AI for automated software testing*.

**Justificación:** Se identifica la autoría de «priorización y predicción de defectos». Ambas fuentes son revisiones; no aportan evidencia de que esas técnicas funcionen sin historial propio, lo que respalda la decisión del párrafo.

---

**Capítulo:** CAPÍTULO 11. ESTRATEGIA DE PRUEBAS DE SOFTWARE

**Subtítulo:** 11.3. Tipos de Pruebas Ejecutadas

**Ubicación exacta:** bloque que empieza «**Propiedades e inestabilidad.** Las propiedades amplían las unitarias de dominio…».

**Párrafo completo con cita incorporada:**

> **Propiedades e inestabilidad.** Las propiedades amplían las unitarias de dominio. Las pruebas inestables (las que fallan sin un cambio de lógica) deben identificarse por su historial de ejecuciones y corregirse o aislarse. No hay, hoy, un detector de ese tipo ni un mecanismo que reescriba solo los selectores de una prueba de interfaz cuando la pantalla cambia. **Faraji y Pombo (2025)** describen la detección de pruebas inestables a partir de patrones históricos de ejecución y la reparación de scripts de prueba mediante comparación semántica, y **Antonenko et al. (2025)** se refieren a esos mecanismos como *self-healing*. Incorporarlo sin historial y sin selectores estables aumentaría la fragilidad. La estrategia lo deja como paso posterior, después de tener identificadores estables y una suite de navegador pequeña y revisada por una persona.

**Fuente utilizada:** Faraji y Pombo (2025); Antonenko et al. (2025).

**Justificación:** «Las fuentes llaman a eso reparación o self-healing» se sustituye por la atribución concreta. Hecho relacionado verificado en esta revisión: en la corrida de la suite móvil se observó una prueba que falló por tiempo de espera y pasó al reejecutarse aislada (véase 13.2, D-10), lo que confirma la pertinencia de este bloque.

---

**Capítulo:** CAPÍTULO 12. AUTOMATIZACIÓN DE PRUEBAS

**Subtítulo:** 12.1. Herramientas de Automatización

**Ubicación exacta:** primer párrafo de 12.1, que empieza «Las fuentes distinguen la automatización clásica (scripts repetibles en un pipeline) de la automatización asistida por modelos de lenguaje…».

**Párrafo completo con cita incorporada:**

> **Faraji y Pombo (2025)** distinguen la automatización clásica (scripts repetibles en un pipeline) de la automatización asistida por modelos de lenguaje (proponer casos desde el requisito o desde el código, proponer propiedades, señalar fallos y, más adelante, reparar pruebas frágiles o priorizarlas), y **Anitha et al. (2025)** destacan que la IA acelera la detección de fallos y vulnerabilidades, aunque su configuración inicial y su integración con los flujos existentes son complejas. Las dos capas se usan juntas. La primera da el resultado determinista. La segunda acelera la escritura y se revisa a mano.

**Fuente utilizada:** Faraji y Pombo (2025); Anitha et al. (2025), *Impact of Artificial Intelligence on Software Development Processes*.

**Justificación:** Se identifica quién propone la distinción. Anitha et al. aportan el beneficio y la dificultad de adopción, coherentes con la decisión de revisar a mano la capa asistida.

---

**Capítulo:** CAPÍTULO 12. AUTOMATIZACIÓN DE PRUEBAS

**Subtítulo:** 12.1. Herramientas de Automatización

**Ubicación exacta:** párrafo que empieza «Quedan fuera de esta etapa, porque las fuentes las describen y el proyecto no tiene los datos para sostenerlas…».

**Párrafo completo con cita incorporada:**

> Quedan fuera de esta etapa, porque **Antonenko et al. (2025)** y **Faraji y Pombo (2025)** las describen y el proyecto no tiene los datos para sostenerlas: un modelo de predicción de defectos, redes para priorizar por grafo de dependencias, aprendizaje por refuerzo que navegue la interfaz, y un self-healing que reescriba selectores solo. Esas técnicas se vuelven a valorar cuando existan historial de caídas del CI, selectores estables y una suite de navegador pequeña.

**Fuente utilizada:** Antonenko et al. (2025); Faraji y Pombo (2025).

**Justificación:** Antonenko et al. analizan expresamente los modelos de lenguaje, el aprendizaje por refuerzo, las redes neuronales de grafos y las tecnologías *self-healing*; Faraji y Pombo, la navegación de interfaces por refuerzo y la predicción de fallos. Dato del proyecto: el historial de GitHub Actions ya contiene 64 ejecuciones concluidas (véase 13.3), un insumo que la frase «historial de caídas del CI» puede usar.

---

**Capítulo:** CAPÍTULO 12. AUTOMATIZACIÓN DE PRUEBAS

**Subtítulo:** 12.4. Ejecución Automática de Pruebas

**Ubicación exacta:** último párrafo de 12.4, que empieza «**Papel de la IA en la ejecución.** Puede proponer el caso, explicar un fallo y sugerir el diff mínimo…».

**Párrafo completo con cita incorporada:**

> **Papel de la IA en la ejecución.** Puede proponer el caso, explicar un fallo y sugerir el diff mínimo. No marca el job como verde, no desactiva una prueba y no despliega. Esa frontera es la que las fuentes mantienen al dejar la decisión final en la persona —**Raja SP (2025)** plantea aprovechar las capacidades de la IA manteniendo el control humano sobre las decisiones críticas, y **Bandara et al. (2025)** consideran esencial la supervisión humana para validar la calidad de la implementación—, y es la que este proyecto debe conservar aunque más adelante automatice la generación.

**Fuente utilizada:** Raja SP (2025); Bandara et al. (2025).

**Justificación:** Ambas fuentes formulan de manera expresa el control humano sobre las decisiones críticas y la validación de la implementación.

---

### Afirmaciones del informe que no pueden respaldarse con las fuentes disponibles

Las siguientes afirmaciones son hechos o metas del proyecto. Ninguna fuente de `bibliography/papers` las respalda, y una cita bibliográfica tampoco podría demostrarlas. Deben sustentarse con mediciones propias o reformularse:

| Ubicación | Afirmación | Situación |
|---|---|---|
| 1.1, quinto párrafo («Entre los principales resultados obtenidos…») | NEWS2 en menos de 1 s, alertas *push* por WebSockets en menos de 2 s, ahorro de 140 min diarios, «100 % de trazabilidad» | Solo RNF-02 tiene medición (véase 13.3: media de 0,022 s por registro en el entorno de pruebas). El tiempo de despacho de alertas, el ahorro de tiempo y la trazabilidad del 100 % no están medidos. `[PENDIENTE: medición propia o reformulación como meta]` |
| 2.2.3, segunda viñeta | «hasta 140 minutos diarios re-transcribiendo» | Sin fuente ni medición. `[PENDIENTE: fuente o estimación propia documentada]` |
| 5.2, 5.4 y 5.5 | OAuth2/JWT, Postman/Newman, Cypress, JMeter, Tailwind, LOINC/SNOMED, JSON Schema, log con IP | Contradicen los Cap. 7 y 12 y el repositorio. Texto de reemplazo en la sección siguiente |
| 5.3.1 | «100 % de cobertura de código» y «consumo de batería inferior al 5 %» | Sin medición en el proyecto |
| 5.3.3 | «CDSS/SaMD clase IIa» | Clasificación regulatoria sin evaluación ni fuente normativa. `[PENDIENTE: referencia regulatoria o retirar la clase]` |

---

### Correcciones de coherencia con la implementación

Estos pasajes no requieren una cita: describen herramientas o mecanismos que no coinciden con el repositorio (revisión `dev`, commits `a7aac4d` y `54dfd53`). Para cada uno se indica la ubicación, el fragmento actual y el texto corregido, listo para sustituirlo. Los números de línea corresponden a `docs/informe/Plantilla Estructura de proyecto final.md`. El texto corregido conserva lo que sí existe (WebSockets con Laravel Reverb, escenarios k6, Playwright) y presenta como meta lo que todavía no se ha medido.

**Evidencias del repositorio usadas:**

| Afirmación del informe | Estado verificado en el repositorio |
|---|---|
| Autenticación OAuth2 / JWT | No existe. Sesión por cookie con Laravel Sanctum 4.3 (`config/auth.php`, guard `web`); el Cap. 7 ya lo indica |
| Tailwind CSS | No está en `frontend/web/package.json`; los estilos son propios (`src/styles/`) |
| WebSockets | **Sí existen:** `laravel/reverb` en `composer.json`, servicio `reverb` en `docker-compose.yml`, `laravel-echo` y `pusher-js` en la web, prueba `ClinicalAlertBroadcastTest` (commit `3ffe08a`, 14/10/2026). El tiempo de despacho de 2 s no está medido |
| Colas asíncronas | `QUEUE_CONNECTION=sync`: el filtro Butterworth y NEWS2 se ejecutan dentro de la petición |
| PostgreSQL con JSONB | PostgreSQL 16 con columnas `json` (13 en las migraciones); no se usa `jsonb` |
| LOINC y SNOMED CT | No aparecen en `backend/api/app`. Existen clientes FHIR para LIS y PACS, con implementación simulada por defecto (`FhirInteroperabilityTest`) |
| Apple HealthKit y Google Fit | HealthKit (`@kingstinct/react-native-healthkit`) y Health Connect (`react-native-health-connect`); Google Fit no está. La lectura es periódica en primer plano (cada 60 s, RNF-19) |
| Postman / Newman | No existen. Las pruebas de API son pruebas de característica de PHPUnit (`*ApiTest`) |
| Cypress | No existe. Playwright: `frontend/web/e2e/critical-paths.spec.ts`, `playwright.config.ts` y `.github/workflows/browser-matrix.yml` (omitido por falta de `E2E_BASE_URL`) |
| k6 / Apache JMeter | **k6 sí existe:** `scripts/load/k6-alertas.js` y `k6-census.js` (RNF-03 y RNF-04), sin corrida registrada según `docs/operacion/pruebas-de-carga.md`. JMeter no existe |
| 100 % de cobertura en las clases deterministas | Sin umbral configurado. Cobertura medida: backend 94,28 % de sentencias, web 92,37 % y móvil 65,71 % de líneas |
| JSON Schema en `/api/v1/clinical/telemetry` | La ruta real es `POST /api/v1/inpatient-care/encounters/{encounterId}/vital-signs/telemetry`, validada con reglas de Laravel en el controlador; no hay JSON Schema |
| Log de seguridad con dirección IP | No existe. Hay trazabilidad inmutable de alertas, acuses, firmas y dosis con usuario y marca de tiempo (`TraceabilityImmutabilityTest`); la IP solo se guarda en la tabla de sesiones |
| Limitación de tasa en el endpoint de datos | Solo hay `throttle` en el login (10/min), en las rutas de Vitalsy Life y en los planes de alta (30/min); el endpoint de telemetría no lo tiene |
| Sanitización HTML contra XSS | No hay una librería de sanitización; React escapa el texto por defecto y no se usa `dangerouslySetInnerHTML` |
| Pentesting automatizado | No existe; el plan de pruebas lo excluye (§3.2) |
| GitFlow con `develop` y `release` | La rama de integración es `dev` y no hay ramas `release`; las ramas son `feature/`, `bugfix/` y `hotfix/RF-XX-*` |
| CI sin móvil ni SonarQube (Cap. 7, 9, 11 y 12) | Desde el PR #21 (18/10/2026) el job `validate` ejecuta Jest con cobertura en `movil/`, PHPUnit con cobertura Clover y SonarQube Cloud |
| Contrato `/api/life/*` «no declarado» (Cap. 7) | Las rutas `/api/life/*` están declaradas en `routes/api.php`, con pruebas `Life*ApiTest` |
| Ruta `services/movil` | La ruta real es `movil/` (commit `7cd250e`, integrado con el PR #13) |

#### Capítulo 1. INFORMACIÓN GENERAL DEL PROYECTO

**1.1, tercer párrafo (línea 280)**, que empieza «Las tecnologías utilizadas comprenden un stack moderno…».

> Las tecnologías utilizadas comprenden un stack modular e interoperable: un *Frontend* web en React 19 con TypeScript y Vite, con hojas de estilo propias, para los tableros clínicos; un *Backend* en Laravel 12 (PHP 8.2) con autenticación por sesión mediante Laravel Sanctum y notificaciones en tiempo real por *WebSockets* mediante Laravel Reverb; almacenamiento relacional en PostgreSQL 16, con registros de trazabilidad protegidos contra modificación; una aplicación móvil, Vitalsy Life, construida con Expo y React Native; y una infraestructura contenedorizada en Docker y orquestada con Docker Compose. La interoperabilidad con laboratorio e imágenes se resuelve mediante clientes FHIR para LIS y PACS, que en el entorno de desarrollo usan implementaciones simuladas.

**1.1, quinto párrafo (línea 284)**, que empieza «Entre los principales resultados obtenidos…».

> Entre los principales resultados obtenidos, la plataforma procesa la señal biométrica en el servidor con un filtro digital Butterworth de cuarto orden y fase cero y calcula la puntuación NEWS2; en el entorno de pruebas, el procesamiento completo de un registro tomó en promedio 0,022 s (requisito: ≤ 1 s). Las alertas se notifican en tiempo real por *WebSockets* (Laravel Reverb); el tiempo de despacho de 2 segundos es una meta todavía no medida. El sistema controla el plazo asistencial de 15 minutos con escalamiento automático hacia la supervisión y el Equipo de Respuesta Rápida (ERR) y conserva el historial de cada alerta en registros que no pueden modificarse ni eliminarse una vez confirmados. La reducción de la transcripción manual y de la fatiga por alarmas son beneficios esperados que deberán medirse en un piloto con usuarios.

**1.2, viñeta del Capítulo 12 (línea 324)**, que empieza «**Capítulo 12: Automatización de Pruebas:**».

> - **Capítulo 12: Automatización de Pruebas:** Muestra la configuración y ejecución de las pruebas automatizadas con PHPUnit (API), Vitest (web) y Jest (móvil) en GitHub Actions, junto con el análisis estático en SonarQube Cloud, los recorridos de navegador definidos con Playwright y los escenarios de carga definidos con k6.

#### Capítulo 5. PLANIFICACIÓN DEL PROYECTO Y PLAN DE CALIDAD

**5.2, punto 1 (líneas 2831–2835)**, que empieza «**Frontend Web Asistencial (Vitalsy Clinical):**».

> 1. **Frontend Web Asistencial (Vitalsy Clinical):** React 19 con TypeScript y Vite, con hojas de estilo propias, para la construcción de una interfaz de dashboard clínico reactiva a eventos en tiempo real vía *WebSockets* (Laravel Echo contra Laravel Reverb), con diseño responsivo para tablets de enfermería y terminales de estación.

**5.2, punto 2 (línea 2837)**, que empieza «**Frontend Móvil y Gateway (Vitalsy Life):**».

> 2. **Frontend Móvil (Vitalsy Life):** Expo SDK 57 con React Native 0.86, integrado con Apple HealthKit (iOS) y Health Connect (Android) para la lectura de biometría, con lectura periódica en primer plano y cola local de sincronización. El impacto en la batería es una meta (RNF-19) todavía no medida.

**5.2, punto 3 (línea 2839)**, que empieza «**Backend y API SaaS (Vitalsy Platform):**».

> 3. **Backend y API SaaS (Vitalsy Platform):** Laravel 12 (PHP 8.2), seleccionado por su motor de enrutamiento API RESTful. El filtrado digital Butterworth y el cálculo NEWS2 se ejecutan como servicios de dominio dentro de la petición (la cola de trabajos opera en modo síncrono). La autenticación es por sesión con cookie mediante Laravel Sanctum, y las notificaciones *push* se envían por *WebSockets* mediante Laravel Reverb. La latencia inferior a 2 segundos (RNF-01) es una meta pendiente de medición.

**5.2, punto 4 (línea 2841)**, que empieza «**Base de Datos y Almacenamiento:**».

> 4. **Base de Datos y Almacenamiento:** PostgreSQL 16, con columnas JSON para los datos de estructura variable, marcas de tiempo (*timestamps*) en cada registro y disparadores que impiden modificar o eliminar los registros de auditoría clínica ya confirmados. Las pruebas automatizadas de la API usan SQLite.

**5.2, punto 5 (línea 2843)**, que empieza «**Control de Versiones y Colaboración:**».

> 5. **Control de Versiones y Colaboración:** Git y GitHub, con una variante de GitFlow: `main` para producción, `dev` para integración y ramas `feature/`, `bugfix/` y `hotfix/RF-XX-*`; revisión de código mediante *Pull Requests* hacia `dev` y automatización del pipeline en GitHub Actions.

**5.2, punto 6 (línea 2845)**, que empieza «**Contenedores e Infraestructura:**».

> 6. **Contenedores e Infraestructura:** Docker y Docker Compose para empaquetar los entornos de desarrollo (`docker-compose.yml`) y de laboratorio (`docker-compose.prod.yml`). Vitalsy Life se ejecuta con Expo y no está contenedorizada.

**5.2, punto 7 (línea 2847)**, que empieza «**Interoperabilidad Sanitaria:**».

> 7. **Interoperabilidad Sanitaria:** API REST JSON y clientes FHIR para los sistemas de laboratorio (LIS) y de imágenes (PACS), con implementación simulada por defecto mientras no exista el servicio externo. La codificación con LOINC y SNOMED CT es una ampliación prevista y no está implementada.

**5.2, punto 8 (líneas 2849–2857)**, que empieza «**QA Toolkit (Herramientas de Pruebas):**». Sustituir las cuatro viñetas por:

> 8. **QA Toolkit (Herramientas de Pruebas):**
> - *Pruebas unitarias y de integración:* PHPUnit 11 (API Laravel, pruebas de unidad y de característica sobre SQLite), Vitest 3 con Testing Library (web) y Jest con jest-expo (móvil).
> - *Pruebas de API:* pruebas de característica de PHPUnit (`*ApiTest`), que ejercitan los endpoints de `/api/v1` con sesión y rol.
> - *Pruebas de extremo a extremo (E2E):* Playwright (`frontend/web/e2e/`), con una matriz de Chromium, Firefox y WebKit en `.github/workflows/browser-matrix.yml`; se ejecuta cuando existe la variable `E2E_BASE_URL`.
> - *Pruebas de carga:* k6 (`scripts/load/`), con escenarios para la bandeja de alertas, el registro de constantes y el censo (RNF-03 y RNF-04).
> - *Análisis estático y estilo:* SonarQube Cloud en el pipeline de integración y Laravel Pint para el estilo PHP.

**5.3.1, viñeta «Adecuación Funcional» (línea 2867)**, segunda oración «Se verifica con un 100% de cobertura de código en las clases deterministas de servicio.».

> Se verifica con pruebas unitarias de las clases deterministas (`News2CalculatorTest`, `RiskScaleTest`, `ButterworthFilterTest` y `BaselineCalculatorTest`) y con pruebas de característica de la API; la cobertura de sentencias del backend medida con PCOV es del 94,28 %.

**5.3.1, subviñetas de «Eficiencia de Desempeño y Consumo» (líneas 2871 y 2873).**

> - *Vitalsy Clinical:* filtrado digital y cálculo NEWS2 en servidor en menos de 1 segundo (medido: 0,022 s de media por registro en el entorno de pruebas); despacho de alertas *push* vía *WebSockets* en menos de 2 segundos (meta pendiente de medición).
> - *Vitalsy Life:* lectura periódica en primer plano y cola local de sincronización; el consumo de batería inferior al 5 % diario es una meta pendiente de medición.

**5.3.1, viñeta «Fiabilidad y Tolerancia a Fallos» (línea 2877).**

> - **Fiabilidad y Tolerancia a Fallos:** cola local de sincronización y almacenamiento *offline* en la app móvil, reintentos controlados en los clientes de interoperabilidad y respuesta 503 controlada cuando una dependencia (base de datos, LIS o PACS) no está disponible, para evitar la pérdida de mediciones ante caídas temporales de conectividad.

**5.3.3, viñeta «Cifrado de la Información» (línea 2893).**

> - **Cifrado de la Información:** HTTPS obligatorio en producción y cookie de sesión segura; cifrado en reposo con AES-256 de los campos clínicos sensibles mediante los *casts* de cifrado de Laravel; *hashing* de contraseñas con el mecanismo nativo de Laravel. La versión de TLS depende del servidor de despliegue y no se ha verificado.

**5.3.3, viñeta «Clasificación Regulatoria Diferenciada» (línea 2897).** La clase IIa no tiene evaluación ni fuente normativa. Texto sugerido:

> - **Clasificación Regulatoria Diferenciada:** *Vitalsy Clinical* se concibe como Sistema de Soporte a la Decisión Clínica y *Vitalsy Life* como software de estilo de vida y bienestar. La clasificación como dispositivo médico requeriría una evaluación regulatoria que no forma parte del alcance del proyecto.

**5.4.1, punto 3, «Pruebas de Sistema» (línea 2911).**

> 3. **Pruebas de Sistema (System Testing):** validación del comportamiento integrado mediante pruebas de característica de la API, incluido el vencimiento del plazo de 15 minutos sin acuse, que debe escalar la alerta al supervisor y al Equipo de Respuesta Rápida (ERR). Los recorridos de navegador con Playwright están definidos y se ejecutan cuando se configura el entorno de pruebas.

**5.4.1, punto 4, «Pruebas de Aceptación» (línea 2913).**

> 4. **Pruebas de Aceptación (User Acceptance Testing - UAT):** aceptación de cada unidad por la persona responsable del requisito, con la prueba del criterio en verde y el recorrido crítico visto en la aplicación. La evaluación de usabilidad y carga cognitiva con personal de enfermería, médicos y pacientes es una actividad prevista, sin acta registrada.

**5.4.2, viñetas «Pruebas de Seguridad» y «Pruebas de Carga y Rendimiento» (líneas 2919 y 2921).**

> - **Pruebas de Seguridad:** pruebas de característica que verifican el aislamiento de permisos (rechazo del rol ajeno), la sesión obligatoria, el límite de intentos de login, el cifrado en reposo, la inmutabilidad de la auditoría y la expiración de los códigos de vinculación. La auditoría de penetración queda fuera del alcance del plan de pruebas.
> - **Pruebas de Carga y Rendimiento:** escenarios k6 con hasta 200 usuarios virtuales sobre la bandeja de alertas, el registro de constantes y el censo, con umbrales de percentil 95 definidos en cada script. Los escenarios están escritos y su ejecución contra un entorno de pruebas está pendiente.

**5.4.3, herramientas (líneas 2927–2939).** Sustituir las viñetas de PHPUnit, Jest/RTL, Postman/Newman, Cypress y k6/JMeter por:

> - PHPUnit 11: herramienta de Laravel para las pruebas unitarias y de característica del backend, sobre SQLite. La cobertura se mide con PCOV y se envía a SonarQube Cloud; la meta del laboratorio es el 80 %.
> - Vitest 3 y Testing Library: pruebas de dominio y de componentes del frontend web (React), incluida la representación del riesgo NEWS2 con texto además de color; generan cobertura LCOV.
> - Jest con jest-expo: pruebas de dominio y de componentes de Vitalsy Life; generan cobertura LCOV.
> - Playwright: pruebas de extremo a extremo en navegador (Chromium, Firefox y WebKit) sobre los recorridos críticos; se ejecutan en el workflow `browser-matrix.yml` cuando existe un entorno de pruebas desplegado.
> - k6: pruebas de carga sobre la API, con escenarios para RNF-03 y RNF-04 y umbrales de latencia y de tasa de error definidos en cada script.
> - SonarQube Cloud: análisis estático de fiabilidad, seguridad, mantenibilidad, duplicación y cobertura en cada integración.

**5.4.4, estrategia de automatización (líneas 2943–2957).** Sustituir los puntos 1 y 2 por:

> 1. Cada *push* y cada *pull request* hacia `main` y `dev` ejecuta en GitHub Actions el job `validate`: pruebas y build de la web (Vitest), pruebas de la API con cobertura (PHPUnit y PCOV, sobre SQLite), estilo PHP (Pint), pruebas del móvil con cobertura (Jest) y análisis de SonarQube Cloud. Un fallo en cualquiera de esos pasos impide integrar el cambio.
> 2. Los recorridos de navegador se automatizan con Playwright en el workflow `browser-matrix.yml`. Hoy comprueban la pantalla de inicio de sesión, la redirección de las rutas protegidas sin sesión y la respuesta de la API de salud. El recorrido completo del flujo asistencial y transversal se mantiene como especificación pendiente de automatizar:
>    - a. Ingesta de constantes en Vitalsy Life y generación de la línea de base.
>    - b. Admisión hospitalaria con autorización y migración de datos vía Conector Transversal.
>    - c. Registro de signos vitales con NEWS2 = 8 (riesgo alto) en Vitalsy Clinical y verificación de la notificación por *WebSockets*.
>    - d. Vencimiento del plazo de 15 minutos sin acuse y verificación del escalamiento al supervisor y al ERR.
>    - e. Registro del alta médica, emisión del código QR de *onboarding* y activación del plan domiciliario.

**5.5, validación de entrada (líneas 2967–2969).**

> - El backend valida cada petición con reglas de validación de Laravel; en particular, la ruta de telemetría `POST /api/v1/inpatient-care/encounters/{encounterId}/vital-signs/telemetry` y el registro de constantes de la valoración.
> - Se rechazan los campos obligatorios ausentes, los tipos inválidos y los valores fuera de límites fisiológicos posibles, que la valoración bloquea antes de calcular NEWS2.

**5.5, autenticación y autorización (líneas 2973–2975).**

> - La API exige una sesión autenticada por cookie (Laravel Sanctum) en todo `/api/v1` salvo el login, que está limitado a diez intentos por minuto; la interfaz cierra la sesión tras cinco minutos de inactividad (RNF-09).
> - Se aplica un control de acceso basado en roles (RBAC) con el middleware `role:` sobre los quince roles del catálogo (`RoleCatalog`). El historial de alertas, acuses, escalamientos, dosis firmadas, notas firmadas y entregas de turno registra el usuario y la marca de tiempo, y no puede modificarse ni eliminarse una vez confirmado. Un registro de seguridad con dirección IP por operación es una mejora pendiente.

**5.5, limitación de tasa y XSS (líneas 2979–2981).**

> - La limitación de tasa (*rate limiting*) se aplica hoy al login y a las rutas de Vitalsy Life. Extenderla al endpoint de telemetría, para proteger el servidor ante dispositivos que transmitan sin control, es una mejora pendiente.
> - La interfaz React escapa por defecto el texto que muestra y no inserta HTML sin escapar, lo que mitiga el *Cross-Site Scripting* (XSS) en los campos de texto libre.

#### Capítulos 7, 8, 9, 11 y 12 (datos que envejecieron después de su redacción)

**Ruta del móvil (líneas 4012, 4026, 4058, 4231, 4377, 4421 y 4443).** Sustituir en todas las apariciones `services/movil` por `movil`.

**7.4, nota de la figura de dependencias (línea 4069), última oración.**

> Vitalsy Life se comunica con Laravel mediante el contrato `/api/life/*`, declarado en `routes/api.php` y cubierto por las pruebas `Life*ApiTest`.

**7.2, cuarto párrafo (línea 4036)**, que empieza «En el compose de desarrollo el proceso es php artisan serve…». Añadir al final:

> El compose de desarrollo incluye además el servicio `reverb`, que ejecuta `php artisan reverb:start` para las notificaciones por WebSocket.

**7.4, tercer párrafo (línea 4060)**, segunda parte.

> El archivo project.yml marca SonarQube y Trivy para el laboratorio. Desde el 18/10/2026, `.github/workflows/ci.yml` ejecuta también el análisis de SonarQube Cloud; Trivy y Gitleaks siguen fuera del workflow de GitHub. El repositorio incluye además Playwright para pruebas de navegador (`frontend/web/e2e/`) y escenarios de carga k6 (`scripts/load/`).

**8.3, segundo párrafo (línea 4121), y 9.4, último párrafo (línea 4221).** Donde dicen que el workflow ejecuta «las pruebas de la web, el build, las pruebas de la API y la revisión de estilo con Pint», añadir: «…, las pruebas del móvil con cobertura y el análisis de SonarQube Cloud».

**11.1, «Estado actual» (línea 4337).**

> **Estado actual.** El repositorio declara TDD en CONTRIBUTING.md y docs/architecture/reglas.md. Hay pruebas PHPUnit, Vitest y Jest, y un workflow de GitHub que corre las tres, con cobertura, más Pint y el análisis de SonarQube Cloud. Hay una prueba de extremo a extremo con Playwright en un workflow propio, que no se ha ejecutado por falta de un entorno desplegado. No hay tablero de Bolts ni propiedades generativas. El pipeline externo del laboratorio, según la guía, exige cobertura de al menos 80 % junto con otros criterios de SonarQube. Ese umbral no está codificado en .github/workflows/ci.yml.

**11.2, «Estado actual por nivel» (línea 4351).**

> **Estado actual por nivel.** Hay unitarias y de integración (PHPUnit Feature y Vitest/Jest), y las tres suites se ejecutan en GitHub Actions. Hay una prueba funcional de navegador con Playwright, sin ejecución registrada. No se identificaron pruebas de aceptación automatizadas.

**11.3, «Estado actual» (línea 4371).**

> **Estado actual.** Están las pruebas de funcionalidad de API y de componente web listadas en el apartado 12.3, las unitarias clínicas, la validación de inputRules, el control de estilo Pint y una prueba de navegador con Playwright. No están las propiedades generativas, la ejecución del recorrido de navegador, el registro de pruebas inestables ni un modelo de predicción de defectos.

**11.4, «Ejecución en la integración» (línea 4379)**, primera parte.

> **Ejecución en la integración.** GitHub Actions, job validate, en push y pull_request hacia main y dev: Node 24, PHP 8.2, npm test y npm run build en la web, php artisan test con cobertura Clover sobre SQLite, pint --test, npx jest --ci --coverage en el móvil y análisis de SonarQube Cloud.

**11.4, «Herramientas que la estrategia usa» (línea 4385).** Sustituir «Cypress no está instalado; el capítulo 12 explica por qué entra en la automatización pendiente.» por:

> Playwright está configurado para los recorridos de navegador (frontend/web/e2e/ y el workflow browser-matrix.yml) y k6 para los escenarios de carga (scripts/load/); ninguno tiene todavía una ejecución registrada.

Y sustituir la última oración por:

> SonarQube se ejecuta en SonarQube Cloud dentro del job validate; Trivy y Gitleaks se mencionan en la guía del laboratorio como parte del pipeline incluido, no como herramientas configuradas en este repositorio.

**12.1, tabla de herramientas, fila «GitHub Actions» (línea 4423).**

> | GitHub Actions | .github/workflows/ci.yml y browser-matrix.yml | Vitest, build de la web, PHPUnit con cobertura, Pint, Jest con cobertura y SonarQube Cloud en main y dev; matriz Playwright cuando existe E2E_BASE_URL |

**12.1, bloque «Cypress» (línea 4429).** Sustituir por:

> **Playwright**, para los recorridos de navegador del capítulo 11. Se eligió por su soporte de Chromium, Firefox y WebKit, que permite verificar la compatibilidad entre navegadores (RNF-18). La configuración está en `frontend/web/playwright.config.ts`, la prueba en `frontend/web/e2e/critical-paths.spec.ts` y el workflow en `.github/workflows/browser-matrix.yml`, que instala `@playwright/test` sin modificar `package.json`. El plan de pruebas mencionaba Cypress; el cambio de herramienta queda registrado como desviación en el Capítulo 13.

**12.2, «Móvil» (línea 4443).**

> **Móvil.** movil/jest.config.js usa el preset jest-expo. El comando local es npm test. Desde el 18/10/2026, el job validate instala el paquete y ejecuta npx jest --ci --coverage, que genera movil/coverage/lcov.info para SonarQube Cloud.

**12.2, «Navegador» (línea 4445).**

> **Navegador.** La prueba de navegador está en frontend/web/e2e/ y se ejecuta con Playwright contra la URL indicada en BASE_URL (por defecto http://localhost:8080). En GitHub, el workflow browser-matrix.yml la ejecuta en tres navegadores cuando la variable de repositorio E2E_BASE_URL apunta a un entorno de pruebas desplegado; mientras esa variable no exista, el workflow se omite. No hay data-testid como convención del proyecto.

**12.4, «En GitHub» (línea 4471).** Añadir al final:

> El job también publica el análisis en SonarQube Cloud, que evalúa el Quality Gate de cada *pull request*.

---

## Parte 2. CAPÍTULO 13. MÉTRICAS DE CALIDAD

Este capítulo presenta los resultados obtenidos durante la ejecución de las pruebas del sistema y analiza métricas de calidad basadas en estándares internacionales. Los resultados proceden de una ejecución real de las tres suites automatizadas del repositorio, realizada el 17/10/2026 sobre el commit `a7aac4d` de la rama `dev`, y del historial de GitHub Actions. Se contrastan con el *Plan de Pruebas de Software* del proyecto (Lorenzo Valiente et al., 2026), que fija los casos, la severidad de los defectos y las fórmulas de los indicadores. Conforme a ese plan, solo se presenta como resultado lo que una corrida imprimió y lo que se conserva como evidencia: los umbrales del plan son criterios de interpretación, no mediciones.

**Entorno de la ejecución.** Puesto de desarrollo Windows 11 Pro; PHP 8.2.12 con SQLite (sin PCOV); Node.js de la instalación local con Vitest 3 y Jest (jest-expo). Docker no estaba disponible, por lo que no se levantó la pila integrada (Nginx, API y PostgreSQL) y no se ejecutaron los recorridos de navegador ni el análisis de SonarQube.

| Suite | Comando | Inicio – fin | Resultado |
|---|---|---|---|
| Backend (PHPUnit 11) | `php artisan test --log-junit …` | 22:42:55 – 22:44:42 | 356 pruebas, 2 379 aserciones; 356 aprobadas, 0 fallidas, 0 omitidas (85,27 s) |
| Web (Vitest 3 + Testing Library) | `npx vitest run --coverage … --reporter=junit` | 22:42:55 – 22:45:43 | 75 archivos, 356 pruebas; 356 aprobadas, 0 fallidas (137,62 s) |
| Móvil (Jest + jest-expo) | `npx jest --ci --coverage --json` | tras la web | 33 suites, 256 pruebas; 255 aprobadas, 1 fallida por tiempo de espera (116,24 s) |
| Móvil, reejecución diagnóstica del archivo fallido | `npx jest --ci src/modules/auth/ui/AuthForm.test.tsx` | tras la anterior | 8 de 8 aprobadas (2,90 s) |
| Estilo PHP | `vendor/bin/pint --test` | — | `passed` |
| Build web | `npm run build` (`tsc -b && vite build`) | — | Correcto (47,89 s) |
| Integración continua | job `validate`, ejecución 38960476872 | 16/10/2026 | `success` sobre `a7aac4d` |

### 13.1. Ejecución de Casos de Pruebas

El plan define 221 casos agrupados por fase y unidad (§9 del plan). Cada caso que tiene script nombra el método o el archivo de prueba. La correspondencia entre caso y resultado se estableció cruzando ese nombre con los informes JUnit (backend y web) y JSON (móvil) de la corrida descrita. Cuando el plan cita un archivo y no un método, el estado del caso es el del archivo completo. Los criterios de clasificación son:

- **Aprobado:** el método o archivo indicado por el plan se ejecutó y todas sus pruebas terminaron en verde.
- **Fallido (inestable):** el script se ejecutó y al menos una prueba falló.
- **No ejecutado:** el caso no tiene script en el repositorio (especificación del plan), es una revisión humana sin acta conservada, o depende de una infraestructura que no se levantó o no existe en el workflow.
- **No ejecutado (script no localizado):** el plan cita un archivo que ya no existe en la revisión analizada.

**Resumen por unidad**

| Unidad | Requisitos | Casos del plan | Aprobados | Fallidos | No ejecutados |
|---|---|---|---|---|---|
| Inception (revisión del criterio) | RF-01 a RF-100 | 4 | 0 | 0 | 4 |
| Plataforma | Infraestructura | 4 | 4 | 0 | 0 |
| Acceso y roles | RF-99 a RF-100 | 23 | 20 | 0 | 3 |
| Admisión y censo | RF-01 a RF-20 | 55 | 52 | 0 | 3 |
| Atención y seguimiento | RF-21 a RF-38 | 49 | 49 | 0 | 0 |
| Alertas clínicas | RF-39 a RF-53 | 27 | 27 | 0 | 0 |
| Alta y egreso | RF-54 a RF-67 | 9 | 9 | 0 | 0 |
| Camas y limpieza | RF-68 a RF-77 | 10 | 9 | 0 | 1 |
| Personal asistencial | RF-78 a RF-88 | 6 | 6 | 0 | 0 |
| Vitalsy Life | RF-89 a RF-98 | 15 | 14 | 1 | 0 |
| Pizarra clínica | RNF-16 | 7 | 7 | 0 | 0 |
| Operations | Todas las unidades | 12 | 6 | 0 | 6 |
| **Total** | — | **221** | **203** | **1** | **17** |

Los casos se presentan a continuación por unidad. Las descripciones y los resultados esperados se transcriben del plan, a veces abreviados porque el PDF corta el texto de algunas celdas. El asterisco (\*) indica que el PDF parte el identificador entre líneas o páginas y que el número se reconstruyó por su posición en la tabla, entre el caso anterior y el siguiente.

**Inception (revisión del criterio) (RF-01 a RF-100) — 4 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-INC-01 | Cada unidad nombra actor, acción y criterio de aceptación | El criterio describe un efecto observable que una prueba puede fijar | — | Revisión humana sin acta conservada | No ejecutado |
| CP-INC-02 | El catálogo de | No se introduce una clave | — | Revisión humana sin acta conservada | No ejecutado |
| CP-INC-03 | La trazabilidad requisito–caso queda apuntada a los identificadores de este inventario | Construction parte de un caso ya identificado, con rol y efecto | — | Revisión humana sin acta conservada | No ejecutado |
| CP-INC-04 | Los datos de ejemplo no incluyen secretos ni pacientes reales | Las cuentas son de demostración o las crea la propia prueba | — | Revisión humana sin acta conservada | No ejecutado |

**Plataforma (Infraestructura) — 4 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-PLT-01 | Las tablas de dominio y las banderas de usuario existen tras migrar | El esquema mínimo del dominio está presente | SchemaCoverageTest::test_core_domain_tables_and_user_flags_exist_after_migrate | Pruebas del script en verde | Aprobado |
| CP-PLT-02 | La aplicación de prueba responde | Respuesta de arranque del framework. No es un criterio clínico | ExampleTest::test_the_application_returns_a_successful_response | Pruebas del script en verde | Aprobado |
| CP-PLT-03 | El ejemplo unitario del framework se ejecuta | El ejecutor PHPUnit arranca. No es un criterio clínico | ExampleTest::test_that_true_is_true | Pruebas del script en verde | Aprobado |
| CP-PLT-04 | La web de prueba muestra el encabezado del sistema | Se reconoce el encabezado Vitalsy | frontend/web/src/App.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |

**Acceso y roles (RF-99 a RF-100) — 23 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-ACC-01 | El login funciona sin cabecera de origen para clientes de red local | La sesión inicia | AuthApiTest::test_login_works_without_origin_header_for_lan_clients | Pruebas del script en verde | Aprobado |
| CP-ACC-02 | Credenciales desconocidas se rechazan en español | Mensaje de error en español y sin sesión clínica | AuthApiTest::test_login_rejects_unknown_credentials_in_spanish | Pruebas del script en verde | Aprobado |
| CP-ACC-03 | El login abre sesión y el logout la cierra | GET /api/v1/auth/me refleja la sesión y el logout la termina | AuthApiTest::test_login_starts_a_session_and_logout_ends_it | Pruebas del script en verde | Aprobado |
| CP-ACC-04 | Un rol de apoyo entra y permanece fuera de las rutas clínicas | Las rutas clínicas lo rechazan | AuthApiTest::test_support_role_signs_in_and_stays_out_of_clinical_routes | Pruebas del script en verde | Aprobado |
| CP-ACC-05\* | El invitado y el rol | La orden no se abre | AuthApiTest::test_guest_and_wrong_role_cannot_open_an_admission_order | Pruebas del script en verde | Aprobado |
| CP-ACC-06 | El catálogo cubre a cada actor de proceso | Están las catorce claves | RoleCatalogTest::test_catalog_covers_every_process_actor | Pruebas del script en verde | Aprobado |
| CP-ACC-07 | Cada clave tiene la etiqueta de su actor | La etiqueta corresponde al actor del proceso | RoleCatalogTest::test_catalog_labels_each_role_with_its_process_actor | Pruebas del script en verde | Aprobado |
| CP-ACC-08 | Las claves legadas o desconocidas se rechazan | El catálogo no la acepta | RoleCatalogTest::test_catalog_rejects_legacy_and_unknown_keys | Pruebas del script en verde | Aprobado |
| CP-ACC-09 | El seeder crea una cuenta activa por rol | Una cuenta activa por clave | RoleAccountsSeederTest::test_seeder_creates_one_active_account_per_catalog_role | Pruebas del script en verde | Aprobado |
| CP-ACC-10 | El seeder no conserva roles genéricos legados | No quedan claves genéricas de enfermería o de medicina | RoleAccountsSeederTest::test_seeder_does_not_keep_legacy_generic_roles | Pruebas del script en verde | Aprobado |
| CP-ACC-11 | El formulario no se envía si faltan correo o | El cliente muestra el error y no llama al | frontend/web/src/app/login.test.tsx (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-12 | La contraseña puede mostrarse y ocultarse | El control del ojo alterna la visibilidad | frontend/web/src/app/login.test.tsx (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-13 | El error del servidor se muestra y la credencial válida entra | Mensaje visible y paso al ingreso | frontend/web/src/app/login.test.tsx (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-14 | Enfermería y medicina permanecen separadas, el catálogo incluye a los actores de alertas, egreso, camas y personal, cad… | Misma frontera de roles que la API | frontend/web/src/app/roles.test.ts (4 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-15 | El menú del tratante muestra las | Cada perfil ve solo sus destinos | frontend/web/src/app/navigation.test.tsx (5 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-16 | El inicio conserva los accesos del perfil y la cola de trabajo, y admisión no muestra métricas clínicas inventadas | La cola y los accesos coinciden con el rol | frontend/web/src/app/HomePage.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-17 | La sesión se cierra a los cinco minutos sin actividad y el plazo se reinicia si hay actividad | Cierre a los cinco minutos, o reinicio ante actividad | frontend/web/src/app/idleTimer.test.ts (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-18 | El mensaje de error destinado al usuario se conserva, el error técnico se sustituye por un texto comprensible y se usa … | Texto en español comprensible | frontend/web/src/app/userMessage.test.ts (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-19 | Solo se aceptan rutas internas de retorno y se componen next e ingreso | No se redirige fuera de la aplicación | frontend/web/src/shared/navigation/returnTo.test.ts (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-20 | El shell anuncia el título, permite saltar al | Navegación y mensaje acordes al perfil | frontend/web/src/app/AppShell.test.tsx (4 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ACC-E01 | Login | Permanece el formulario de acceso | Cypress no instalado; Playwright (critical-paths.spec.ts y browser-matrix.yml) no cubre este recorrido exacto y sus ejecuciones se omitieron por falta de E2E_BASE_URL | Sin resultado de corrida | No ejecutado |
| CP-ACC-E02 | Login | La URL deja de ser la de login y aparece el inicio del rol | Cypress no instalado; Playwright (critical-paths.spec.ts y browser-matrix.yml) no cubre este recorrido exacto y sus ejecuciones se omitieron por falta de E2E_BASE_URL | Sin resultado de corrida | No ejecutado |
| CP-ACC-E03 | Censo | El campo census-query está visible | Cypress no instalado; Playwright (critical-paths.spec.ts y browser-matrix.yml) no cubre este recorrido exacto y sus ejecuciones se omitieron por falta de E2E_BASE_URL | Sin resultado de corrida | No ejecutado |

**Admisión y censo (RF-01 a RF-20) — 55 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-ADM-01 | test_admission_order_returns_the_order_or_a_spanish_not_found | La orden conocida se devuelve. La desconocida responde no encontrada, en español | HospitalAdmissionApiTest::test_admission_order_returns_the_order_or_a_spanish_not_found | Pruebas del script en verde | Aprobado |
| CP-ADM-02 | test_filiation_requires_name_in_spanish_and_accepts_a_valid_payload | Error en español si falta el nombre. Alta si el payload es válido | HospitalAdmissionApiTest::test_filiation_requires_name_in_spanish_and_accepts_a_valid_payload | Pruebas del script en verde | Aprobado |
| CP-ADM-03 | test_coverage_referral_wristband_record_and_consent_are_created | Se crean cobertura, derivación, brazalete, expediente y consentimient o | HospitalAdmissionApiTest::test_coverage_referral_wristband_record_and_consent_are_created | Pruebas del script en verde | Aprobado |
| CP-ADM-04 | test_referral_phone_rejects_letters | El servidor rechaza el teléfono | HospitalAdmissionApiTest::test_referral_phone_rejects_letters | Pruebas del script en verde | Aprobado |
| CP-ADM-05\* | test_transfer_and_wristband_codes_are_independent_per_patient | El código de | HospitalAdmissionApiTest::test_transfer_and_wristband_codes_are_independent_per_patient | Pruebas del script en verde | Aprobado |
| CP-ADM-06 | test_transfer_identity_reception_and_relocation | Identidad, recepción y reubicación avanzan para el paciente en curso | HospitalAdmissionApiTest::test_transfer_identity_reception_and_relocation | Pruebas del script en verde | Aprobado |
| CP-ADM-07 | test_nursing_vitals_calculate_news2_and_reject_impossible_values | NEWS2 se calcula. El valor imposible se rechaza | HospitalAdmissionApiTest::test_nursing_vitals_calculate_news2_and_reject_impossible_values | Pruebas del script en verde | Aprobado |
| CP-ADM-08 | test_admission_vitals_with_news2_open_a_clinical_alert | Se abre una alerta clínica | HospitalAdmissionApiTest::test_admission_vitals_with_news2_open_a_clinical_alert | Pruebas del script en verde | Aprobado |
| CP-ADM-09 | test_reconciliation_risk_kardex_and_signature | Conciliación, riesgo, kardex y firma quedan registrados | HospitalAdmissionApiTest::test_reconciliation_risk_kardex_and_signature | Pruebas del script en verde | Aprobado |
| CP-ADM-10 | test_tratante_can_sign_medical_orders | Las indicaciones se firman | HospitalAdmissionApiTest::test_tratante_can_sign_medical_orders | Pruebas del script en verde | Aprobado |
| CP-ADM-11\* | test_medical_orders_default_template_without_prior_payload | Se ofrece la plantilla por | HospitalAdmissionApiTest::test_medical_orders_default_template_without_prior_payload | Pruebas del script en verde | Aprobado |
| CP-ADM-12 | test_signing_orders_creates_basal_emar_plan_from_bpmh | La firma crea el plan basal del e-MAR | HospitalAdmissionApiTest::test_signing_orders_creates_basal_emar_plan_from_bpmh | Pruebas del script en verde | Aprobado |
| CP-ADM-13 | test_signing_without_home_medications_does_not_create_a_plan | No se crea un plan | HospitalAdmissionApiTest::test_signing_without_home_medications_does_not_create_a_plan | Pruebas del script en verde | Aprobado |
| CP-ADM-14 | test_census_lists_the_three_review_patients_at_different_stages | El censo los lista | AdmissionCensusApiTest::test_census_lists_the_three_review_patients_at_different_stages | Pruebas del script en verde | Aprobado |
| CP-ADM-15 | test_census_ignores_patients_who_already_left_the_hospital | El egresado no aparece en el censo de pacientes | AdmissionCensusApiTest::test_census_ignores_patients_who_already_left_the_hospital | Pruebas del script en verde | Aprobado |
| CP-ADM-16 | test_census_filters_by_patient_name_or_document | El filtro devuelve al paciente correspondie nte | AdmissionCensusApiTest::test_census_filters_by_patient_name_or_document | Pruebas del script en verde | Aprobado |
| CP-ADM-17 | test_census_paginates_ten_per_page | Cada página contiene diez | AdmissionCensusApiTest::test_census_paginates_ten_per_page | Pruebas del script en verde | Aprobado |
| CP-ADM-18 | test_file_shows_deliverables_and_unknown_encounter_is_spanish_not_found | La ficha muestra entregables. El desconocido responde en español | AdmissionCensusApiTest::test_file_shows_deliverables_and_unknown_encounter_is_spanish_not_found | Pruebas del script en verde | Aprobado |
| CP-ADM-19 | test_only_the_responsible_role_can_advance_the_current_step | Solo el responsable avanza el paso en curso | AdmissionCensusApiTest::test_only_the_responsible_role_can_advance_the_current_step | Pruebas del script en verde | Aprobado |
| CP-ADM-20 | test_approving_coverage_continues_to_wristband_instead_of_referral | El siguiente paso es el brazalete | AdmissionCensusApiTest::test_approving_coverage_continues_to_wristband_instead_of_referral | Pruebas del script en verde | Aprobado |
| CP-ADM-21 | test_pending_patient_stays_independent_from_a_waiting_referral | Cada caso conserva su estado | AdmissionCensusApiTest::test_pending_patient_stays_independent_from_a_waiting_referral | Pruebas del script en verde | Aprobado |
| CP-ADM-22 | test_encounter_file_exposes_registered_coverage_referral | La ficha muestra esa derivación | AdmissionCensusApiTest::test_encounter_file_exposes_registered_coverage_referral | Pruebas del script en verde | Aprobado |
| CP-ADM-23 | test_closing_the_admission_removes_it_from_the_physician_queue | Sale de la cola del médico | AdmissionCensusApiTest::test_closing_the_admission_removes_it_from_the_physician_queue | Pruebas del script en verde | Aprobado |
| CP-ADM-24 | test_tratante_can_advance_indicaciones_step | Puede avanzar ese paso | AdmissionCensusApiTest::test_tratante_can_advance_indicaciones_step | Pruebas del script en verde | Aprobado |
| CP-ADM-25 | test_rejected_coverage_does_not_open_the_wristband_step | El brazalete no se abre | AdmissionCensusApiTest::test_rejected_coverage_does_not_open_the_wristband_step | Pruebas del script en verde | Aprobado |
| CP-ADM-26 | test_opening_a_known_order_reuses_the_encounter_and_unknown_order_is_not_found | La conocida reutiliza el encuentro. La desconocida no se encuentra | AdmissionCensusApiTest::test_opening_a_known_order_reuses_the_encounter_and_unknown_order_is_not_found | Pruebas del script en verde | Aprobado |
| CP-ADM-27 | test_manual_and_external_intake_create_independent_encounters | Cada uno crea su encuentro | AdmissionCensusApiTest::test_manual_and_external_intake_create_independent_encounters | Pruebas del script en verde | Aprobado |
| CP-ADM-28 | Paciente estable: puntaje 0, riesgo bajo y verde | NEWS2 estable en cero | News2CalculatorTest::test_stable_patient_scores_zero_low_and_green | Pruebas del script en verde | Aprobado |
| CP-ADM-29 | Un parámetro de tres puntos marca urgencia aunque el agregado sea bajo-medio | Urgencia por parámetr o único | News2CalculatorTest::test_single_parameter_of_three_is_urgent_low_medium | Pruebas del script en verde | Aprobado |
| CP-ADM-30 | La escala 2 puntúa distinto el oxígeno y el aire | Puntajes distintos según aire u oxígeno | News2CalculatorTest::test_scale_two_scores_oxygen_and_air_differently | Pruebas del script en verde | Aprobado |
| CP-ADM-31 | La confusión crónica no puntúa | Confusió n crónica sin puntos | News2CalculatorTest::test_chronic_confusion_does_not_score | Pruebas del script en verde | Aprobado |
| CP-ADM-32\* | Morse usa los cortes de cuidado | Bandas de cuidado | RiskScaleTest::test_morse_uses_acute_care_cutoffs | Pruebas del script en verde | Aprobado |
| CP-ADM-33 | Braden: menor puntaje, mayor riesgo, y fricción inválida rechazada | Sentido de la escala y rechazo | RiskScaleTest::test_braden_lower_score_means_higher_risk_and_rejects_invalid_friction | Pruebas del script en verde | Aprobado |
| CP-ADM-34 | Braden cubre alto, moderado, leve y ninguno | Las cuatro bandas | RiskScaleTest::test_braden_bands_cover_high_moderate_mild_and_none | Pruebas del script en verde | Aprobado |
| CP-ADM-35 | Una subescala de Braden fuera de 1 a 4 se rechaza | Rechazo del ítem | RiskScaleTest::test_braden_rejects_a_subscale_outside_one_to_four | Pruebas del script en verde | Aprobado |
| CP-ADM-36 | digitsOnly elimina letras y respeta el tope; el documento y el teléfono exigen | Validació n de cliente antes de enviar | frontend/web/src/shared/validation/inputRules.test.ts (4 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-37 | NEWS2 de la web aplica umbrales de respiración, escala de SpO2, presión, pulso, temperatura, consciencia y oxígeno supl… | Misma regla clínica en el cliente | frontend/web/src/modules/nursing-assessment/domain/news2.test.ts (9 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-38\* | Morse suma | Escalas | frontend/web/src/modules/risk-assessment/domain/scales.test.ts (7 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-39 | Un conjunto fisiológico plausible se acepta y un valor imposible se rechaza, con todas las mediciones exigidas | Límites de constant es | frontend/web/src/modules/nursing-assessment/domain/vitalSigns.test.ts (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-40 | El tratante puede firmar indicaciones basales y no actúa en pasos de enfermería que no le corresponde n | Paso habilitad o solo para su rol | frontend/web/src/modules/admission-census/domain/steps.test.ts (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-41 | El stepper permite volver a pasos del rol ya alcanzados, bloquea el resto y no ofrece enlaces de admisión al camillero | Progreso y rol | frontend/web/src/modules/admission-census/ui/AdmissionStepper.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-42 | Muestra la orden y un error accesible si no existe; traduce un fallo de conexión al español; no envía la filiación inco… | El formulario valida antes de enviar y cada paso deja su evidencia en pantalla | frontend/web/src/modules/admission/admission.test.tsx (9 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-43 | Lista pacientes y continúa solo el paso del perfil; busca y pagina de diez en diez; usa títulos genéricos de listado; b… | Censo y ficha coherentes con el rol y con el paso | frontend/web/src/modules/admission-census/census.test.tsx (11 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-44 | Pide abrir un paciente si no hay ingreso; consulta el traslado y confirma el paso; rechaza un brazalete que no coincide… | Identidad del traslado ligada al paciente en curso | frontend/web/src/modules/patient-transfer/transfer.test.tsx (6 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-45 | Exige la anamnesis; bloquea constantes imposibles y muestra NEWS2 con texto; avisa si las constantes abren alerta; | Valoración y constantes con oráculo visible | frontend/web/src/modules/nursing-assessment/nursing.test.tsx (6 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-46 | Muestra dosis, vía y alerta de alergia, distingue el estado, y permite avanzar si no hay medicación habitual | Conciliación fiel al estado del paciente | frontend/web/src/modules/medication-reconciliation/reconciliation.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-47 | Calcula Morse y Braden y muestra el nivel con una recomendación escrita | Nivel y recomendación, no solo un color | frontend/web/src/modules/risk-assessment/risk.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-48 | Resume valoración, medicamentos, alergias, constantes y riesgos | Kardex de ingreso legible | frontend/web/src/modules/admission-kardex/kardex.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-49 | Permite registrar ítems y exige confirmación para firmar; el tratante abre y firma las indicaciones | Firma de indicaciones basales | frontend/web/src/modules/medical-orders/orders.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-50 | Muestra un código de barras para el valor emitido | El brazalete puede representarse | frontend/web/src/modules/admission/components/Barcode.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-51\* | El estado de cobertura se | El estado no depende solo | frontend/web/src/shared/ui/StatusStamp.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-52 | Crea un iframe de impresión con el título del documento | Impresión del documento de ingreso | frontend/web/src/shared/print/printDocument.test.ts (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ADM-P01 | NEWS2 | News2Calculato r disponible | No hay pruebas de propiedades (fast-check o generador PHP) en el repositorio | Sin resultado de corrida | No ejecutado |
| CP-ADM-P02 | Morse y Braden | Escalas disponibles | No hay pruebas de propiedades (fast-check o generador PHP) en el repositorio | Sin resultado de corrida | No ejecutado |
| CP-ADM-P03 | Documento y teléfono | Reglas de inputRules.ts | No hay pruebas de propiedades (fast-check o generador PHP) en el repositorio | Sin resultado de corrida | No ejecutado |

**Atención y seguimiento (RF-21 a RF-38) — 49 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-ATE-01\* | La sincronización | Integración | LabResultsIntegrationApiTest::test_system_sync_integrates_lis_lab_results_for_an_encounter | Pruebas del script en verde | Aprobado |
| CP-ATE-02 | La misma sincronización LIS es idempotente | No se duplican los identificadores externos | LabResultsIntegrationApiTest::test_sync_is_idempotent_for_the_same_lis_external_ids | Pruebas del script en verde | Aprobado |
| CP-ATE-03 | El clínico lista los resultados integrados | El rol clínico ve el listado | LabResultsIntegrationApiTest::test_clinicians_can_list_integrated_lab_results | Pruebas del script en verde | Aprobado |
| CP-ATE-04 | Un encuentro desconocido responde no encontrado, en español | Mensaje en español | ImagingReportsIntegrationApiTest::test_unknown_encounter_returns_spanish_not_found; LabResultsIntegrationApiTest::test_unknown_encounter_re… | Pruebas del script en verde | Aprobado |
| CP-ATE-05 | Admisión no sincroniza laboratorio | Rechazo sin efecto | LabResultsIntegrationApiTest::test_admission_role_cannot_sync_lab_results | Pruebas del script en verde | Aprobado |
| CP-ATE-06 | La sincronización integra informes PACS | Informes asociados al encuentro | ImagingReportsIntegrationApiTest::test_system_sync_integrates_pacs_imaging_reports_for_an_encounter | Pruebas del script en verde | Aprobado |
| CP-ATE-07 | La misma sincronización PACS es idempotente | Sin duplicados | ImagingReportsIntegrationApiTest::test_sync_is_idempotent_for_the_same_pacs_external_ids | Pruebas del script en verde | Aprobado |
| CP-ATE-08\* | El clínico lista | Listado visible | ImagingReportsIntegrationApiTest::test_clinicians_can_list_integrated_imaging_reports | Pruebas del script en verde | Aprobado |
| CP-ATE-09 | Encuentro de imagen desconocido, en español | No encontrado en español | ImagingReportsIntegrationApiTest::test_unknown_encounter_returns_spanish_not_found; LabResultsIntegrationApiTest::test_unknown_encounter_re… | Pruebas del script en verde | Aprobado |
| CP-ATE-10 | Admisión no sincroniza imagen | Rechazo sin efecto | ImagingReportsIntegrationApiTest::test_admission_role_cannot_sync_imaging_reports | Pruebas del script en verde | Aprobado |
| CP-ATE-11 | La visita reúne laboratorio, imagen y notas de enfermería del día | Tablero consolidado del día | ClinicalVisitConsolidationApiTest::test_visit_board_consolidates_labs_imaging_and_nursing_notes_of_the_day | Pruebas del script en verde | Aprobado |
| CP-ATE-12 | El residente abre la visita | Acceso concedido | ClinicalVisitConsolidationApiTest::test_resident_can_open_clinical_visit_board | Pruebas del script en verde | Aprobado |
| CP-ATE-13 | Enfermería no abre el tablero de visita médica | Rechazo | ClinicalVisitConsolidationApiTest::test_nurse_cannot_open_clinical_visit_board | Pruebas del script en verde | Aprobado |
| CP-ATE-14 | El residente registra y firma la evolución | Nota firmada | MedicalEvolutionNoteApiTest::test_resident_can_register_and_sign_a_medical_evolution_note | Pruebas del script en verde | Aprobado |
| CP-ATE-15\* | El texto de la | Error si falta el | MedicalEvolutionNoteApiTest::test_body_is_required_in_spanish | Pruebas del script en verde | Aprobado |
| CP-ATE-16 | El tratante registra la evolución | Nota registrada | MedicalEvolutionNoteApiTest::test_tratante_can_register_evolution_note | Pruebas del script en verde | Aprobado |
| CP-ATE-17 | El residente lista las evoluciones | Listado del encuentro | MedicalEvolutionNoteApiTest::test_resident_can_list_evolution_notes | Pruebas del script en verde | Aprobado |
| CP-ATE-18 | El tratante crea la prescripción y refresca el kardex | Plan creado y kardex actualizado | CpoePrescriptionApiTest::test_tratante_can_create_cpoe_prescription_and_refresh_kardex | Pruebas del script en verde | Aprobado |
| CP-ATE-19 | El tratante edita, elimina y agrega ítems | Cada ítem se gestiona por separado | CpoePrescriptionApiTest::test_tratante_can_edit_delete_and_add_items_individually | Pruebas del script en verde | Aprobado |
| CP-ATE-20 | Continuar el plan conserva los ítems previos cuando se pide | Los ítems anteriores permanecen | CpoePrescriptionApiTest::test_continue_plan_keeps_previous_items_when_requested | Pruebas del script en verde | Aprobado |
| CP-ATE-21 | El residente no administra la prescripción | Rechazo sin alta de plan | CpoePrescriptionApiTest::test_resident_cannot_manage_cpoe | Pruebas del script en verde | Aprobado |
| CP-ATE-22\* | Los ítems de | Error si no hay | CpoePrescriptionApiTest::test_items_are_required_in_spanish | Pruebas del script en verde | Aprobado |
| CP-ATE-23 | Constantes manuales con NEWS2 cero programan el siguiente control a las doce horas | Próximo control a las 12 horas | VitalSignsMonitoringApiTest::test_manual_vitals_with_news2_zero_schedules_next_control_in_12_hours | Pruebas del script en verde | Aprobado |
| CP-ATE-24 | NEWS2 de uno o más activa el proceso de alerta | Se abre el proceso de alerta | VitalSignsMonitoringApiTest::test_vitals_with_news2_at_least_one_activate_alert_process | Pruebas del script en verde | Aprobado |
| CP-ATE-25 | La telemetría aplica Butterworth y guarda la lectura filtrada | Lectura filtrada persistida | VitalSignsMonitoringApiTest::test_telemetry_applies_butterworth_and_stores_filtered_reading | Pruebas del script en verde | Aprobado |
| CP-ATE-26 | El gráfico devuelve la serie evolutiva | Serie del encuentro | VitalSignsMonitoringApiTest::test_chart_returns_evolutionary_series | Pruebas del script en verde | Aprobado |
| CP-ATE-27 | El filtro de Butterworth atenúa el ruido de alta frecuencia | Atenuación de orden cuatro y fase cero | ButterworthFilterTest::test_zero_phase_fourth_order_attenuates_high_frequency_noise | Pruebas del script en verde | Aprobado |
| CP-ATE-28 | Enfermería lista las dosis del turno | Dosis del turno visible | EmarAndCareApiTest::test_nurse_can_list_emar_doses_for_current_shift | Pruebas del script en verde | Aprobado |
| CP-ATE-29 | Los cinco correctos bloquean un código que no coincide y permiten la administración firmada | Bloqueo ante discrepancia y administración si coincide | EmarAndCareApiTest::test_five_rights_block_on_mismatch_and_allow_signed_admin | Pruebas del script en verde | Aprobado |
| CP-ATE-30 | Enfermería registra una nota de evolución | Nota de enfermería registrada | EmarAndCareApiTest::test_nurse_can_register_evolution_note | Pruebas del script en verde | Aprobado |
| CP-ATE-31 | Enfermera de piso y auxiliar usan notas y actividades | Ambos roles registran | EmarAndCareApiTest::test_nurse_and_auxiliar_can_use_notes_and_care_activities | Pruebas del script en verde | Aprobado |
| CP-ATE-32 | Una prescripción nueva programa dosis aunque ya existan dosis previas | Nuevas dosis en el e-MAR | EmarAndCareApiTest::test_new_cpoe_schedules_doses_even_when_prior_doses_exist | Pruebas del script en verde | Aprobado |
| CP-ATE-33 | El auxiliar completa una actividad de | Actividad completada con trazabilidad | EmarAndCareApiTest::test_auxiliar_can_complete_care_activity | Pruebas del script en verde | Aprobado |
| CP-ATE-34 | Enfermería lista y completa un control vencible | Control completado y siguiente programación | MonitoringControlsAndComplianceTest::test_nurse_lists_and_completes_a_due_monitoring_control | Pruebas del script en verde | Aprobado |
| CP-ATE-35 | Un control vencido abre alerta de cumplimiento para la enfermera de piso | Alerta de cumplimiento | MonitoringControlsAndComplianceTest::test_overdue_control_opens_a_compliance_alert_for_the_floor_nurse | Pruebas del script en verde | Aprobado |
| CP-ATE-36 | Una dosis de e-MAR vencida abre alerta y se cierra al administrar | Apertura y cierre ligados a la administración | MonitoringControlsAndComplianceTest::test_overdue_emar_dose_opens_compliance_alert_and_closes_when_administered | Pruebas del script en verde | Aprobado |
| CP-ATE-37 | Los roles clínicos leen el expediente | Expediente consolidado | PatientClinicalChartApiTest::test_clinical_roles_can_read_inpatient_clinical_chart | Pruebas del script en verde | Aprobado |
| CP-ATE-38 | Admisión no lee el expediente clínico | Rechazo | PatientClinicalChartApiTest::test_admission_role_cannot_read_clinical_chart | Pruebas del script en verde | Aprobado |
| CP-ATE-39\* | El expediente incluye | Actividades dentro del rango | PatientClinicalChartApiTest::test_clinical_chart_includes_care_activities_and_date_filter | Pruebas del script en verde | Aprobado |
| CP-ATE-40 | Integra resultados del LIS y los muestra en el expediente | Resultados visibles tras la integración | frontend/web/src/modules/lab-results/lab-results.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-41 | Integra informes del PACS y los muestra | Informes visibles | frontend/web/src/modules/imaging-reports/imaging-reports.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-42 | Muestra laboratorio, imágenes y notas del día en una sola pantalla | Visita consolidada | frontend/web/src/modules/clinical-visit/clinical-visit.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-43 | Exige el texto y registra la nota firmada; el tratante abre la evolución | Evolución con texto obligatorio | frontend/web/src/modules/medical-evolution/medical-evolution.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-44 | Crea el plan inicial sin una opción de reemplazo completo | Alta del plan según la pantalla vigente | frontend/web/src/modules/cpoe/cpoe.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-45 | No precarga valores y registra constantes con gráfica | Toma manual sin valores supuestos | frontend/web/src/modules/vital-monitoring/vital-monitoring.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-46 | Lista dosis y administra tras verificar códigos, sin precarga | Administración condicionada a los códigos | frontend/web/src/modules/e-mar/emar.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-47 | Lista controles y registra la toma reprogramando el siguiente | Control completado y nueva fecha | frontend/web/src/modules/vital-controls/vital-controls.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-48 | La enfermera navega notas y actividades y deja trazabilidad; el auxiliar registra nota y cuidado directo | Cuidado atribuido a quien lo completa | frontend/web/src/modules/nursing-care/nursing-care.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ATE-49 | El expediente se recorre por pestañas sin la etiqueta de proceso 1 | Lectura por admisión, constantes, tratamiento, paraclínicos y evoluciones | frontend/web/src/modules/patient-chart/patient-chart.test.tsx (3 pruebas en verde) | Pruebas del script en verde | Aprobado |

**Alertas clínicas (RF-39 a RF-53) — 27 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-ALE-01 | test_monitoring_alert_is_routed_to_the_floor_nurse_with_a_deadline | La alerta de monitoreo llega a la enfermera de piso con plazo | ClinicalAlertsApiTest::test_monitoring_alert_is_routed_to_the_floor_nurse_with_a_deadline | Pruebas del script en verde | Aprobado |
| CP-ALE-02 | test_auxiliary_registers_unexpected_deterioration_for_the_nurse | El auxiliar registra el deterioro y la enfermera queda notificada | ClinicalAlertsApiTest::test_auxiliary_registers_unexpected_deterioration_for_the_nurse | Pruebas del script en verde | Aprobado |
| CP-ALE-03 | test_observation_requires_a_note | Sin nota, la observación no se acepta | ClinicalAlertsApiTest::test_observation_requires_a_note | Pruebas del script en verde | Aprobado |
| CP-ALE-04 | test_inbox_lists_open_alerts_for_the_role_and_hides_closed_ones | La bandeja muestra abiertas y oculta cerradas | ClinicalAlertsApiTest::test_inbox_lists_open_alerts_for_the_role_and_hides_closed_ones | Pruebas del script en verde | Aprobado |
| CP-ALE-05 | test_nurse_acknowledges_the_alert_and_the_siren_stops_while_work_continues | El acuse detiene la sirena y el caso sigue en seguimiento | ClinicalAlertsApiTest::test_nurse_acknowledges_the_alert_and_the_siren_stops_while_work_continues | Pruebas del script en verde | Aprobado |
| CP-ALE-06 | test_acknowledged_alert_without_follow_up_re_alerts_after_fifteen_minutes | A los quince minutos sin seguimiento vuelve a alertar | ClinicalAlertsApiTest::test_acknowledged_alert_without_follow_up_re_alerts_after_fifteen_minutes | Pruebas del script en verde | Aprobado |
| CP-ALE-07 | test_unacknowledged_nurse_alert_escalates_to_the_supervisor | Sin acuse, escala a la supervisora | ClinicalAlertsApiTest::test_unacknowledged_nurse_alert_escalates_to_the_supervisor | Pruebas del script en verde | Aprobado |
| CP-ALE-08 | test_reassessment_recalculates_news2_on_the_same_alert_without_duplicating_it | La revaloración actualiza la misma alerta | ClinicalAlertsApiTest::test_reassessment_recalculates_news2_on_the_same_alert_without_duplicating_it | Pruebas del script en verde | Aprobado |
| CP-ALE-09 | test_reassessment_with_persistent_ | La alteración persistente avisa | ClinicalAlertsApiTest::test_reassessment_with_persistent_alteration_auto_notifies_the_doctor | Pruebas del script en verde | Aprobado |
| CP-ALE-10 | test_nurse_can_request_medical_attention_without_reassessment_for_clinical_worry | La preocupación clínica permite pedir atención sin una toma previa | ClinicalAlertsApiTest::test_nurse_can_request_medical_attention_without_reassessment_for_clinical_worry | Pruebas del script en verde | Aprobado |
| CP-ALE-11 | test_nurse_schedules_a_new_monitoring_frequency | Queda programada la nueva frecuencia | ClinicalAlertsApiTest::test_nurse_schedules_a_new_monitoring_frequency | Pruebas del script en verde | Aprobado |
| CP-ALE-12 | test_nurse_confirms_medical_attention_and_the_doctor_is_notified_with_a_fifteen_minute_clock | El médico recibe el aviso con reloj de quince minutos | ClinicalAlertsApiTest::test_nurse_confirms_medical_attention_and_the_doctor_is_notified_with_a_fifteen_minute_clock | Pruebas del script en verde | Aprobado |
| CP-ALE-13 | test_doctor_acknowledges_and_records_the_urgent_assessment | El médico acusa y registra la valoración urgente | ClinicalAlertsApiTest::test_doctor_acknowledges_and_records_the_urgent_assessment | Pruebas del script en verde | Aprobado |
| CP-ALE-14 | test_missing_medical_response_escalates_to_supervisor_and_rapid_response_team | Sin respuesta médica, escalan supervisora y equipo de respuesta rápida | ClinicalAlertsApiTest::test_missing_medical_response_escalates_to_supervisor_and_rapid_response_team | Pruebas del script en verde | Aprobado |
| CP-ALE-15 | test_doctor_requests_the_rapid_response_team | El médico convoca al equipo | ClinicalAlertsApiTest::test_doctor_requests_the_rapid_response_team | Pruebas del script en verde | Aprobado |
| CP-ALE-16 | test_rapid_response_team_orders_icu_without_closing_the_case | La orden de UCI no cierra el caso | ClinicalAlertsApiTest::test_rapid_response_team_orders_icu_without_closing_the_case | Pruebas del script en verde | Aprobado |
| CP-ALE-17 | test_rapid_response_team_can_keep_the_patient_on_the_ward | El equipo puede mantener al paciente en piso | ClinicalAlertsApiTest::test_rapid_response_team_can_keep_the_patient_on_the_ward | Pruebas del script en verde | Aprobado |
| CP-ALE-18 | test_timeline_consolidates_the_whole_history_in_order | La línea de tiempo conserva el orden | ClinicalAlertsApiTest::test_timeline_consolidates_the_whole_history_in_order | Pruebas del script en verde | Aprobado |
| CP-ALE-19 | test_icu_order_requires_doctor_and_nurse_authorization_before_transfer_and_return | Traslado y retorno exigen la autorización de médico y enfermera | ClinicalAlertsApiTest::test_icu_order_requires_doctor_and_nurse_authorization_before_transfer_and_return | Pruebas del script en verde | Aprobado |
| CP-ALE-20 | test_alert_history_cannot_be_rewritten_once_recorded | El historial registrado no se reescribe | ClinicalAlertsApiTest::test_alert_history_cannot_be_rewritten_once_recorded | Pruebas del script en verde | Aprobado |
| CP-ALE-21 | test_treating_physician_sees_medical_alerts_assigned_to_the_resident_role | El tratante ve las alertas médicas asignadas al residente | ClinicalAlertsApiTest::test_treating_physician_sees_medical_alerts_assigned_to_the_resident_role | Pruebas del script en verde | Aprobado |
| CP-ALE-22 | test_administrative_roles_cannot_reach_the_alert_flow | Los roles administrativos no entran al flujo | ClinicalAlertsApiTest::test_administrative_roles_cannot_reach_the_alert_flow | Pruebas del script en verde | Aprobado |
| CP-ALE-23 | test_only_the_assigned_role_can_acknowledge_the_alert | Solo el rol asignado acusa | ClinicalAlertsApiTest::test_only_the_assigned_role_can_acknowledge_the_alert | Pruebas del script en verde | Aprobado |
| CP-ALE-24 | La bandeja lista severidad y ubicación, confirma la recepción, avisa si no hay pendientes, bloquea al perfil ajeno, exi… | La pantalla sigue el mismo flujo que la API | frontend/web/src/modules/clinical-alerts/clinical-alerts.test.tsx (13 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ALE-25 | La campana muestra el número del perfil, emite aviso y señal sonora, detiene el sonido al confirmar, lo mantiene si el … | La sirena para solo cuando el acuse se confirma | frontend/web/src/modules/clinical-alerts/alert-notifications.test.tsx (8 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ALE-26 | La sirena suena en bucle hasta detenerla, no se duplica si se arranca dos veces e informa si el navegador bloquea el au… | Una sola señal, detenible, con aviso si no hay gesto del usuario | frontend/web/src/shared/audio/alertSiren.test.ts (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-ALE-27 | El aviso emergente se anuncia a lectores de pantalla, no se cierra solo por tiempo, se mantiene si la confirmación fall… | La lectura se confirma de forma explícita | frontend/web/src/shared/ui/toast/toast.test.tsx (5 pruebas en verde) | Pruebas del script en verde | Aprobado |

**Alta y egreso (RF-54 a RF-67) — 9 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-EGR-01 | test_treating_physician_registers_discharge_order | El tratante registra la orden de alta | DischargeApiTest::test_treating_physician_registers_discharge_order | Pruebas del script en verde | Aprobado |
| CP-EGR-02 | test_order_notifies_social_work_on_the_board | Trabajo social ve el caso en el tablero | DischargeApiTest::test_order_notifies_social_work_on_the_board | Pruebas del script en verde | Aprobado |
| CP-EGR-03 | test_cannot_write_epicrisis_before_discharge_order | La epicrisis no se escribe antes de la orden | DischargeApiTest::test_cannot_write_epicrisis_before_discharge_order | Pruebas del script en verde | Aprobado |
| CP-EGR-04 | test_parallel_social_and_nursing_then_exit_pass_and_physical_exit | Trabajo social y enfermería avanzan en paralelo; después vienen el pase y la salida física | DischargeApiTest::test_parallel_social_and_nursing_then_exit_pass_and_physical_exit | Pruebas del script en verde | Aprobado |
| CP-EGR-05 | test_cannot_issue_exit_pass_when_account_is_pending | Con la cuenta pendiente no se emite el pase | DischargeApiTest::test_cannot_issue_exit_pass_when_account_is_pending | Pruebas del script en verde | Aprobado |
| CP-EGR-06 | test_only_the_floor_nurse_can_confirm_the_exit | Solo la enfermera de piso confirma la salida | DischargeApiTest::test_only_the_floor_nurse_can_confirm_the_exit | Pruebas del script en verde | Aprobado |
| CP-EGR-07 | test_cashier_cannot_open_medical_order | Altas y caja no abren la orden médica | DischargeApiTest::test_cashier_cannot_open_medical_order | Pruebas del script en verde | Aprobado |
| CP-EGR-08\* | test_board_lists_open_discharge_cases_for_nursing | Enfermería ve los egresos | DischargeApiTest::test_board_lists_open_discharge_cases_for_nursing | Pruebas del script en verde | Aprobado |
| CP-EGR-09 | Trabajo social lista pendientes; el escaneo del brazalete abre la ficha del hospitalizado; el tratante registra la orde… | discharge.test.tsx cumple el mismo recorrido en la interfaz | frontend/web/src/modules/discharge/discharge.test.tsx (4 pruebas en verde) | Pruebas del script en verde | Aprobado |

**Camas y limpieza (RF-68 a RF-77) — 10 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-CAM-01 | test_census_shows_beds_by_ward | El censo agrupa las camas por sala | BedManagementApiTest::test_census_shows_beds_by_ward | Pruebas del script en verde | Aprobado |
| CP-CAM-02 | test_request_without_availability_goes_to_prioritized_waitlist | Sin cama, la solicitud entra a la lista de espera | BedManagementApiTest::test_request_without_availability_goes_to_prioritized_waitlist | Pruebas del script en verde | Aprobado |
| CP-CAM-03 | test_suggests_isolation_room_and_assigns_it | Se sugiere y se asigna la habitación de aislamiento | BedManagementApiTest::test_suggests_isolation_room_and_assigns_it | Pruebas del script en verde | Aprobado |
| CP-CAM-04 | test_exit_dispatches_cleaning_then_unit_becomes_available | La salida abre la limpieza y, al completarla, la cama vuelve a estar disponible | BedManagementApiTest::test_exit_dispatches_cleaning_then_unit_becomes_available | Pruebas del script en verde | Aprobado |
| CP-CAM-05 | test_supervisor_registers_discharge_projection | La supervisora registra la proyección de alta | BedManagementApiTest::test_supervisor_registers_discharge_projection | Pruebas del script en verde | Aprobado |
| CP-CAM-06 | test_floor_nurse_lists_available_beds | La enfermera de piso lista las camas disponibles | BedManagementApiTest::test_floor_nurse_lists_available_beds | Pruebas del script en verde | Aprobado |
| CP-CAM-07 | test_admission_cannot_list_available_beds | Admisión no lista esas camas | BedManagementApiTest::test_admission_cannot_list_available_beds | Pruebas del script en verde | Aprobado |
| CP-CAM-08 | test_unrelated_role_cannot_see_census | Un rol ajeno no ve el censo de camas | BedManagementApiTest::test_unrelated_role_cannot_see_census | Pruebas del script en verde | Aprobado |
| CP-CAM-09\* | test_waitlist_orders_critical_first | La espera ordena | BedManagementApiTest::test_waitlist_orders_critical_first | Pruebas del script en verde | Aprobado |
| CP-CAM-10 | La interfaz muestra el censo, permite registrar una solicitud y permite a limpieza completar la desinfección | bed-management.test.tsx | bed-management.test.tsx eliminado en 27f2d1d (09/10/2026); bed-census.test.tsx y cleaning-orders.test.tsx en verde, sin correspondencia cas… | El script citado por el plan no existe | No ejecutado (script no localizado) |

**Personal asistencial (RF-78 a RF-88) — 6 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-PER-01 | test_leadership_publishes_monthly_shift_plan | Jefatura publica el rol mensual | StaffRosterApiTest::test_leadership_publishes_monthly_shift_plan | Pruebas del script en verde | Aprobado |
| CP-PER-02 | test_suggests_fewer_patients_for_high_news2_and_approves_assignment | Un NEWS2 alto reparte menos pacientes y la asignación se aprueba | StaffRosterApiTest::test_suggests_fewer_patients_for_high_news2_and_approves_assignment | Pruebas del script en verde | Aprobado |
| CP-PER-03 | test_handover_consolidates_vitals_emar_and_alerts_then_signs | La entrega reúne constantes, e-MAR y alertas, y se firma | StaffRosterApiTest::test_handover_consolidates_vitals_emar_and_alerts_then_signs | Pruebas del script en verde | Aprobado |
| CP-PER-04\* | test_absence_in_critical_sector_opens_coverage_request | La ausencia en un sector | StaffRosterApiTest::test_absence_in_critical_sector_opens_coverage_request | Pruebas del script en verde | Aprobado |
| CP-PER-05 | test_alert_is_assigned_to_the_nurse_of_the_day | La alerta queda en la enfermera asignada ese día | StaffRosterApiTest::test_alert_is_assigned_to_the_nurse_of_the_day | Pruebas del script en verde | Aprobado |
| CP-PER-06 | La jefatura publica el rol en la pantalla y la supervisora sugiere y aprueba la asignación | staff-roster.test.tsx | frontend/web/src/modules/staff-roster/staff-roster.test.tsx (17 pruebas en verde) | Pruebas del script en verde | Aprobado |

**Vitalsy Life (RF-89 a RF-98) — 15 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-LIF-01 | Exige correo y contraseña; registra al ciudadano y rechaza una contraseña incorrecta; no simula un correo de recuperaci… | Acceso local honesto | movil/src/modules/auth/domain/auth.test.ts (6 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-02 | Muestra las alertas de campo antes de intentar entrar; alterna la visibilidad de la contraseña; explica que la recupera… | Validación visible previa al envío | movil/src/modules/auth/ui/AuthForm.test.tsx (7 ok/1 fallo) | Corrida completa: 1 prueba excedió el tiempo límite de 5 s (las otras 7 del archivo, en verde). Reejecución aislada: 8 de 8 en verde | Fallido (inestable) |
| CP-LIF-03 | Abre la sesión tras el registro y la cierra al salir; niega el código de vinculación hasta que el intercambio está acti… | Sesión, privacidad y plan coherentes con lo que el dispositivo sabe | movil/src/modules/life/lifeApp.test.ts (19 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-04 | Parte cerrado y sin código; emite el código solo con el intercambio activo; revoca código e instituciones; no vincula u… | El código existe solo con consentimiento | movil/src/modules/privacy/domain/consent.test.ts (6 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-05 | El contacto exige nombre y teléfono de dígitos, y el teléfono conserva solo dígitos | Misma regla de teléfono que en la web | movil/src/modules/profile/domain/contact.test.ts (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-06 | Mantiene las muestras pendientes sin red; no presenta una sincronización en la nube si no hay API; envía pendientes sol… | La cola no miente sobre el estado de envío | movil/src/modules/health-sync/domain/syncQueue.test.ts (9 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-07 | Interpola los percentiles 10 y 90; la línea sigue en construcción hasta siete días útiles; marca el rango personal; señ… | Línea de base con las reglas del dominio | movil/src/modules/health-sync/domain/baseline.test.ts (6 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-08 | Mapea frecuencia cardíaca, oxígeno, pasos y sueño; devuelve vacío si Health Connect no tiene registros; conserva la tem… | Lecturas del dispositivo traducidas sin inventar temperatura | movil/src/modules/health-sync/domain/mapHealthRecords.test.ts (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-09 | Hoy está vacío sin lecturas; rechaza un pulso manual fuera de rango; muestra la toma manual mientras la línea se constr… | Sin constantes de muestra | movil/src/modules/today/domain/today.test.ts (4 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-10 | Muestra el estado vacío en lugar de constantes de ejemplo y un aviso de sin conexión sin ocultar la lectura local | La interfaz no rellena datos | movil/src/modules/today/ui/TodayBody.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-11 | Avisa de forma visible si se niega el permiso de Health Connect | Permiso denegado explicado | movil/src/modules/health-sync/ui/DevicesBody.test.tsx (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-12 | Activa el plan desde un QR autónomo; rechaza un código opaco sin plan en el servidor; usa el cuerpo del servidor cuando… | El plan sigue el cuerpo recibido | movil/src/modules/plan/domain/plan.test.ts (12 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-13 | Sugiere hidratación con el rango estable; eleva un aviso preventivo ante desviación sostenida de la frecuencia; sugiere… | Avisos preventivos, no un diagnóstico | movil/src/modules/notices/domain/nudges.test.ts (5 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-14 | Un snapshot cifrado con AES-256-GCM se recupera | Ida y vuelta del cifrado | movil/src/shared/crypto/seal.test.ts (1 prueba en verde) | Pruebas del script en verde | Aprobado |
| CP-LIF-15 | fetchDischargeBody devuelve el cuerpo solo si la respuesta es correcta y nulo en caso contrario; postLifeBatch no trata… | El cliente distingue respuesta correcta y fallo. No prueba el controlador de Laravel | movil/src/shared/api/lifeClient.test.ts (13 pruebas en verde) | Pruebas del script en verde | Aprobado |

**Pizarra clínica (RNF-16) — 7 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-PIZ-01 | Regresión de los módulos cuya interfaz se alineó | Los oráculos de esos casos siguen cumpliéndos e | Suites de atención, alertas, egreso, camas y personal en verde (ver tablas anteriores) | Los oráculos de esos casos siguen cumpliéndose | Aprobado |
| CP-PIZ-02 | El stepper de admisión no cambia de regla | Un paso sigue siendo accionable solo cuando el rol ya lo alcanzó | frontend/web/src/modules/admission-census/ui/AdmissionStepper.test.tsx (2 pruebas en verde); frontend/web/src/modules/admission-census/doma… | Pruebas del script en verde | Aprobado |
| CP-PIZ-03 | La pieza visual muestra métrica, fila de cola, pastilla de estado, cama con habitación y aislamiento, y panel clínico, … | La información clínica sigue expresada con texto | frontend/web/src/shared/ui/clinical-layout.test.tsx (8 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-PIZ-04 | El botón respeta deshabilitado y pendiente, el enlace usa estilo de botón y | La acción no se dispara si está deshabilitada | frontend/web/src/shared/ui/Button.test.tsx (3 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-PIZ-05 | El estado vacío conserva la ruta pedida en next | El destino de retorno se mantiene | frontend/web/src/shared/ui/EmptyEncounter.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-PIZ-06 | Las acciones del formulario se agrupan y el llamado principal puede centrarse | La acción principal permanece disponible | frontend/web/src/shared/ui/FormActions.test.tsx (2 pruebas en verde) | Pruebas del script en verde | Aprobado |
| CP-PIZ-07 | El rango de fechas agrupa por día local y filtra por el intervalo resuelto | El filtro no desplaza el día | frontend/web/src/shared/datetime/range.test.ts (2 pruebas en verde) | Pruebas del script en verde | Aprobado |

**Operations (Todas las unidades) — 12 casos**

| ID | Caso | Resultado esperado (plan) | Script / evidencia | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-OPS-01 | Regresión de la web | Vitest termina sin fallos | Vitest local: 75 archivos, 356/356 en verde; job validate de GitHub Actions, ejecución 38960476872 sobre a7aac4d: success | Vitest terminó sin fallos en local y en el job | Aprobado |
| CP-OPS-02 | La web compila | El build termina sin error | npm run build local (tsc -b y vite build, 47,9 s); job validate de GitHub Actions, ejecución 38960476872 sobre a7aac4d: success | El build terminó sin error | Aprobado |
| CP-OPS-03 | Regresión de la API | PHPUnit termina sin fallos | php artisan test local: 356/356 en verde, 2 379 aserciones; job validate de GitHub Actions, ejecución 38960476872 sobre a7aac4d: success | PHPUnit terminó sin fallos | Aprobado |
| CP-OPS-04 | Estilo PHP | Pint está de acuerdo. Un desacuerdo no se interpreta como fallo clínico, y tampoco se integra | vendor/bin/pint --test local: passed; job validate de GitHub Actions, ejecución 38960476872 sobre a7aac4d: success | Pint de acuerdo | Aprobado |
| CP-OPS-05 | La suite del teléfono entra al mismo gatillo | Un fallo de Jest detiene el job. No se oculta el fallo con una condición que siempre tenga éxito | .github/workflows/ci.yml no contiene un paso de Jest para movil/ | No implementado en el workflow | No ejecutado |
| CP-OPS-06\* | Recorrido de | Los tres recorridos terminan sin fallos | El workflow .github/workflows/browser-matrix.yml (Playwright, Chromium/Firefox/WebKit) existe, pero sus 3 ejecuciones (14 y 15/10/2026) terminaron como skipped porque no está definida la variable E2E_BASE_URL | Sin resultado de corrida | No ejecutado |
| CP-OPS-07 | Umbral de cobertura | El umbral de cada paquete es el mínimo entre 80 y el entero ya alcanzado. Si la medición ya llega a 80, el um… | No hay umbral de cobertura en ci.yml, vitest.config.ts, jest.config.js ni phpunit.xml | Umbral no configurado | No ejecutado |
| CP-OPS-08 | Corrección de la sirena que seguía tras el acuse | La señal se detiene al confirmar la lectura y permanece si el acuse falla | Commit 2a8cec7 (bugfix/RF-94); CP-ALE-05 y CP-ALE-25 en verde en esta corrida | La señal se detiene al confirmar; regresión en verde | Aprobado |
| CP-OPS-09 | Corrección de estilo y de la versión de | Pint y la versión de Node del workflow permiten que la suite se ejecute | Fallos de Pint y build en las ejecuciones de septiembre; job validate de GitHub Actions, ejecución 38960476872 sobre a7aac4d: success | El job actual se ejecuta y termina en verde | Aprobado |
| CP-OPS-10 | Compuerta del laboratorio | El plan reconoce esos umbrales como los de la guía. No afirma que hayan corrido sobre un commit concreto de e… | Pipeline externo del laboratorio sin corrida conservada | Sin evidencia de ejecución | No ejecutado |
| CP-OPS-11 | Priorización de la regresión cuando la suite crezca | Se ejecutan primero los módulos tocados por el diff y los flujos de identidad, medicación, alerta y egreso. M… | Procedimiento condicionado al crecimiento de la suite; condición no alcanzada | Procedimiento no activado | No ejecutado |
| CP-OPS-12\* | Pruebas inestables | Se identifican los casos que fallan sin | Procedimiento no activado; en esta revisión se observó una prueba inestable (CP-LIF-02) | Procedimiento no activado | No ejecutado |

**Desviaciones respecto de lo planificado**

1. **Recorridos de navegador (CP-ACC-E01 a E03, CP-OPS-06).** El plan los asigna a Cypress. El repositorio no tiene Cypress; tiene una prueba Playwright (`frontend/web/e2e/critical-paths.spec.ts`, commit `f3ae26f`) con tres pruebas: la pantalla de inicio de sesión se renderiza, las rutas protegidas redirigen al login sin sesión y la API de salud responde. Esos recorridos no equivalen a los tres casos del plan (login rechazado, login aceptado con el rol `admision` y censo visible). Existe además el workflow `.github/workflows/browser-matrix.yml`, que ejecuta la prueba en Chromium, Firefox y WebKit en los *pull requests* que tocan `frontend/web`, pero solo si está definida la variable `E2E_BASE_URL`; sus tres ejecuciones registradas se omitieron (*skipped*) por falta de esa variable. En local no se ejecutaron porque la pila no estaba levantada. Se registran como no ejecutados.
2. **Propiedades (CP-ADM-P01 a P03).** No hay una suite de propiedades (fast-check ni un generador en PHP). Siguen siendo especificación.
3. **Suite móvil en el workflow (CP-OPS-05).** En la revisión analizada (`a7aac4d`), `.github/workflows/ci.yml` no contenía el paso de Jest; la suite se ejecutó localmente para este capítulo. **Actualización posterior (18/10/2026):** el PR #21 (commit de fusión `54dfd53`) añadió al job `validate` las pruebas del móvil con cobertura, la cobertura Clover del backend y el análisis de SonarQube Cloud. La ejecución 39099116982 sobre `dev` terminó en verde. Las tablas de este apartado conservan el estado de `a7aac4d`; desde `54dfd53`, CP-OPS-05 queda cubierto por el workflow.
4. **CP-CAM-10.** El archivo `bed-management.test.tsx` se eliminó en el commit `27f2d1d` (09/10/2026), posterior al plan. Su comportamiento parece repartido entre `bed-census.test.tsx` y `cleaning-orders.test.tsx`, ambos en verde, pero esa correspondencia no se verificó caso a caso.
5. **CP-LIF-02.** Una prueba de `AuthForm.test.tsx` superó el límite de 5 s de Jest en la corrida completa y pasó al reejecutar el archivo aislado. Por el riesgo RP-07 del plan («Pruebas inestables»), el resultado oficial de la corrida es **fallido** y no se sustituye por la reejecución.
6. **Inception (CP-INC-01 a 04).** Son revisiones humanas del criterio. No se encontró un acta o registro de esa revisión, por lo que no se reportan como satisfactorias.
7. **Pruebas fuera del inventario del plan.** El repositorio contiene pruebas posteriores al plan del 03/10/2026, que se ejecutaron y aprobaron en esta corrida, pero no figuran en la tabla de casos: por ejemplo, `LifeAuthApiTest`, `LifeSyncApiTest`, `LifeDischargePlanApiTest`, `LifeEndToEndTest`, `EncryptionAtRestTest`, `TraceabilityImmutabilityTest`, `TransportSecurityTest`, `ClinicalAlertBroadcastTest`, `FhirInteroperabilityTest`, `HealthEndpointTest`, `UserAdminApiTest` y `Nfr/Rnf02TimingTest`. `[PENDIENTE: incorporarlas al inventario del plan con identificador propio en su próxima revisión]`

### 13.2. Registro de Defectos

**Definición utilizada.** Se considera defecto un fallo observado en una ejecución automatizada (el job `validate` de GitHub Actions o una corrida local) que requirió un cambio de código, de configuración o de prueba para que la ejecución volviera a verde, más los hallazgos de análisis estático corregidos con un commit identificable. Un mismo defecto puede aparecer en varias ejecuciones fallidas; aquí se agrupan por causa.

**Fuente de los datos.** El plan (§10.2) establece que el registro vigente del defecto es la rama de corrección y la prueba que impide la regresión, y que el repositorio no tiene un tablero de defectos. Esta sección reconstruye el registro a partir de: (a) las 21 ejecuciones fallidas del job `validate` entre el 14/09/2026 y el 14/10/2026, con el paso fallido y el mensaje de error obtenidos con `gh run view --log-failed`; (b) los commits de corrección, y (c) la corrida de este capítulo.

**Severidad.** La tabla de severidades del plan (§10.3) dice que la severidad «la confirma una persona». La columna *Severidad propuesta* aplica esa tabla a la evidencia, pero queda **pendiente de confirmación** por el responsable del requisito.

| ID | Descripción del defecto | Componente afectado | Detección (evidencia) | Esperado frente a observado | Severidad propuesta (§10.3) | Acción correctiva | Estado |
|---|---|---|---|---|---|---|---|
| D-01 | La aplicación de prueba no arrancaba en CI por falta de `APP_KEY` | Configuración del job de backend | Ejecuciones 34809989861 y 34810518991 (14/09) y 35551311939 (21/09): `MissingAppKeyException` en `ExampleTest` | Esperado: PHPUnit arranca. Observado: excepción por clave ausente | Baja (infraestructura) | Paso `php artisan key:generate --force` en el job y estabilización de SQLite (commit `d823276`) | Corregido; verificado por el job en verde |
| D-02 | Pruebas del censo de admisión fallando en una rama de corrección | `AdmissionCensusApiTest` (censo, filtros, paginación, avance de paso) | Ejecución 35492892596 (20/09, `bugfix/RF-02-stepper-nav-y-validaciones`) | Esperado: casos del censo en verde. Observado: 6 o más casos en rojo | Media (filtro y paginación) a Alta (avance por rol); `[PENDIENTE: confirmar]` | Corrección en la misma rama antes de integrar | Corregido; verificado (CP-ADM-14 a CP-ADM-27, de `AdmissionCensusApiTest`, en verde en esta corrida) |
| D-03 | Errores de tipado estricto que impedían compilar la web | `KardexPage`, `FiliationPage`, `IdentityPages` (TS18047, `encounter` posiblemente nulo) | Ejecución 35492316220 (20/09) | Esperado: `tsc -b` sin errores. Observado: error de compilación | Baja | Comprobaciones de nulidad en las páginas | Corregido; verificado (build en verde) |
| D-04 | Desacuerdos de estilo PHP | Varios archivos (por ejemplo, `EnsureUserRole.php`) | 9 ejecuciones con el paso «Run backend lint or static checks» en rojo (20/09 a 01/10) | Esperado: Pint de acuerdo. Observado: problemas de estilo | Baja (no altera el comportamiento) | Aplicación de Pint (ramas `bugfix/RF-02-*` y otras) | Corregido; verificado (`pint --test` *passed* en esta corrida) |
| D-05 | Pruebas de interfaz fallando durante el desarrollo del módulo de atención | `admission.test.tsx` (cobertura y teléfono), `emar.test.tsx` (administración tras verificar códigos), `clinical-visit.test.tsx` (región «laboratorio» no encontrada) | Ejecuciones 36190417141 y 36190909097 (25/09, `feature/RF-17-…`) | Esperado: casos en verde. Observado: 2 o 3 pruebas en rojo | e-MAR: Alta; resto: Media; `[PENDIENTE: confirmar]` | Corrección en la rama antes de integrar | Corregido; verificado (CP-ADM-42, CP-ATE-42 y CP-ATE-46 en verde en esta corrida) |
| D-06 | Errores de compilación TypeScript en varias ramas | `ImagingReportsPage`, `LabResultsPage` (TS2322), variables sin uso (TS6133) en `alert-notifications.test.tsx` y `VitalSignsChart.tsx`; fallo de build en `feature/RF-16-…` | Ejecuciones 36191840154, 36653080942, 36821095508 y 37055501440 | Esperado: build correcto. Observado: error de compilación | Baja | Ajuste de tipos y eliminación de variables | Corregido; verificado (build en verde) |
| D-07 | La sirena de alerta seguía sonando después de confirmar la lectura | Módulo de alertas, campana y sirena (RF-94) | Rama `bugfix/RF-94-sirena-sigue-tras-confirmar`; ejecuciones 36653080942 y 36654302447 (30/09) durante la corrección | Esperado: la señal se detiene al confirmar. Observado: seguía sonando | **Crítica** (el plan cita como ejemplo un «acuse que no detiene una señal que sigue tratándose como no leída») | `fix(alerts): RF-94 detiene la sirena al confirmar la lectura` (`2a8cec7`) y prueba `75cad16` | Corregido; verificado con prueba de regresión (CP-ALE-05, CP-ALE-25 y CP-OPS-08 en verde) |
| D-08 | Prueba de dominios *stateful* dependiente del entorno | `TransportSecurityTest::test_sanctum_stateful_domains_come_from_environment` | Ejecución 38656829809 (14/10, `feature/RF-89-integracion-vitalsy-life`) | Esperado: arreglos idénticos. Observado: «Failed asserting that two arrays are identical» | Baja (defecto de la prueba, no del producto) | `fix(seguridad): RNF-05 prueba de dominios stateful independiente de putenv` (`db01d47`) | Corregido; verificado (prueba en verde en esta corrida) |
| D-09 | Hallazgos de fiabilidad y seguridad del análisis estático | Web y móvil: comparadores implícitos en ordenaciones, base de URL `returnTo`, visor del escáner sin `<dialog>` nativo, generación aleatoria en el móvil | Análisis SonarQube local registrado en `AGENTS.md` (10/10/2026): «2 bugs y 4 vulnerabilidades» | Esperado: 0 bugs y 0 vulnerabilidades | Sin severidad del plan (análisis estático) | Commits `7efa5e9`, `dbd2ac9`, `f9b31d1`, `4e7f216` y `81cb052`, entre otros | Corregido según el registro; verificado solo por las suites en verde. `[PENDIENTE: captura de SonarQube que confirme 0 bugs y 0 vulnerabilidades]` |
| D-10 | Prueba inestable por tiempo de espera | `movil/src/modules/auth/ui/AuthForm.test.tsx` («shows field alerts before trying to sign in») | Corrida de este capítulo (17/10/2026): «Exceeded timeout of 5000 ms»; pasa en la reejecución aislada (8/8) | Esperado: estable. Observado: falla bajo carga | Baja (estabilidad de la suite; la validación del formulario no se ve alterada) | Ninguna aplicada | **Detectado, no corregido** |

**Lectura del registro.** De los diez defectos, nueve tienen una corrección identificable, y su verificación se apoya en la ejecución en verde de las pruebas asociadas en esta corrida. Solo D-07 cuenta con una prueba de regresión escrita expresamente para el defecto, como exige el plan para los defectos críticos (§8.2). D-10 queda abierto. El registro se limita a los fallos que dejaron rastro en el CI, en commits o en esta corrida. Los fallos corregidos localmente antes de un *push*, y la mayor parte de los defectos de SonarQube resueltos en la rama RNF-90 sin un fallo de CI asociado, no se cuentan. Por tanto, el registro **no** permite afirmar que el sistema esté libre de defectos.

### 13.3. Métricas de Calidad del Software

Las fórmulas proceden de la tabla de indicadores del plan (§12.1), salvo que se indique otra fuente. Los porcentajes se redondean a dos decimales.

**a. Tasa de defectos y densidad de defectos**

| Métrica | Fórmula | Datos | Resultado | Fuente | Interpretación y limitaciones |
|---|---|---|---|---|---|
| Cantidad de defectos registrados | Conteo de defectos distintos (13.2) | D-01 a D-10 | 10 | 13.2 | Conteo agrupado por causa; depende del criterio de agrupación |
| Tasa de fallo del job de integración | Ejecuciones con *failure* / ejecuciones concluidas (*success* + *failure*) × 100 | 21 / 64 (14/09 al 16/10/2026) | 32,81 % | `gh run list` | Mide fallos detectados por el CI (muchos en ramas de PR, antes de integrar), no defectos en producción. Un fallo en una PR es la red de seguridad funcionando |
| Densidad de defectos (plan §12.1) | Defectos confirmados / número de requisitos del alcance | 10 / 100 (RF-01 a RF-100; RF-101 a RF-104 fuera de alcance según §12.1) | 0,10 defectos por requisito | 13.2 y plan | Indicador global, no por Bolt como pide el plan, porque los defectos no están etiquetados por Bolt de forma sistemática. Según el plan, una densidad baja no autoriza un cierre si hay un crítico abierto: D-07 está cerrado |
| Defectos por severidad (propuesta) | Conteo por severidad | Crítica 1; Alta 0–2; Media 0–2; Baja 6 | — | 13.2 | Rango porque D-02 y D-05 están pendientes de confirmación. Críticos abiertos: **0** |
| Tasa de resolución (plan §12.1) | Defectos cerrados con prueba en verde / defectos registrados × 100 | 9 / 10 | 90,00 % | 13.2 | Cierre «con prueba en verde» en sentido amplio: la suite asociada está en verde. Con prueba de regresión específica del defecto: 1 / 10 (10,00 %) |

**b. Cobertura de pruebas (tres medidas distintas que no deben combinarse)**

*b.1. Cobertura de casos de prueba ejecutados (respecto al plan)*

| Métrica | Fórmula (plan §12.1) | Datos | Resultado |
|---|---|---|---|
| Casos ejecutados | Casos ejecutados / casos previstos × 100 | 204 / 221 | 92,31 % |
| Casos aprobados | Casos en verde / casos ejecutados × 100 | 203 / 204 | 99,51 % |
| Casos fallidos | Casos en rojo / casos ejecutados × 100 | 1 / 204 | 0,49 % |
| Porcentaje de automatización | Casos con script automático / casos del inventario × 100 (sin los 4 casos de Inception, que el plan excluye de este indicador) | 204 / 217 | 94,01 % |

*Interpretación.* El plan exige, para integrar, el 100 % de los casos del criterio ejecutados y aprobados. A nivel de inventario global no se cumple: faltan los recorridos de navegador, las propiedades, el paso de Jest en el workflow, el umbral de cobertura y la compuerta del laboratorio, y hay un caso inestable. Un caso no ejecutado no cuenta como aprobado.

*b.2. Cobertura de requisitos*

| Métrica | Método | Datos | Resultado | Limitación |
|---|---|---|---|---|
| Unidades funcionales con al menos un caso aprobado | Matriz de trazabilidad del plan (§9), por rangos de RF | 9 rangos de RF (RF-01 a RF-100 y RNF-16) | 9 / 9 rangos | La matriz del plan traza **rangos** de requisitos hacia grupos de casos, no cada RF por separado. No permite calcular el porcentaje de RF individuales cubiertos |
| RF citados explícitamente en los archivos de prueba | Búsqueda de identificadores `RF-NN`, con expansión de rangos, en los 154 archivos de prueba versionados | 44 RF distintos dentro de RF-01 a RF-100 | 44 / 100 = 44,00 % | Indicador aproximado: una prueba puede cubrir un RF sin nombrarlo. Es un límite inferior de la trazabilidad explícita, no la cobertura real |

*b.3. Cobertura de código (instrumentación)*

| Paquete | Herramienta e informe | Fecha y procedencia | Líneas | Ramas | Funciones o métodos |
|---|---|---|---|---|---|
| Web (`frontend/web/src`) | Vitest + V8, `coverage/coverage-summary.json` | Generado en esta corrida (17/10/2026, `a7aac4d`) | 92,37 % (12 786 / 13 841) | 78,46 % (2 966 / 3 780) | 83,58 % (779 / 932) |
| Móvil (`movil/`) | Jest, resumen de cobertura | Generado en esta corrida (17/10/2026); la corrida tuvo 1 prueba fallida | 65,71 % (1 307 / 1 989) | 69,28 % (1 006 / 1 452) | 54,97 % (315 / 573) |
| Backend (`backend/api/app`) | PHPUnit + PCOV, `backend/api/coverage.xml` (Clover) | Generado el 14/10/2026 en la imagen Docker del backend con `scripts/sonar.sh`; no hay commits posteriores en `backend/api/app` | 94,28 % de sentencias (5 207 / 5 523) | No informado por el Clover (`conditionals=0`) | 78,69 % de métodos (517 / 657) |

*Interpretación.* La meta del laboratorio citada por el plan es del 80 %. La web y el backend la superan en líneas o sentencias y el móvil no la alcanza. El plan establece que el umbral de GitHub sea el mínimo entre 80 y el entero medido; ese umbral **no está configurado** en ningún archivo (CP-OPS-07). La cobertura del backend no se regeneró en esta corrida, porque el PHP local no tiene PCOV y Docker no estaba disponible, y procede de un informe anterior: `[PENDIENTE: regenerar backend/api/coverage.xml sobre a7aac4d con scripts/sonar.sh --skip-frontend --skip-movil]`. La cobertura de código no mide la calidad de los oráculos y no debe confundirse con la cobertura de requisitos ni con la de casos.

**c. Estabilidad del sistema y de la suite**

| Métrica | Fórmula | Datos | Resultado | Interpretación |
|---|---|---|---|---|
| Éxito de la automatización (plan §12.1) | Pruebas automáticas en verde / pruebas automáticas ejecutadas × 100 | (356 + 356 + 255) / (356 + 356 + 256) = 967 / 968 | 99,90 % | El plan exige el 100 % para integrar. La única falla es por tiempo de espera (D-10) |
| Estabilidad del job en `dev` (pushes) | Ejecuciones *success* / ejecuciones concluidas × 100 | 19 / 23 | 82,61 % | Las 4 fallas son anteriores al 22/09/2026 |
| Estabilidad del job en `dev` desde el 22/09/2026 | Ídem | 17 / 17 | 100,00 % | Desde esa fecha, ningún *push* a `dev` rompió la integración |
| Estabilidad del job desde la aprobación del plan (03/10/2026) | Ídem, todas las ramas | 28 / 29 | 96,55 % | La única falla es D-08 |
| Duración de la regresión | Suma de las duraciones de los ejecutores locales | 85,27 s + 137,62 s + 116,24 s | ≈ 339 s | Según el plan, mientras la duración lo permita se ejecuta la suite completa, sin priorización por diff |

*Limitación.* Estos indicadores miden la estabilidad de la **suite y de la integración**, no la del sistema en operación. No se dispone de registros de ejecución del sistema desplegado (disponibilidad, errores en tiempo de ejecución, reinicios). Para medir RNF-11 (disponibilidad ≥ 99,9 %) haría falta un registro del endpoint `/up` o `/api/v1/health` en el entorno desplegado durante un periodo definido: `[PENDIENTE: registro de monitoreo del entorno desplegado]`.

**d. Métricas complementarias**

| Métrica | Fórmula o método | Datos | Resultado | Fuente | Limitación |
|---|---|---|---|---|---|
| Tiempo de procesamiento NEWS2 + filtro (RNF-02) | Media y percentil 95 del tiempo por registro en `Nfr/Rnf02TimingTest` | 20 registros de telemetría; ventana de 300 muestras para el filtro | Media 0,022 s; p95 0,028 s; filtro + NEWS2 en 0,35 ms | Salida de PHPUnit (esta corrida) | Medido en SQLite y en un puesto local, no en PostgreSQL ni bajo concurrencia. Cumple el umbral de 1 s de RNF-02 en ese entorno |
| Aserciones por prueba (backend) | Aserciones / pruebas | 2 379 / 356 | 6,68 | JUnit | Indicador de densidad de verificación, no de calidad del oráculo |

**e. Evidencias de SonarQube**

*Disponibilidad de la evidencia.* El repositorio contiene la configuración del análisis (`sonar-project.properties`: fuentes `frontend/web/src`, `backend/api/app` y `movil`; informes de cobertura LCOV y Clover) y el script `scripts/sonar.sh`, que ejecuta el análisis contra una instancia **SonarQube Community local** (Docker, puerto 9000). En esta revisión la instancia no estaba en ejecución y no se dispuso de un token, por lo que **no se consultaron valores en vivo**. Los únicos registros textuales son las notas de `AGENTS.md` del 10/10/2026: cobertura global del 83,1 %, 0 bugs, 0 vulnerabilidades, Quality Gate OK y fiabilidad (modo MQR) llevada a A. Después de esa fecha se integró la rama `bugfix/RF-90-sonarqube-cero-issues` (PR #19), con decenas de commits `refactor(calidad): RNF-90 … (Sxxxx)`. Esos registros son anotaciones del equipo y no capturas de la herramienta; no se usan como valores de la tabla. Las capturas las aportará el equipo en los lugares indicados.

*Actualización (18/10/2026).* Desde el PR #21 el análisis también se ejecuta en **SonarQube Cloud** (organización `raivel16`, proyecto `Raivel16_Vitalsy`) dentro del job `validate`, con la acción `SonarSource/sonarqube-scan-action` fijada al commit de la versión v8.3.0 y con los informes de cobertura de los tres paquetes. En el análisis del PR #21 el Quality Gate quedó en OK: fiabilidad, seguridad y mantenibilidad del código nuevo en A, Security Hotspots revisados al 100 % y 0 incidencias nuevas. Ese resultado se refiere solo al código modificado por el PR (configuración del CI). La rama `dev` se analizó en la ejecución 39099116982, pero SonarCloud la clasificó como rama de corta duración, por lo que no muestra la vista de todo el código. `[PENDIENTE: configurar dev como rama de larga duración en SonarCloud, repetir el análisis y tomar de la pestaña Overall Code las capturas indicadas abajo]`. La rama `main` que muestra SonarCloud corresponde a un análisis automático del código del 04/10/2026 y no debe usarse para el informe.

*Datos del análisis que deben registrarse con las capturas:*

- Fecha del análisis: `[PENDIENTE]`
- Versión de SonarQube y edición: `[PENDIENTE: visible en el pie de página del panel]`
- Rama o commit analizado: `[PENDIENTE: idealmente a7aac4d de dev]`
- Modo de la instancia (*Standard Experience* o *Multi-Quality Rule Mode*): `[PENDIENTE]`
- Quality Gate aplicado (nombre y condiciones): `[PENDIENTE]`

`[CAPTURA: Panel general del proyecto «vitalsy» (Overview), con el estado del Quality Gate, la fecha del último análisis y los indicadores principales — insertar aquí]`

| Indicador | Valor observado | Interpretación | Evidencia |
|---|---|---|---|
| Estado del Quality Gate | `[PENDIENTE: valor visible en la captura]` | Según SonarSource ([s. f.]), el estado de la compuerta (`alert_status`) toma los valores OK o ERROR según las condiciones configuradas | Captura del panel |
| Bugs / incidencias de fiabilidad | `[PENDIENTE]` | En el modo MQR, el equivalente de *bugs* son las incidencias de fiabilidad (SonarSource, [s. f.]) | Captura de *Issues* filtrada por fiabilidad |
| Vulnerabilidades / incidencias de seguridad | `[PENDIENTE]` | Defectos de seguridad detectados por reglas estáticas | Captura de *Issues* filtrada por seguridad |
| Security Hotspots y estado de revisión | `[PENDIENTE: número y % revisado]` | Un *hotspot* cuenta como revisado cuando se marca como *Acknowledged*, *Fixed* o *Safe*; SonarSource ([s. f.]) indica que la métrica está en desuso en las versiones recientes | Captura de *Security Hotspots* |
| Code Smells / incidencias de mantenibilidad | `[PENDIENTE]` | Su esfuerzo de corrección constituye la deuda técnica | Captura de *Issues* filtrada por mantenibilidad |
| Deuda técnica | `[PENDIENTE]` | Suma del coste de remediación de las incidencias de mantenibilidad, expresada en minutos o días de 8 h (SonarSource, [s. f.]) | Captura de *Measures › Maintainability* |
| Calificaciones (Reliability, Security, Maintainability) | `[PENDIENTE: A–E]` | Escala de A (mejor) a E | Captura del panel |
| Cobertura | `[PENDIENTE]` | Combinación de líneas y condiciones cubiertas, calculada a partir de los informes LCOV y Clover importados; **no** es una medición propia de SonarQube | Captura de *Measures › Coverage* |
| Densidad de líneas duplicadas | `[PENDIENTE]` | Líneas duplicadas / líneas × 100 (SonarSource, [s. f.]) | Captura de *Measures › Duplications* |

`[CAPTURA: Vista Issues filtrada por Software Quality (Reliability, Security, Maintainability) y estado abierto — insertar aquí]`

`[CAPTURA: Vista Security Hotspots con el porcentaje revisado — insertar aquí]`

`[CAPTURA: Vista Measures › Coverage y Measures › Duplications — insertar aquí]`

`[CAPTURA: Condiciones del Quality Gate aplicado al proyecto — insertar aquí]`

*Advertencias de interpretación.*

1. La cobertura que muestre SonarQube es la de los informes importados. Si se ejecuta `scripts/sonar.sh` con los tres informes, el valor combinado no coincidirá con los porcentajes por paquete del apartado b.3, porque SonarSource ([s. f.]) define la cobertura como una mezcla de líneas y condiciones.
2. El análisis estático no sustituye las pruebas funcionales, de integración, de seguridad dinámica ni de rendimiento: detecta patrones de código, no comprueba que el sistema haga lo que pide el requisito. Un Quality Gate en OK no demuestra la adecuación funcional ni la ausencia de vulnerabilidades explotables.
3. El plan (§12.3) establece que el reporte final no incluye un resultado de SonarQube salvo que la corrida haya ocurrido y su evidencia esté conservada. Por eso los valores quedan pendientes hasta que se incorporen las capturas.

### 13.4. Evaluación de Calidad basada en Estándares

**Versión del modelo.** El informe menciona ISO/IEC 25010 sin indicar la edición. Esta evaluación usa la edición vigente, **ISO/IEC 25010:2023** (ISO/IEC, 2023), cuyo modelo de calidad de producto tiene nueve características: adecuación funcional, eficiencia de desempeño, compatibilidad, capacidad de interacción, fiabilidad, seguridad, mantenibilidad, flexibilidad y protección (*safety*). La edición de 2011, cuyos términos usa el apartado 5.3.1, llamaba «usabilidad» a la actual capacidad de interacción y «portabilidad» a lo que en 2023 se agrupa bajo flexibilidad, y no incluía la protección. Las subcaracterísticas que se nombran abajo corresponden a la edición de 2023.

**Alcance de la evaluación.** El modelo se usa como **marco de evaluación**: para cada característica se relacionan evidencias del proyecto y se señala lo que no puede evaluarse. No se aplicó un procedimiento formal de evaluación, como los de la serie ISO/IEC 25040, ni existe una auditoría externa. Por tanto, **Vitalsy no está certificado ni se declara conforme con ISO/IEC 25010**.

| Característica (ISO/IEC 25010:2023) | Criterio evaluado | Evidencia disponible | Métrica o resultado | Interpretación | Limitación o pendiente |
|---|---|---|---|---|---|
| Adecuación funcional (completitud y corrección funcional) | El comportamiento del requisito se cumple con el rol previsto | 203 casos del plan aprobados; 356 + 356 + 255 pruebas en verde; 9 de 9 rangos de RF con casos aprobados | 99,51 % de casos aprobados entre los ejecutados; 92,31 % de casos ejecutados | Evidencia sólida a nivel de API y de componente para RF-01 a RF-100 | Sin recorridos de navegador ni aceptación del usuario; trazabilidad por rangos y no por RF individual (44 RF citados explícitamente) |
| Eficiencia de desempeño (comportamiento temporal y capacidad) | RNF-01 a RNF-04 | `Nfr/Rnf02TimingTest`; despacho de alertas por WebSocket con Laravel Reverb (`ClinicalAlertBroadcastTest`); escenarios k6 `scripts/load/k6-alertas.js` y `k6-census.js` | RNF-02: media de 0,022 s por registro (umbral ≤ 1 s) | RNF-02 cumple en el entorno de pruebas; el canal WebSocket está probado funcionalmente | **No evaluados**: RNF-01 (tiempo de despacho ≤ 2 s, sin medición), RNF-03 y RNF-04. Los escenarios k6 están escritos, pero `docs/operacion/pruebas-de-carga.md` indica que no se han ejecutado |
| Compatibilidad (interoperabilidad) | RNF-17 (HL7/FHIR) y RNF-18 (navegadores) | `FhirInteroperabilityTest` (clientes LIS/PACS, paginación, fallos remotos), `playwright.config.ts` y `.github/workflows/browser-matrix.yml` con Chromium, Firefox y WebKit | Pruebas FHIR en verde; matriz de navegadores omitida (*skipped*) por falta de `E2E_BASE_URL` | Interoperabilidad comprobada contra respuestas simuladas | Sin integración con un HIS/LIS/PACS real; RNF-18 sin ejecución; la tasa del 99 % de RNF-17 no se ha medido en un entorno real |
| Capacidad de interacción (protección frente a errores del usuario, operabilidad, inclusividad) | Validación previa al envío, mensajes en español, estados vacíos, roles ARIA | Casos CP-ACC-11 a 13, CP-ADM-42 a 51, CP-ALE-24 a 27 y CP-PIZ-03 a 06, en verde; RNF-09 (`idleTimer.test.ts`) | Casos aprobados | La interfaz valida antes de enviar y comunica el estado con texto, no solo con color | **No evaluadas** la eficiencia en clics (RNF-15), la adaptación responsiva (RNF-14) ni la carga cognitiva, que requieren pruebas con usuarios |
| Fiabilidad (ausencia de fallos, disponibilidad, tolerancia a fallos, recuperabilidad) | Ausencia de fallos en la suite; comportamiento ante caída de dependencias | Estabilidad del job: 100 % en `dev` desde el 22/09; `HealthEndpointTest` (503 si la base cae); respuesta 503 controlada si el LIS cae; cola local sin red en el móvil (CP-LIF-06) | 99,90 % de éxito de la automatización; 1 prueba inestable | La tolerancia a fallos de dependencias está probada a nivel de código | **No evaluadas** la disponibilidad (RNF-11), la reconexión (RNF-12) ni RTO/RPO (RNF-13): no hay registros de operación |
| Seguridad (confidencialidad, integridad, no repudio, responsabilidad, autenticidad, resistencia) | Control de acceso por rol, sesión, cifrado e inmutabilidad | Rechazos de rol (CP-ACC-04 y 05, CP-ATE-05, 10 y 13, CP-ALE-22 y 23, CP-EGR-06 y 07); `EncryptionAtRestTest` (AES-256); `TransportSecurityTest`; `TraceabilityImmutabilityTest`; límite de intentos de login | Pruebas en verde | Hay evidencia a nivel de pruebas para RNF-05 a RNF-08 | Sin pruebas de penetración (fuera de alcance según el plan, §3.2); resultados de SonarQube pendientes de captura; Trivy y Gitleaks sin corrida conservada |
| Mantenibilidad (modularidad, analizabilidad, modificabilidad, capacidad de prueba) | Estructura modular, cobertura y deuda técnica | Arquitectura por módulos (Cap. 7); cobertura del 92,37 % (web), 94,28 % (backend) y 65,71 % (móvil); Pint en verde; trabajo de reducción de complejidad cognitiva (S3776) en la rama RNF-90 | Ver 13.3 | Capacidad de prueba alta en la web y el backend; la del móvil es menor | Deuda técnica, duplicación y calificaciones pendientes de la captura de SonarQube |
| Flexibilidad (adaptabilidad, escalabilidad, facilidad de instalación, reemplazabilidad) | Despliegue reproducible | `docker-compose.yml` y `docker-compose.prod.yml`; build correcto | Build en verde; stack no levantado en esta revisión | La instalación está definida en contenedores | **No evaluadas** la escalabilidad ni la instalación en el entorno del laboratorio en esta revisión |
| Protección (*safety*) (restricción operativa, identificación de riesgos, aviso de peligro, fallo seguro) | Reglas clínicas que previenen daño | Cinco correctos del e-MAR (CP-ATE-29), bloqueo de constantes imposibles (CP-ADM-07), alertas NEWS2 (CP-ADM-08, CP-ALE-01 a 27), sirena que solo para al confirmar (D-07 corregido) | Casos aprobados | Las salvaguardas clínicas codificadas están verificadas por pruebas | El plan (§3.2) excluye la certificación normativa de las escalas; no hay análisis formal de riesgos clínicos (por ejemplo, de gestión de riesgos de dispositivos médicos) |

**Síntesis.** Las evidencias permiten valorar razonablemente la adecuación funcional, la seguridad a nivel de pruebas, la mantenibilidad y la protección de las reglas clínicas codificadas. La eficiencia de desempeño, la compatibilidad, la capacidad de interacción, la fiabilidad y la flexibilidad tienen una evaluación parcial, con requisitos no funcionales sin medir. Ninguna característica puede declararse «cumplida» frente a la norma, porque no hubo un procedimiento formal de evaluación.

---

## Parte 3. CONCLUSIONES

1. **Cumplimiento funcional demostrado a nivel de API y de componente, pendiente a nivel de usuario.** El objetivo de construir los seis procesos hospitalarios y la aplicación ciudadana tiene respaldo verificable: 203 de los 204 casos del plan que se ejecutaron terminaron en verde y cada rango de requisitos funcionales (RF-01 a RF-100) tiene casos aprobados. El cumplimiento es **parcial** respecto del plan, porque los recorridos de navegador, las propiedades y la aceptación por el responsable del requisito no se ejecutaron. El sistema hace lo que piden sus requisitos cuando se lo prueba desde la API y desde el componente, pero no hay evidencia de su uso de extremo a extremo por un actor real.

2. **La disciplina TDD y la integración continua funcionaron como red de seguridad.** Las 21 ejecuciones fallidas del job se concentraron en ramas de PR y en el primer mes, y desde el 22/09/2026 ningún *push* a `dev` rompió la integración (17 de 17). El defecto de mayor severidad registrado, la sirena que no se detenía al confirmar (D-07), se corrigió con una prueba de regresión que hoy está en verde. Esto respalda el enfoque del Capítulo 11: detectar el fallo antes de integrar y fijar la corrección con una prueba.

3. **La calidad interna es alta en la web y el backend y menor en el móvil.** La cobertura de código del 92,37 % (web) y del 94,28 % (backend, informe del 14/10) supera la meta del 80 % del laboratorio; el móvil, con un 65,71 %, no la alcanza, y en la revisión analizada su suite no formaba parte del workflow (se incorporó el 18/10/2026 con el PR #21). La calidad interna es, por tanto, desigual entre productos, y el móvil es el punto más débil del aseguramiento.

4. **La estabilidad de la suite es casi total, pero no completa.** El 99,90 % de las pruebas automáticas pasó en la primera corrida. La única falla, una prueba móvil que excede el tiempo límite bajo carga, muestra un riesgo que el plan ya había previsto (RP-07) y para el que todavía no existe un mecanismo de control. Una prueba inestable no indica un error funcional, pero sí debilita la confianza en un verde.

5. **Los requisitos no funcionales están verificados solo en parte.** RNF-02 cumple holgadamente su umbral en el entorno de pruebas (0,022 s frente a 1 s) y la seguridad (RNF-05 a RNF-08) tiene pruebas específicas. En cambio, el despacho de alertas en 2 s, la concurrencia de 200 usuarios, la disponibilidad del 99,9 % y la compatibilidad entre navegadores siguen sin medición, aunque el repositorio ya contiene los instrumentos para medirlos (Reverb, escenarios k6 y matriz Playwright). Las afirmaciones del resumen ejecutivo sobre tiempos y ahorros deben presentarse como metas mientras no se midan.

6. **La evaluación ISO/IEC 25010:2023 es un diagnóstico, no una conformidad.** El modelo permitió ordenar la evidencia: cuatro características tienen sustento razonable y cinco una evaluación parcial. El proyecto no puede declararse conforme ni certificado frente a la norma. Los resultados de SonarQube están pendientes de las capturas, y el análisis estático, cuando se incorpore, no reemplazará las pruebas dinámicas que faltan.

7. **El informe necesita alinearse con la implementación.** Las discrepancias entre los Capítulos 1 y 5 (JWT, Postman/Newman, Cypress, JMeter, Tailwind, LOINC/SNOMED, JSON Schema, 100 % de cobertura) y los Capítulos 7, 11 y 12 y el repositorio afectan la credibilidad del documento más que la del software. Corregirlas es condición para que las conclusiones de calidad sean coherentes con lo efectivamente construido.

---

## Parte 4. RECOMENDACIONES

| N.º | Recomendación | Justificación (conclusión o limitación) | Prioridad | Criterio de verificación |
|---|---|---|---|---|
| R-01 | Añadir al job `validate` las pruebas del móvil (`npm ci` y `npx jest --ci --coverage` en `movil/`) | Conclusiones 3 y 4; CP-OPS-05; riesgo RP-03 del plan | Alta — **implementada el 18/10/2026 (PR #21)** | Verificado: la ejecución 39099116982 sobre `dev` incluye el paso y terminó en verde |
| R-02 | Corregir la inestabilidad de `AuthForm.test.tsx` (D-10): diagnosticar la causa del tiempo de espera, sin limitarse a subir el límite | Conclusión 4; plan, RP-07 | Alta | Diez corridas completas consecutivas de la suite móvil sin fallos |
| R-03 | Configurar umbrales de cobertura iguales al mínimo entre 80 y el entero medido: web 80, backend 80 y móvil 65, subiendo después el del móvil | Conclusión 3; CP-OPS-07; plan, §8.2 | Alta | `vitest.config.ts`, `jest.config.js` y el job fallan si la cobertura baja del umbral |
| R-04 | Automatizar los tres recorridos del plan (login rechazado, login de `admision` y censo) con Playwright, la herramienta ya configurada, y definir la variable `E2E_BASE_URL` del workflow `browser-matrix.yml` apuntando a un entorno de pruebas sembrado | Conclusión 1; CP-ACC-E01 a E03 y CP-OPS-06; desviación Cypress → Playwright | Media | Job de navegador en verde contra una API sembrada; actualización del plan que registre el cambio de herramienta |
| R-05 | Implementar las propiedades CP-ADM-P01 a P03 (fast-check en Vitest para `inputRules` y NEWS2 web; generador con semilla fija en PHPUnit para NEWS2, Morse y Braden) | Conclusión 1; Quintero Meza y Gil García (2025) | Media | Pruebas con semilla fija y aserción del invariante en la suite |
| R-06 | Ejecutar los escenarios k6 ya escritos (`scripts/load/k6-alertas.js` y `k6-census.js`) contra el stack de laboratorio (PostgreSQL) y medir el tiempo de despacho por WebSocket (RNF-01), siguiendo `docs/operacion/pruebas-de-carga.md` | Conclusión 5; 13.4, eficiencia de desempeño | Media | Informe de la herramienta de carga con p95 y error, conservado como anexo |
| R-07 | Configurar `dev` como rama de larga duración en SonarQube Cloud, repetir el análisis, conservar las capturas de la pestaña *Overall Code* y el JSON de `api/measures/component`, y completar la tabla de 13.3 e | Conclusión 6; 13.3 e | Alta | Tabla sin marcadores `[PENDIENTE]` y capturas en el anexo D |
| R-08 | Regenerar `backend/api/coverage.xml` en la misma corrida que SonarQube | 13.3 b.3 (informe del 14/10) | Media | Clover con fecha y commit coincidentes con el análisis |
| R-09 | Formalizar un registro de defectos (*issues* de GitHub con etiquetas de severidad, enlazados a la rama `bugfix/RF-XX-*`) y escribir una prueba de regresión específica para cada defecto de severidad crítica o alta | 13.2: solo 1 de 10 defectos tiene prueba de regresión específica; severidades sin confirmar | Media | Cada *issue* cerrado enlaza la PR y la prueba; severidad confirmada por el responsable |
| R-10 | Actualizar el plan de pruebas: incorporar las pruebas posteriores al 03/10 (Life*, Nfr, cifrado, inmutabilidad, broadcast, FHIR), sustituir `bed-management.test.tsx` por los scripts vigentes y registrar Playwright | 13.1, desviaciones 1, 4 y 7 | Media | Nueva versión del plan con matriz requisito–caso a nivel de RF individual |
| R-11 | Alinear los Capítulos 1, 5, 7, 11 y 12 del informe con la implementación, aplicando los reemplazos de la sección «Correcciones de coherencia con la implementación» (Sanctum, Vitest/Jest/Playwright, k6, Reverb, ruta `movil/`, rutas `/api/life/*`), y reformular como metas las cifras sin medición | Conclusión 7; Parte 1, tabla de afirmaciones sin respaldo | Alta | Revisión cruzada sin contradicciones entre los Capítulos 1, 5, 7, 11, 12 y 13 |
| R-12 | Registrar la aceptación de cada Bolt (acta breve o comentario en la PR) y las revisiones de Inception | CP-INC-01 a 04 sin acta; plan, §12.3 | Baja | Existencia del registro por unidad |
| R-13 | Incorporar observabilidad en el entorno desplegado: registro de `/up` o `/api/v1/health`, errores y latencia | 13.3 c (estabilidad en operación no medible); RNF-11 | Media (antes del despliegue del Cap. 14) | Serie temporal de disponibilidad del periodo de prueba |

---

## Parte 5. REFERENCIAS

Lista ordenada alfabéticamente según ISO 690, sistema autor-fecha. Incluye solo las fuentes citadas en este complemento. Los datos no verificados se señalan como tales.

ABDALHAMID, Samia y ALMABRUK, Tahani, 2025. Transforming Software Development: A Comparative Study of Traditional and AI-Integrated SDLC Approaches. *American Journal of Engineering Research (AJER)* [en línea]. Vol. 14, n.º 9, pp. 07-13. e-ISSN 2320-0847. Disponible en: www.ajer.org. [DOI no verificado].

ALHMOUD, Baneen, BONICCI, Timothy, PATEL, Riyaz, MELLEY, Daniel, HICKS, Louise y BANERJEE, Amitava, 2023. Implementation of a digital early warning score (NEWS2) in a cardiac specialist and general hospital settings in the COVID-19 pandemic: a qualitative study. *BMJ Open Quality* [en línea]. Vol. 12, e001986. DOI 10.1136/bmjoq-2022-001986.

ALVES SILVA, Lorena Micheline, MOROÇO, Diego Marques, PINTYA, José Paulo y MIRANDA, Carlos Henrique, 2021. Clinical impact of implementing a rapid-response team based on the Modified Early Warning Score in wards that offer emergency department support. *PLoS ONE* [en línea]. Vol. 16, n.º 11, e0259577. DOI 10.1371/journal.pone.0259577.

ANITHA, Cuddapah, GUPTA, Nirmal Kumar, CHINTALA, Balaji, PILLI, Daniel, KESAVAN, Elavarasi y ALI, S. Md. Shakir, 2025. Impact of Artificial Intelligence on Software Development Processes. *Journal of Information Systems Engineering and Management* [en línea]. Vol. 10, n.º 25s. e-ISSN 2468-4376. Disponible en: https://www.jisem-journal.com/. [Páginas y DOI no verificados].

ANTONENKO, Artem, GOLUBENKO, Oleksandr, ONYSKO, Andrii, CHECHYK, Serhii y VOSTRIKOV, Sergii, 2025. Prospects of using AI for automated software testing. *Technologies and Engineering* [en línea]. Vol. 26, n.º 5. ISSN 2786-5371. DOI 10.30857/2786-5371.2025.5.1. [Páginas no verificadas].

ARÉVALO-BUITRAGO, Pedro, MORALES-CANÉ, Ignacio, OLIVARES LUQUE, Estefanía, GODINO-RUBIO, Moisés, RODRÍGUEZ-BORREGO, María Aurora y LÓPEZ-SOTO, Pablo Jesús, 2022. Validación en España de la escala National Early Warning Score 2 (NEWS-2) para la detección precoz en urgencias de pacientes en riesgo de deterioro. *Emergencias*. Vol. 34, pp. 452-457. DOI 10.55633/s3me/E09.2022.

BANDARA, Eranga, GORE, Ross, LIANG, Xueping, RAJAPAKSE, Sachini, KULARATHNA, Isurunima, KARUNARATHNA, Pramoda, FOYTIK, Peter, SHETTY, Sachin, MUKKAMALA, Ravi, RAHMAN, Abdul, HASS, Amin, KEONG, Ng Wee, DE ZOYSA, Kasun, WITHANAGE, Aruna y LOGANATHAN, Nilaan, 2025. *Agentsway — Software Development Methodology for AI Agents-based Teams* [en línea]. Preimpresión arXiv:2510.23664 [cs.SE]. Disponible en: https://arxiv.org/abs/2510.23664.

BRITTON, Meredith Campbell, PETERSEN-PICKETT, Judy, HODSHON, Beth y CHAUDHRY, Sarwat I., 2020. Mapping the Care Transition from Hospital to Skilled Nursing Facility. *Journal of Evaluation in Clinical Practice* [en línea]. Vol. 26, n.º 3, pp. 786-790. DOI 10.1111/jep.13238.

CHUA, Wei Ling, AZIMIRAD, Mina, CHIA, Mabel, JONES, Daryl y WOON, Pei Yi, 2026. Effects of Real-Time Automated Clinical Deterioration Alert and Trigger Systems on Clinical Outcomes in Adult General Ward Patients: A Systematic Review and Meta-Analysis. *Critical Care Medicine* [en línea]. Vol. 54, n.º 3, pp. 557-570. DOI 10.1097/CCM.0000000000006960.

CHUA, Wei Ling, WEE, Li-Phing Clarice, LIM, Jia Ying Germaine, YEO, Min Li Kimberly, JONES, Daryl, TAN, Chee Keat, KHAN, Faheem Ahmed y LIAW, Sok Ying, 2023. Automated rapid response system activation—Impact on nurses' attitudes and perceptions towards recognising and responding to clinical deterioration: Mixed-methods study. *Journal of Clinical Nursing* [en línea]. Vol. 32, pp. 6322-6338. DOI 10.1111/jocn.16734.

CLEMENT-SANTAMARÍA, Rosa Ana y DOMINGO-POZO, Manuela, 2022. Sistemas de alerta temprana y sistemas de respuesta rápida para la prevención del deterioro agudo del paciente adulto hospitalizado [evidencia comentada]. *ENE. Revista de Enfermería* [en línea]. Vol. 16, n.º 3. ISSN 1988-348X. Disponible en: https://scielo.isciii.es/scielo.php?script=sci_arttext&pid=S1988-348X2022000300011. [Paginación no verificada].

CUDCO POMAGUALLI, Angel Geovanny, 2024. Implementación de la metodología Test Driven Development en el desarrollo de un prototipo de sistema de control de inventario. *Ciencia Latina Revista Científica Multidisciplinar* [en línea]. Vol. 8, n.º 3, pp. 3282-3297. DOI 10.37811/cl_rcm.v8i3.11552.

DONNELLY, Nikita, FRY, Margaret, ELLIOTT, Rosalind y MERRICK, Eamon, 2024. The role of the ward nurse in recognition and response to clinical deterioration: a scoping review. *Contemporary Nurse* [en línea]. Vol. 60, n.º 6, pp. 584-613. DOI 10.1080/10376178.2024.2413125.

FARAJI, Aazaade y POMBO, Nuno, 2025. AI-Driven Software Test Automation: An AI4SE-Oriented Survey of Techniques, Tools, and Challenges. *IEEE Access* [en línea]. Vol. 13. DOI 10.1109/ACCESS.2025.3623944. [Páginas no verificadas].

GERRY, Stephen, BONNICI, Timothy, BIRKS, Jacqueline, KIRTLEY, Shona, VIRDEE, Pradeep S., WATKINSON, Peter J. y COLLINS, Gary S., 2020. Early warning scores for detecting deterioration in adult hospital patients: systematic review and critical appraisal of methodology. *BMJ* [en línea]. Vol. 369, m1501. DOI 10.1136/bmj.m1501.

HENRY, Katharine E. y GIANNINI, Heather M., 2024. Early Warning Systems for Critical Illness Outside the ICU. *Critical Care Clinics* [en línea]. Vol. 40, n.º 3, pp. 561-581. DOI 10.1016/j.ccc.2024.03.007.

HOLBROOK, Anne, BOWEN, James M., PATEL, Harsit, O'BRIEN, Chris, YOU, John J., TAHAVORI, Roshan, DOLEWEERD, Jeff, BEREZNY, Tim, PERRI, Dan, NIEUWSTRATEN, Carmine, TROYAN, Sue y PATEL, Ameen, 2016. Process mapping evaluation of medication reconciliation in academic teaching hospitals: a critical step in quality improvement. *BMJ Open* [en línea]. Vol. 6, e013663. DOI 10.1136/bmjopen-2016-013663.

HYMEL, Cory, 2024. *The AI-Native Software Development Lifecycle: A Theoretical and Practical New Methodology* [en línea]. Libro blanco, Crowdbotics. Preimpresión arXiv:2408.03416. Disponible en: https://arxiv.org/abs/2408.03416.

ISO, 2021. *ISO 690:2021. Information and documentation — Guidelines for bibliographic references and citations to information resources*. 4.ª ed. Ginebra: International Organization for Standardization.

ISO/IEC, 2023. *ISO/IEC 25010:2023. Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model*. 2.ª ed. Ginebra: International Organization for Standardization.

ISO/IEC/IEEE, 2021a. *ISO/IEC/IEEE 29119-3:2021. Software and systems engineering — Software testing — Part 3: Test documentation*. Ginebra: International Organization for Standardization.

ISO/IEC/IEEE, 2021b. *ISO/IEC/IEEE 29119-4:2021. Software and systems engineering — Software testing — Part 4: Test techniques*. Ginebra: International Organization for Standardization.

JOHNSON, Julie K., FARNAN, Jeanne M., BARACH, Paul, HESSELINK, Gijs, WOLLERSHEIM, Hub, PIJNENBORG, Loes, KALKMAN, Cor y ARORA, Vineet M., 2012. Searching for the missing pieces between the hospital and primary care: mapping the patient process during care transitions. *BMJ Quality & Safety* [en línea]. Vol. 21, pp. i97-i105. DOI 10.1136/bmjqs-2012-001215.

KAKRIA, Priyanka, TRIPATHI, N. K. y KITIPAWANG, Peerapong, 2015. A Real-Time Health Monitoring System for Remote Cardiac Patients Using Smartphone and Wearable Sensors. *International Journal of Telemedicine and Applications* [en línea]. Vol. 2015, art. 373474. DOI 10.1155/2015/373474.

KÖHLER, Charlotte, BARTSCHKE, Alexander, FÜRSTENAU, Daniel, SCHAAF, Thorsten y SALGADO-BAEZ, Eduardo, 2024. The Value of Smartwatches in the Health Care Sector for Monitoring, Nudging, and Predicting: Viewpoint on 25 Years of Research. *Journal of Medical Internet Research* [en línea]. Vol. 26, e58936. DOI 10.2196/58936.

LORENZO VALIENTE, Raivel, LAPIERRE CASTILLO, Pavel y QUINTANA TUMIALAN, Renzo, 2026. *Plan de Pruebas de Software. Diseño e implementación de una Plataforma SaaS para la Vigilancia Fisiológica Longitudinal y Gestión de Alertas Tempranas en la Continuidad Asistencial*. Documento interno del proyecto, 3 de octubre de 2026. Huancayo: Universidad Continental.

MORALES-CONTRERAS, Manuel Francisco, CHANA-VALERO, Pedro, SUÁREZ-BARRAZA, Manuel F., SALDAÑA DÍAZ, Andrés y GARCÍA GARCÍA, Elena, 2020. Applying Lean in Process Innovation in Healthcare: The Case of Hip Fracture. *International Journal of Environmental Research and Public Health* [en línea]. Vol. 17, n.º 15, 5273. DOI 10.3390/ijerph17155273.

ORTIGA, Berta, SALAZAR, Albert, JOVELL, Albert, ESCARRABILL, Joan, MARCA, Guillem y CORBELLA, Xavier, 2012. Standardizing admission and discharge processes to improve patient flow: A cross sectional study. *BMC Health Services Research* [en línea]. Vol. 12, 180. DOI 10.1186/1472-6963-12-180.

OWASP FOUNDATION, 2021. *OWASP Top 10:2021* [en línea]. [Consulta: 17 octubre 2026]. Disponible en: https://owasp.org/Top10/.

QUINTERO MEZA, Ricardo Rafael y GIL GARCÍA, Erven Germán, 2025. Automatización de pruebas de software basadas en propiedades mediante ingeniería de prompts e inteligencia artificial. *RITI Journal* [en línea]. Vol. 13, n.º 31 (Especial 2025). e-ISSN 2387-0893. DOI 10.36825/RITI.13.31.005.

RAJA SP, 2025. *AI-Driven Development Lifecycle (AI-DLC) Method Definition* [en línea]. Amazon Web Services. [Consulta: 1 marzo 2026]. Disponible en: https://prod.d13rzhkk8cj2z0.amplifyapp.com/. [El documento no muestra fecha; el año se toma de su presentación en el blog AWS DevOps del 31 de julio de 2025].

SONARSOURCE, [s. f.]. Understanding measures and metrics. En: *SonarQube Server Documentation* [en línea]. [Consulta: 17 octubre 2026]. Disponible en: https://docs.sonarsource.com/sonarqube-server/latest/user-guide/code-metrics/metrics-definition/.

WAN, Jie, AL-AWLAQI, Munassar A. A. H., LI, MingSong, O'GRADY, Michael, GU, Xiang, WANG, Jin y CAO, Ning, 2018. Wearable IoT enabled real-time health monitoring system. *EURASIP Journal on Wireless Communications and Networking* [en línea]. Vol. 2018, art. 298. DOI 10.1186/s13638-018-1308-x.

WU, Chieh-Liang, KUO, Chen-Tsung, SHIH, Sou-Jen, CHEN, Jung-Chen, LO, Ying-Chih, YU, Hsiu-Hui, HUANG, Ming-De, SHEU, Wayne Huey-Herng y LIU, Shih-An, 2021. Implementation of an Electronic National Early Warning System to Decrease Clinical Deterioration in Hospitalized Patients at a Tertiary Medical Center. *International Journal of Environmental Research and Public Health* [en línea]. Vol. 18, n.º 9, 4550. DOI 10.3390/ijerph18094550.

YADAV, Ambuj, DANDU, Himanshu, PARCHANI, Gaurav, CHOKALINGAM, Kumar, KADAMBI, Pooja, MISHRA, Rajesh, JAHAN, Ahsina, TEBOUL, Jean-Louis y LATOUR, Jos M., 2024. Early detection of deteriorating patients in general wards through continuous contactless vital signs monitoring. *Frontiers in Medical Technology* [en línea]. Vol. 6, 1436034. DOI 10.3389/fmedt.2024.1436034.

YOUSSEF ALI AMER, Ahmed, WOUTERS, Femke, VRANKEN, Julie, DE KORTE-DE BOER, Dianne, SMIT-FUN, Valérie, DUFLOT, Patrick, BEAUPAIN, Marie-Hélène, VANDERVOORT, Pieter, LUCA, Stijn, AERTS, Jean-Marie y VANRUMSTE, Bart, 2020. Vital Signs Prediction and Early Warning Score Calculation Based on Continuous Monitoring of Hospitalised Patients Using Wearable Technology. *Sensors* [en línea]. Vol. 20, n.º 22, 6593. DOI 10.3390/s20226593.

*Nota sobre las referencias del informe original.* El apartado REFERENCIAS del informe solo contiene la plantilla («Formato sugerido: APA») y no incluye fuentes. La lista anterior es la bibliografía consolidada y debe reemplazar esa plantilla. La indicación «APA» debe sustituirse por «ISO 690, sistema autor-fecha». Los artículos de `bibliography/papers` que no se citan en este complemento (por ejemplo, los n.º 6, 7, 11, 14, 15, 19, 26 y 29) deben añadirse solo si el informe los cita en otros apartados.

---

## Parte 6. PROPUESTA DE ANEXOS

| Código propuesto | Título | Contenido | Procedencia | Finalidad | Estado |
|---|---|---|---|---|---|
| Anexo A | Plan de Pruebas de Software | PDF completo del plan (03/10/2026) o su enlace | `docs/plan_de_pruebas/Plan de Pruebas de Software.pdf` | Referencia de los casos, la severidad y las fórmulas del Cap. 13 | Disponible |
| Anexo B | Resultados de la ejecución de las suites automatizadas | Resumen de consola e informes JUnit (backend y web) y JSON (móvil) de la corrida del 17/10/2026 sobre `a7aac4d`, incluida la reejecución de `AuthForm.test.tsx` | `php artisan test --log-junit`, `npx vitest run --reporter=junit`, `npx jest --json` | 13.1 y 13.3 (casos, estabilidad y duración) | Pendiente de recopilar: los archivos de esta corrida se generaron en un directorio temporal y deben regenerarse con esos comandos en `docs/evidencias/` (o en otra ruta acordada) para conservarse |
| Anexo C | Informes de cobertura de código | `coverage-summary.json` o `lcov-report/index.html` de la web; resumen de Jest del móvil; `coverage.xml` del backend regenerado | `frontend/web/coverage/`, `movil/coverage/`, `backend/api/coverage.xml` | 13.3 b.3 | Disponible para web y móvil (generados el 17/10, sin versionar); backend pendiente de regenerar (R-08) |
| Anexo D | Capturas y reporte de SonarQube | Panel general, Issues por calidad, Security Hotspots, Coverage/Duplications y condiciones del Quality Gate; JSON de `api/measures/component` y `api/qualitygates/project_status` | Instancia SonarQube local mediante `scripts/sonar.sh` | 13.3 e y 13.4 (mantenibilidad, seguridad y fiabilidad) | Pendiente de recopilar (el equipo aporta las capturas). No incluir el token |
| Anexo E | Historial de integración continua | Tabla de las 64 ejecuciones concluidas del job `validate` (fecha, rama, evento, resultado y paso fallido) y captura de la ejecución 38960476872 | `gh run list` y `gh run view`; pestaña *Actions* de GitHub | 13.2 (detección de defectos) y 13.3 c (estabilidad) | Pendiente de elaborar (datos disponibles y consultables) |
| Anexo F | Registro de defectos con evidencias | Tabla D-01 a D-10 con enlaces a las ejecuciones fallidas y a los commits de corrección (`d823276`, `2a8cec7`, `75cad16`, `db01d47`, `7efa5e9`, `dbd2ac9`, `f9b31d1`, `4e7f216`, `81cb052`) | GitHub Actions e historial de git | 13.2 | Pendiente de elaborar; severidades pendientes de confirmación |
| Anexo G | Matriz de trazabilidad requisito–caso–resultado | Matriz del §9 del plan ampliada con el resultado de 13.1 | Plan (§9) y corrida del 17/10/2026 | 13.1 y 13.3 b.2 | Pendiente de elaborar (puede derivarse de las tablas de 13.1) |
| Anexo H | Configuración del entorno de pruebas y de integración | `.github/workflows/ci.yml`, `backend/api/phpunit.xml`, `frontend/web/vitest.config.ts`, `movil/jest.config.js`, `frontend/web/playwright.config.ts`, `sonar-project.properties` | Repositorio | Caps. 12 y 13 (entorno y desviaciones) | Disponible |
| Anexo I | Configuración de contenedores | `docker-compose.yml`, `docker-compose.prod.yml`, `backend/api/Dockerfile`, `frontend/web/Dockerfile`, `docker/nginx/dev.conf` | Repositorio | Cap. 10 | Disponible. Revisar que no se reproduzcan valores de `.env`, `APP_KEY` ni `DEMO_PASSWORD` |
| Anexo J | Fragmentos de código de reglas clínicas y sus pruebas | `News2Calculator` y `News2CalculatorTest`, `RiskScaleTest`, `Nfr/Rnf02TimingTest`, `TraceabilityImmutabilityTest` (extractos) | `backend/api/app/Services/Clinical/`, `backend/api/tests/` | 13.3 d y 13.4 (desempeño, protección e integridad) | Disponible |
| Anexo K | Prueba de extremo a extremo existente | `frontend/web/e2e/critical-paths.spec.ts` y su resultado de ejecución | Playwright | 13.1 (desviación Cypress → Playwright) | Script disponible; resultado pendiente de ejecutar con la pila levantada |
| Anexo L | Capturas de las funcionalidades implementadas | Pantallas del apartado 6.3, con datos de demostración | Aplicación en `http://localhost:8080` y app Vitalsy Life | Caps. 6 y 13.4 (capacidad de interacción) | Disponible en el informe (6.3). Verificar que solo muestren datos ficticios y ninguna credencial |
| Anexo M | Registro de commits de calidad RNF-90 | Lista de commits `refactor(calidad): RNF-90 … (Sxxxx)` de la PR #19, agrupados por regla | `git log` | 13.3 e y 13.4 (mantenibilidad) | Pendiente de elaborar (datos disponibles) |

**Criterios de protección de información para todos los anexos.** No se deben incluir tokens (`SONAR_TOKEN`, tokens de GitHub), contraseñas (`DEMO_PASSWORD`, `DB_PASSWORD`), valores de `APP_KEY` ni archivos `.env`. Las capturas deben mostrar únicamente pacientes y cuentas de demostración (`{rol}@vitalsy.local`), sin datos clínicos reales identificables. Los registros de CI se citan por número de ejecución, sin copiar variables de entorno.
