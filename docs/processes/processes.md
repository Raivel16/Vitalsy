3.4.2. Análisis Detallado por Proceso Optimizado
3.4.2.1. PROCESO 1: Admisión y Recepción del Paciente Hospitalizado (Proceso Modificado)
Descripción del Proceso
Este proceso reemplaza los registros en papel, carpetas físicas e iteraciones telefónicas de la admisión tradicional por un flujo de captura digital centralizado en Vitalsy. Permite la validación electrónica de la orden, la apertura inmediata del expediente, el registro web de la valoración basal a pie de cama y la conciliación estructurada de medicamentos de ingreso (BPMH).
Actores Involucrados
Personal administrativo de admisión.
Celador / Camillero.
Enfermera de piso.
Auxiliar de enfermería.
Médico residente / de guardia.
Paciente y familiar / cuidador.


Actividades y Subprocesos
Subproceso 1.1: Verificación de Orden y Registro Administrativo Digital de Ingreso
Actores Involucrados: Personal administrativo de admisión, Paciente y familiar / cuidador.
Actividades paso a paso:
El Personal administrativo de admisión consulta en la interfaz web de admisiones de Vitalsy la orden de internamiento digital enviada por el servicio emisor.
El Personal administrativo de admisión valida los datos filiatorios del paciente y la cobertura sanitaria en la plataforma; si la cobertura sanitaria se encuentra activa y validada en el sistema, entonces el personal administrativo aprueba la ficha digital de ingreso; si la cobertura presenta inconformidades o requiere copago, entonces el personal administrativo solicita al familiar el trámite previo en la ventanilla virtual de caja o Trabajo Social.
El Personal administrativo de admisión imprime el brazalete físico de identificación con código de barras enlazado al ID del expediente en Vitalsy.
El Personal administrativo de admisión habilita el Expediente Clínico Electrónico de Ingreso en la plataforma.
El Paciente y familiar / cuidador verifican sus datos en la pantalla del terminal y firman digitalmente el formulario de consentimiento informado y administrativo.
Flujo de Información Descriptivo: Entra la Orden de Internamiento Digital. Como salidas se emiten el Brazalete de Identificación con Código de Barras, la Ficha Digital de Admisión y el Expediente Clínico Electrónico de Ingreso.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 1.1 TO-BE en Bizagi)


Subproceso 1.2: Traslado y Recepción Física Digitalizada del Paciente en Piso
Actores Involucrados: Celador / Camillero, Auxiliar de enfermería, Enfermera de piso.
Actividades paso a paso:
El Celador / Camillero consulta en la Web App Vitalsy (desde la estación o navegador móvil) la orden de traslado asignada con el número de habitación y lecho en piso.
El Celador / Camillero acude al servicio de origen, verifica el código del brazalete del paciente para confirmar identidad y efectúa el traslado físico hacia la habitación.
El Auxiliar de enfermería asiste en la acomodación del paciente en la cama hospitalaria, posicionando barandillas y cabecera.
La Enfermera de piso accede a la Web App Vitalsy desde la terminal o tablet de piso; si la cama asignada coincide con la orden digital, entonces la enfermera de piso presiona "Confirmar Recepción en Piso", cambiando automáticamente el estado del paciente a "Ingresado" en la central; si existe una discrepancia en el lecho asignado, entonces la enfermera selecciona "Reubicar Paciente" e informa a la central mediante el sistema.
Flujo de Información Descriptivo: Entra la Ficha Digital de Admisión. Se generan como salidas el Registro Digital de Recepción Física en Habitación y la Confirmación de Ingreso a Piso.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 1.2 TO-BE en Bizagi)

Subproceso 1.3: Valoración Inicial Digital de Enfermería y Conciliación de Medicamentos (BPMH)
Actores Involucrados: Enfermera de piso, Auxiliar de enfermería, Médico residente / de guardia, Paciente y familiar / cuidador.
Actividades paso a paso:
La Enfermera de piso realiza la anamnesis e inspección inicial a pie de cama, registrando alergias y antecedentes directamente en el formulario de la Web App Vitalsy.
El Auxiliar de enfermería coloca los sensores fisiológicos al paciente para la medición basal.
La Enfermera de piso ingresa en Vitalsy las constantes vitales basales y entrevista al paciente sobre sus medicamentos habituales; si el paciente trae consigo fármacos o recetas domiciliarias, entonces la enfermera de piso registra la lista en el Módulo Digital de Conciliación Farmacéutica (BPMH), donde el software contrasta alergias e interacciones; si el paciente declara no consumir medicamentos en su domicilio, entonces la enfermera marca la casilla "Sin antecedentes farmacológicos" en la pantalla.
El Paciente y familiar / cuidador muestran las recetas o envases de medicamentos traídos de casa para su verificación digital.
La Enfermera de piso completa las escalas digitales de riesgo de caídas y de úlceras por presión, generando el Kardex Electrónico de Ingreso.
El Médico residente / de guardia revisa en la plataforma la valoración de ingreso, valida la lista digital BPMH y firma electrónicamente la Hoja de Indicaciones Médicas Basales.
Flujo de Información Descriptivo: Entran los antecedentes del paciente. Como entregables para el modelado se generan la Ficha Digital de Valoración Inicial, el Registro Basal de Signos Vitales, la Conciliación Farmacéutica Digital (BPMH) y la Hoja Digital de Indicaciones Médicas de Ingreso.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 1.3 TO-BE en Bizagi)

Flujo de Información Descriptivo del Proceso 1
Entra la Orden de Internamiento Digital. La plataforma Vitalsy emite el Brazalete de Identificación con Código de Barras y abre el Expediente Clínico Electrónico. Tras la recepción en piso, la Enfermera de piso ingresa los datos mediante la Web App, generando la Ficha Digital de Valoración Inicial, el Registro Basal de Signos Vitales y la Conciliación Farmacéutica Digital (BPMH). El Médico residente / de guardia valida la información en pantalla y emite la Hoja Digital de Indicaciones Médicas de Ingreso, la cual actualiza de forma automática el Kardex Electrónico.
Modelado del Proceso Mejorado (TO-BE)
(Espacio reservado para la inserción del diagrama del Proceso 1 TO-BE en Bizagi)
3.4.2.2. PROCESO 2: Atención y Seguimiento del Paciente Hospitalizado (Proceso Modificado)
Descripción del Proceso
Este proceso transforma el seguimiento diario en piso. Reemplaza las notas clínicas manuales por registros digitales de evolución, elimina el Kardex en papel mediante la prescripción electrónica (CPOE) y la administración farmacológica verificada, integra vía APIs los datos de laboratorio e imágenes, y automatiza la ingesta de signos vitales con filtro digital de señal y cálculo determinista de NEWS2.
Actores Involucrados
Médico tratante (especialista).
Médico residente.
Enfermera de piso.
Auxiliar de enfermería.
Paciente y familiar / cuidador.
Actividades y Subprocesos
Subproceso 2.1: Pase de Visita Médica y Evolución Clínica Digital
Actores Involucrados: Médico tratante (especialista), Médico residente, Enfermera de piso, Paciente y familiar / cuidador.
Actividades paso a paso:
El Médico residente abre la Web App Vitalsy en la laptop/terminal de visita; el sistema se comunica mediante APIs de interoperabilidad (HL7/FHIR) con el LIS de laboratorio y el PACS de imagenología, desplegando automáticamente en pantalla los Resultados Consolidados de Laboratorio y los Informes de Imágenes Diagnósticas junto con las notas de enfermería del día.
El Médico tratante (especialista) examina al paciente a pie de cama durante la visita médica.
El Paciente y familiar / cuidador expresan la evolución de sus síntomas o dudas sobre el tratamiento.
La Enfermera de piso reporta a través de Vitalsy la tolerancia a la medicación y las observaciones cargadas durante el turno.
El Médico tratante (especialista) analiza el expediente integrado en Vitalsy; si los exámenes o imágenes muestran anomalías o necesidad de ajuste, entonces el médico tratante modifica la prescripción electrónica en la plataforma; si la evolución es favorable, entonces el médico aprueba la continuidad del plan terapéutico digital.
El Médico residente ingresa la Nota de Evolución Médica Digital en Vitalsy e introduce los cambios en la Hoja de Prescripción Electrónica (CPOE), actualizando automáticamente el Kardex Electrónico.
Flujo de Información Descriptivo: Se consumen vía API los datos de LIS y PACS. Se entregan como salidas la Nota de Evolución Médica Digital, los Resultados Paraclínicos Consolidados en Pantalla y la Hoja de Prescripción Electrónica (CPOE).
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 2.1 TO-BE en Bizagi)
Subproceso 2.2: Monitoreo Fisiológico Digitalizado y Cálculo Automatizado de NEWS2
Actores Involucrados: Auxiliar de enfermería, Enfermera de piso, Plataforma Web Vitalsy, Paciente.
Actividades paso a paso:
El Auxiliar de enfermería o Enfermera de piso efectúa la toma de constantes vitales a pie de cama (frecuencia respiratoria, SatO₂, presión arterial, frecuencia cardíaca, temperatura y consciencia).
El Auxiliar de enfermería o Enfermera de piso digita los valores en la Web App Vitalsy desde el terminal o tablet o el Sistema Vitalsy ingiere la telemetría automáticamente desde monitores compatibles vía API REST.
La Plataforma Web Vitalsy aplica un filtro digital Butterworth de cuarto orden y fase cero; si la señal presenta ruido por movimiento del paciente o interferencias, entonces el software atenúa las frecuencias espurias y limpia la señal; si la señal es nítida, entonces el software la procesa directamente.
La Plataforma Web Vitalsy calcula de manera matemática y determinista la puntuación agregada del score NEWS2 en el servidor.
La Plataforma Web Vitalsy evalúa la puntuación resultante; si el score NEWS2 es igual a 0 puntos, entonces la plataforma almacena el registro inmutable, fija el siguiente control en 12 horas y mantiene el monitoreo rutinario; si el score NEWS2 es igual o mayor a 1 punto o se fuerza por criterio clínico, entonces la plataforma activa de forma autónoma la transición hacia el Proceso 3 (Gestión de Alertas).
Flujo de Información Descriptivo: Entran los datos fisiológicos tomados o capturados por telemetría. Vitalsy genera la Gráfica Digital Evolutiva de Signos Vitales y el Score NEWS2 Calculado.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 2.2 TO-BE en Bizagi)
Subproceso 2.3: Administración Verificada de Medicamentos (e-MAR) y Cuidados Digitales
Actores Involucrados: Enfermera de piso, Auxiliar de enfermería, Paciente y familiar / cuidador.
Actividades paso a paso:
La Enfermera de piso consulta en la Web App Vitalsy la Hoja de Administración de Medicamentos Electrónica (e-MAR) para identificar las dosis programadas.
La Enfermera de piso retira los fármacos del botiquín digital de piso, verificando el código de barras del medicamento.
La Enfermera de piso verifica el brazalete del paciente a pie de cama; si el paciente, fármaco, dosis, vía y hora coinciden con la prescripción CPOE en Vitalsy, entonces el sistema valida la dosis y la enfermera administra el medicamento; si la plataforma detecta una inconsistencia, entonces emite un mensaje de advertencia en pantalla y bloquea el registro hasta su corrección.
El Paciente y familiar / cuidador reciben el tratamiento y confirman verbalmente su identidad.
El Auxiliar de enfermería realiza los cuidados directos (higiene, cambios postulares) y marca su finalización en Vitalsy.
La Enfermera de piso firma digitalmente la dosis aplicada en el e-MAR e ingresa la Nota de Evolución de Enfermería Electrónica.
Flujo de Información Descriptivo: Se utiliza como entrada la Prescripción CPOE. Se generan como salidas firmadas el Registro Inmutable e-MAR y la Nota Electrónica de Enfermería.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 2.3 TO-BE en Bizagi)

Flujo de Información Descriptivo del Proceso 2
El flujo diario arranca cuando Vitalsy consume e integra en pantalla los Resultados de Laboratorio (LIS) e Informes de Imágenes (PACS) vía APIs. El Médico tratante y el Médico residente emiten la Nota de Evolución Médica Digital y la Prescripción Electrónica (CPOE), actualizando el Kardex Electrónico. Al tomar constantes, el Auxiliar de enfermería o la Plataforma Vitalsy (vía API REST) capturan las señales, generando la Gráfica Digital Evolutiva de Signos Vitales y el Score NEWS2 Calculado. Al administrar fármacos, la Enfermera de piso valida la indicación, produciendo el Registro Inmutable e-MAR y la Nota Electrónica de Enfermería. Si se detecta un score de riesgo (NEWS2 ≥ 1), la información migra digitalmente como entrada al Proceso 3.
Modelado del Proceso Mejorado (TO-BE)
(Espacio reservado para la inserción del diagrama del Proceso 2 TO-BE en Bizagi)
3.4.2.3. PROCESO 3: Gestión de Alertas y Respuesta ante Alteraciones del Estado Clínico (Proceso Rediseñado)
Descripción del Proceso
Este proceso automatiza la gestión de las alteraciones fisiológicas identificadas durante el monitoreo del paciente hospitalizado, manteniendo la lógica clínica de verificación, reevaluación y respuesta establecida en el proceso actual.
La información registrada durante el monitoreo rutinario del paciente se almacena directamente en Vitalsy. Cuando se identifica una alteración fisiológica o un signo de deterioro clínico, el sistema genera una alerta dirigida inicialmente a la Enfermera de piso responsable, evitando depender de la comunicación verbal o de la presencia física del personal para iniciar la atención.
La Enfermera de piso verifica la condición y realiza una nueva toma de constantes cuando corresponda. Los nuevos valores son registrados directamente en Vitalsy, que vuelve a calcular automáticamente la escala NEWS2 y determina el nivel de riesgo.
Si la alteración persiste y requiere atención médica, Vitalsy notifica inmediatamente al Médico residente / de guardia, eliminando la necesidad de realizar llamadas telefónicas o buscarlo físicamente. El sistema controla el tiempo de respuesta y, si no existe confirmación o registro de atención dentro de los 15 minutos establecidos, ejecuta automáticamente el escalamiento hacia el siguiente nivel de respuesta.
Asimismo, cuando durante la evaluación se establece una nueva frecuencia de monitoreo o un horario específico para una nueva toma de signos vitales, dicha programación se registra en Vitalsy. El sistema realiza el seguimiento del cumplimiento, notifica a los responsables y genera un escalamiento cuando el control no se realiza o no se registra dentro del tiempo establecido.
Todos los eventos, alertas, respuestas, registros clínicos y tiempos asociados quedan almacenados digitalmente, sustituyendo los registros manuales y documentos físicos utilizados en el proceso actual.
Actores Involucrados
Plataforma Web Vitalsy.
Enfermera de piso.
Auxiliar de enfermería.
Médico residente / de guardia (primer respondedor).
Enfermera supervisora de piso.
Equipo de Respuesta Rápida (ERR / Intensivista).
Actividades y Subprocesos
Subproceso 3.1: Verificar y Clasificar Alteración Fisiológica 
Descripción: Verificación de una alteración identificada durante el monitoreo o mediante observación clínica y determinación de la necesidad de continuar la vigilancia o activar una respuesta médica.
Actores Involucrados: Enfermera de piso, Auxiliar de enfermería, Plataforma Web Vitalsy.
Actividades paso a paso:
Cuando la alteración proviene del monitoreo rutinario realizado en el Subproceso 2.2, la Enfermera de piso continúa la valoración a partir de los valores que ella misma registró previamente en Vitalsy.
Cuando el deterioro es observado de manera imprevista por el Auxiliar de enfermería durante la atención, este registra la observación o genera la alerta correspondiente en Vitalsy, quedando la situación asociada al paciente y notificándose automáticamente a la Enfermera de piso responsable.
La Enfermera de piso recibe en Vitalsy la alerta correspondiente y revisa la información registrada, incluyendo los valores obtenidos durante el monitoreo o la observación de deterioro.
La Enfermera de piso verifica la alteración identificada y realiza una nueva toma de las constantes fisiológicas cuando corresponda.
La Enfermera de piso registra en Vitalsy los nuevos valores obtenidos.
Vitalsy calcula nuevamente la escala NEWS2 con los valores actualizados y presenta automáticamente el nivel de riesgo correspondiente.
La Enfermera de piso realiza la valoración clínica del paciente considerando tanto el resultado de NEWS2 como su condición observable.
Si la alteración es aislada y de baja severidad, la Enfermera de piso registra la condición y establece en Vitalsy una nueva frecuencia de control o un próximo horario de monitoreo.
Vitalsy programa automáticamente el nuevo control, notifica a la Enfermera de piso o al responsable asignado y registra la hora límite para realizar y documentar la siguiente toma.
Si el paciente presenta alteraciones múltiples, deterioro significativo o preocupación clínica (nurse's worry), la Enfermera de piso confirma en Vitalsy que el caso requiere atención médica y continúa con el Subproceso 3.3.
Todos los registros efectuados durante la verificación quedan almacenados con fecha y hora, identificando al responsable que realizó cada acción.
Flujo de Información Descriptivo: Entran los valores fisiológicos o la observación de deterioro generados durante el Subproceso 2.2. Vitalsy genera la alerta dirigida a la Enfermera de piso cuando corresponde y permite registrar la nueva toma de constantes. Como salida se obtiene la Valoración y Clasificación Digital de la Alteración Fisiológica, el nuevo resultado NEWS2 y, cuando corresponde, la programación digital del siguiente control o la confirmación de necesidad de atención médica.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 3.1 TO-BE en Bizagi)

Subproceso 3.2: Gestionar Alerta de Enfermería 
Descripción: Gestión y seguimiento automático de la alerta generada para la Enfermera de piso, incluyendo la confirmación de recepción, el control del tiempo de respuesta y el escalamiento cuando la alerta no es atendida.
Actores Involucrados: Plataforma Web Vitalsy, Enfermera de piso, Enfermera supervisora de piso.
Actividades paso a paso:
Vitalsy genera automáticamente la alerta de la Enfermera de piso cuando se registra una alteración que requiere verificación.
La plataforma identifica a la Enfermera de piso responsable según la asignación registrada en el sistema.
Vitalsy envía la notificación de alerta al dispositivo o interfaz disponible de la Enfermera de piso.
La Enfermera de piso confirma la recepción de la alerta en Vitalsy.
El sistema registra automáticamente la fecha y hora de recepción y cambia el estado de la alerta a "En atención".
La Enfermera de piso realiza la verificación correspondiente y registra las nuevas constantes o la valoración clínica en Vitalsy.
Si la Enfermera de piso no confirma ni atiende la alerta dentro del tiempo establecido, Vitalsy genera automáticamente una alerta de escalamiento a la Enfermera supervisora de piso.
La Enfermera supervisora recibe la notificación y registra la recepción de la alerta en el sistema.
Si la Enfermera supervisora tampoco confirma o atiende el escalamiento dentro del tiempo establecido, Vitalsy genera automáticamente el siguiente nivel de escalamiento definido en la configuración institucional.
Vitalsy registra todo el historial de la alerta, incluyendo generación, entrega, confirmaciones, tiempos de respuesta y escalamiento.
Flujo de Información Descriptivo: Entra la alerta generada a partir de la alteración identificada. Vitalsy genera la Notificación Digital a la Enfermera de piso y controla el tiempo de atención. Si la enfermera responde, se registra digitalmente la atención y continúa la verificación clínica. Si no responde dentro del tiempo configurado, se genera automáticamente la Alerta de Escalamiento a la Enfermera supervisora y, de ser necesario, al siguiente nivel configurado.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 3.2 TO-BE en Bizagi)


Subproceso 3.3: Notificar al Médico de Guardia 
Descripción: Notificación automática al Médico residente / de guardia cuando, después de la verificación y nueva toma de constantes realizada por enfermería, persiste una condición que requiere atención médica.
Actores Involucrados: Plataforma Web Vitalsy, Enfermera de piso, Médico residente / de guardia.
Actividades paso a paso:
Después de la nueva toma de constantes, Vitalsy calcula nuevamente la escala NEWS2 y presenta el resultado actualizado.
La Enfermera de piso revisa el nuevo resultado y la condición clínica del paciente.
Si los valores ya no evidencian una condición de riesgo, la Enfermera de piso registra la evolución en Vitalsy y continúa el monitoreo según la frecuencia establecida.
Si el resultado de NEWS2 continúa evidenciando riesgo, existe deterioro significativo, alteraciones múltiples o se mantiene la preocupación clínica (nurse's worry), la Enfermera de piso confirma en Vitalsy la necesidad de atención médica.
Vitalsy identifica automáticamente al Médico residente / de guardia responsable del paciente.
Vitalsy envía inmediatamente una notificación digital de alta prioridad al médico, incluyendo la información relevante del paciente, ubicación, constantes registradas y resultado NEWS2.
El Médico residente / de guardia recibe la alerta y confirma digitalmente su recepción.
Vitalsy registra automáticamente la fecha y hora del envío y de la confirmación de recepción.
El Médico residente / de guardia acude a la habitación para realizar la evaluación médica correspondiente.
Flujo de Información Descriptivo: Entran los nuevos valores fisiológicos y el resultado actualizado de NEWS2. Si persiste la condición de riesgo, Vitalsy genera la Notificación Digital al Médico residente / de guardia y registra el Acuse de Recepción con fecha y hora.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 3.3 TO-BE en Bizagi)
Subproceso 3.4: Atención Médica y Escalamiento
Descripción: Atención de la alteración por el Médico residente / de guardia y escalamiento automático cuando no se registra respuesta dentro del tiempo establecido o cuando el estado del paciente requiere intervención especializada.
Actores Involucrados: Plataforma Web Vitalsy, Médico residente / de guardia, Enfermera de piso, Enfermera supervisora de piso, Equipo de Respuesta Rápida (ERR / Intensivista).
Actividades paso a paso:
Al notificarse al Médico residente / de guardia, Vitalsy inicia el control del tiempo de respuesta de 15 minutos.
El Médico residente / de guardia acude a la habitación, evalúa al paciente y registra en Vitalsy la evaluación realizada.
El Médico residente / de guardia registra digitalmente las indicaciones médicas de urgencia correspondientes.
La Enfermera de piso ejecuta las indicaciones médicas y registra las acciones realizadas directamente en Vitalsy.
El Médico residente / de guardia reevalúa al paciente y registra digitalmente su evolución.
Si el paciente se estabiliza, el médico registra la continuidad del manejo en sala general y establece, cuando corresponda, una nueva frecuencia de monitoreo.
Vitalsy registra la nueva frecuencia y programa automáticamente los controles posteriores, notificando a los responsables.
Si durante un control posterior no se registra la toma de constantes dentro del horario establecido, Vitalsy genera una alerta al responsable.
Si el control continúa sin realizarse o registrarse dentro del tiempo configurado, Vitalsy genera automáticamente el escalamiento correspondiente.
Si el paciente no se estabiliza y requiere intervención especializada, el Médico residente / de guardia registra en Vitalsy la solicitud de intervención del Equipo de Respuesta Rápida.
Si el Médico residente / de guardia no registra la confirmación de atención o atención presencial dentro de los 15 minutos, Vitalsy genera automáticamente la Alerta de Escalamiento.
La Alerta de Escalamiento es enviada a la Enfermera supervisora de piso y al Equipo de Respuesta Rápida (ERR / Intensivista), eliminando la necesidad de realizar llamadas o buscar físicamente al personal.
El Equipo de Respuesta Rápida acude a la habitación y evalúa al paciente.
Si el paciente se estabiliza y no requiere cuidados intensivos, el Equipo de Respuesta Rápida registra las indicaciones y la continuidad del manejo en sala general.
Si el paciente requiere atención en cuidados intensivos, el Equipo de Respuesta Rápida registra en Vitalsy la Orden Digital de Traslado a la Unidad de Cuidados Intensivos.
Vitalsy registra el cierre del evento y consolida digitalmente el historial de la alerta, incluyendo las horas de generación, recepción, atención, escalamiento y cierre.
Flujo de Información Descriptivo: Entra la Notificación Digital al Médico y se inicia el control del tiempo de respuesta. Como salidas se generan la Confirmación Digital de Atención, el Registro Digital de Indicaciones y Acciones Médicas, el Registro de Seguimiento, el Escalamiento Automático cuando corresponda y la Orden Digital de Traslado a UCI cuando sea necesaria.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 3.4 TO-BE en Bizagi)


Flujo de Información Descriptivo del Proceso 3
El proceso inicia a partir de la información generada durante el monitoreo del paciente en el Subproceso 2.2. Cuando se identifican valores fisiológicos alterados o signos de deterioro, Vitalsy registra digitalmente la información y genera inicialmente una alerta dirigida a la Enfermera de piso responsable.
La Enfermera de piso recibe la notificación y realiza la verificación de la condición del paciente. Cuando corresponde, realiza una nueva toma de constantes y registra los valores directamente en Vitalsy. El sistema calcula nuevamente la escala NEWS2 y presenta el resultado actualizado.
Si la alteración desaparece o es de baja severidad, la enfermera registra la condición y puede establecer una nueva frecuencia de monitoreo. Vitalsy programa los siguientes controles, notifica a los responsables y controla su cumplimiento.
Si persiste el riesgo, existe deterioro significativo, alteraciones múltiples o preocupación clínica, la Enfermera de piso confirma la necesidad de atención médica y Vitalsy notifica inmediatamente al Médico residente / de guardia, sin necesidad de llamadas telefónicas ni búsqueda física.
El médico confirma la recepción, acude a evaluar al paciente y registra digitalmente la atención e indicaciones. Si no existe respuesta o atención registrada dentro de los 15 minutos establecidos, Vitalsy ejecuta automáticamente el escalamiento hacia la Enfermera supervisora y el Equipo de Respuesta Rápida.
Cuando el paciente requiere intervención especializada, se registra la atención correspondiente y, si aplica, la Orden Digital de Traslado a UCI. Finalmente, Vitalsy consolida el historial completo del evento y mantiene la trazabilidad de los tiempos y responsables.

Modelado del Proceso Mejorado (TO-BE)
(Espacio reservado para la inserción del diagrama del Proceso 3 TO-BE en Bizagi)


3.4.2.4. PROCESO 4: Alta y Egreso Hospitalario (Proceso Modificado)
Descripción del Proceso
Este proceso digitaliza y centraliza las actividades relacionadas con el alta y egreso hospitalario. La evaluación médica, epicrisis, recetas, valoración social, conciliación farmacéutica, indicaciones de enfermería, trámite administrativo y salida física del paciente se gestionan mediante Vitalsy.
Los documentos y registros que anteriormente podían ser elaborados manualmente o en formatos físicos pasan a registrarse digitalmente en la plataforma, permitiendo consultar la información, identificar responsables y mantener la trazabilidad de las actividades realizadas.
La estructura del proceso mantiene los cuatro subprocesos identificados en el AS-IS corregido: evaluación y documentación médica, valoración social, conciliación e instrucciones de enfermería y trámite administrativo con egreso físico. El AS-IS actualmente establece estos cuatro componentes y además indica que la valoración social y la conciliación de enfermería se ejecutan en paralelo.

Actores Involucrados
Médico tratante (especialista) / residente.
Profesional de trabajo social.
Enfermera de piso.
Personal administrativo de altas / caja.
Celador / Camillero.
Paciente y familiar / cuidador.
Plataforma Web Vitalsy.


Actividades y Subprocesos
Subproceso 4.1: Evaluación de Criterios de Alta y Elaboración de la Epicrisis
Descripción: Evaluación de la condición clínica del paciente, autorización del alta y generación digital de la documentación médica de egreso.
Actores Involucrados: Médico tratante (especialista) / residente, Plataforma Web Vitalsy.
Actividades paso a paso:
El Médico tratante (especialista) / residente evalúa los criterios clínicos y exámenes disponibles en Vitalsy.
Si el paciente cumple con la estabilidad requerida, el médico autoriza el egreso y registra la Orden Digital de Alta.
Si el paciente presenta inestabilidad o resultados que requieren continuidad del tratamiento, el médico registra digitalmente la decisión de mantener el internamiento y el paciente continúa con su atención.
Una vez autorizado el alta, el Médico residente registra en Vitalsy la Epicrisis Electrónica con los diagnósticos, procedimientos y evolución del paciente.
El Médico residente genera las Recetas Médicas Ambulatorias Digitales.
Vitalsy almacena la documentación generada y la pone a disposición de los responsables de los siguientes subprocesos.
Flujo de Información Descriptivo: Entra la información clínica y el expediente del paciente. Cuando se autoriza el alta, se generan la Orden Digital de Alta, la Epicrisis Electrónica y las Recetas Médicas Ambulatorias Digitales.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 4.1 TO-BE en Bizagi)
Subproceso 4.2: Valoración Social Pre-Egreso
Descripción: Evaluación del entorno familiar y social del paciente autorizado para el alta y registro digital de las acciones de soporte requeridas.
Actores Involucrados: Profesional de trabajo social, Plataforma Web Vitalsy.
Actividades paso a paso:
Vitalsy notifica al Profesional de trabajo social que el paciente cuenta con una Orden Digital de Alta y requiere valoración social.
El Profesional de trabajo social revisa la información disponible y evalúa el entorno familiar y social del paciente.
Si identifica vulnerabilidad social o falta de red de apoyo, registra en Vitalsy el Informe de Valoración Social y las acciones de soporte institucional realizadas.
Si el paciente dispone de un entorno adecuado, registra digitalmente la validación de continuidad del proceso de alta.
Cuando existe un Informe de Valoración Social, este queda disponible en Vitalsy para ser considerado en las indicaciones de cuidados domiciliarios.
Flujo de Información Descriptivo: Entra la Orden Digital de Alta. Se genera la Validación Social Digital y, cuando corresponde, el Informe de Valoración Social Digital.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 4.2 TO-BE en Bizagi)
Subproceso 4.3: Conciliación Farmacéutica al Alta e Instrucciones de Enfermería
Descripción: Conciliación de la medicación y generación digital de las indicaciones de cuidado e información para el paciente y su familia.
Actores Involucrados: Enfermera de piso, Paciente y familiar / cuidador, Plataforma Web Vitalsy.
Actividades paso a paso:
La Enfermera de piso consulta en Vitalsy la información de los medicamentos administrados durante el internamiento, la Epicrisis y las Recetas Médicas Ambulatorias.
La Enfermera de piso realiza la conciliación de medicamentos y registra el resultado directamente en Vitalsy.
Cuando identifica posibles omisiones o duplicidades, registra la observación en el sistema y solicita al médico la revisión correspondiente.
Una vez validada la medicación, registra digitalmente la Hoja de Conciliación Farmacéutica al Alta.
La Enfermera de piso genera el Informe Digital de Alta de Enfermería.
La Enfermera incorpora, cuando corresponde, la información del Informe de Valoración Social generado en el Subproceso 4.2.
La Enfermera de piso registra las indicaciones sobre medicamentos, signos de alarma, cuidados domiciliarios y controles posteriores.
El Paciente y familiar / cuidador reciben las indicaciones y confirman digitalmente su recepción.
Vitalsy almacena los documentos y registros generados como parte del historial de egreso.
Flujo de Información Descriptivo: Entran la Epicrisis Electrónica, las Recetas Médicas Ambulatorias y, cuando corresponde, el Informe de Valoración Social. Como salidas se generan la Hoja de Conciliación Farmacéutica Digital, el Informe Digital de Alta de Enfermería y la Hoja Digital de Indicaciones de Cuidados Domiciliarios.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 4.3 TO-BE en Bizagi)
Subproceso 4.4: Trámite Administrativo, Pase de Salida y Egreso Físico
Descripción: Cierre administrativo del internamiento, emisión digital del pase de salida y confirmación del egreso físico del paciente.
Actores Involucrados: Personal administrativo de altas / caja, Celador / Camillero, Paciente y familiar / cuidador, Enfermera de piso, Plataforma Web Vitalsy.
Actividades paso a paso:
El Personal administrativo de altas / caja recibe la información del alta y consulta los datos administrativos correspondientes en el sistema.
Verifica la cuenta hospitalaria y el estado de pago o cobertura.
Si la liquidación está conforme, registra la aprobación y genera el Pase de Salida Digital.
Si existen cargos o trámites pendientes, registra la observación en el sistema y solicita la regularización correspondiente.
Una vez autorizado el pase, el Celador / Camillero consulta en Vitalsy la autorización de salida.
El Celador / Camillero acude a la habitación y realiza el traslado del paciente hasta la salida principal o ambulancia.
El Paciente y familiar / cuidador reciben el comprobante de salida correspondiente.
La Enfermera de piso registra digitalmente la Salida Efectiva del Paciente.
Vitalsy actualiza automáticamente el estado del lecho y genera la Notificación Digital de Cama Vacante.
Los registros administrativos y de salida quedan almacenados digitalmente como parte del historial del egreso.
Flujo de Información Descriptivo: Entran la Orden Digital de Alta y la documentación generada durante los subprocesos anteriores. Como salidas se generan el Pase de Salida Digital, la Confirmación Digital de Egreso y la Notificación Automática de Cama Vacante.
Modelado del Proceso Mejorado (TO-BE):
(Espacio reservado para la inserción del diagrama del Subproceso 4.4 TO-BE en Bizagi)
Flujo de Información Descriptivo del Proceso 4
El proceso inicia con la evaluación clínica del Médico tratante / residente. Si el paciente cumple los criterios de alta, se genera en Vitalsy la Orden Digital de Alta, la Epicrisis Electrónica y las Recetas Médicas Ambulatorias.
A partir de la autorización del alta, se ejecutan en paralelo la Valoración Social Pre-Egreso y la Conciliación Farmacéutica e Instrucciones de Enfermería. El Profesional de trabajo social registra digitalmente la valoración y, cuando corresponde, el Informe de Valoración Social. La Enfermera de piso registra la conciliación farmacéutica, el Informe Digital de Alta de Enfermería y las Indicaciones de Cuidados Domiciliarios.
Posteriormente, el Personal administrativo de altas / caja verifica la situación administrativa y genera el Pase de Salida Digital. El Celador / Camillero consulta la autorización y realiza el traslado del paciente. Finalmente, la Enfermera de piso registra la salida efectiva en Vitalsy y el sistema actualiza automáticamente el estado de la cama, generando la Notificación Digital de Cama Vacante.
De esta manera, el proceso mantiene la secuencia y responsabilidades del AS-IS, pero sustituye los registros manuales y documentos físicos por registros digitales centralizados y trazables. El AS-IS corregido establece precisamente la ejecución paralela de los Subprocesos 4.2 y 4.3 y el cierre mediante el registro de salida efectiva.
Modelado del Proceso Mejorado (TO-BE)
(Espacio reservado para la inserción del diagrama del Proceso 4 TO-BE en Bizagi)

3.4.2.5. PROCESO 5: Gestión y Asignación de Camas (Proceso de Apoyo Modificado)
Descripción del Proceso
Este proceso de apoyo optimiza la logística de lechos mediante un dashboard centralizado en Vitalsy. Elimina los censos manuales en papel y las llamadas telefónicas de verificación, permitiendo la asignación automática priorizada de camas, el despacho digital de órdenes de limpieza y la habilitación de habitaciones en tiempo real.
Actores Involucrados
Personal de la Unidad Central de Gestión de Camas.
Enfermera supervisora de piso.
Personal de servicios generales / limpieza.
Auxiliar de enfermería.
Actividades y Subprocesos
Subproceso 5.1: Solicitud e Identificación Digital de Disponibilidad de Lechos
Actores Involucrados: Personal de la Unidad Central de Gestión de Camas, Enfermera supervisora de piso.
Actividades paso a paso:
El Personal de la Unidad Central de Gestión de Camas recibe en Vitalsy las solicitudes digitales de cama provenientes de urgencias, quirófano o admisiones.
El Personal de la Unidad Central de Gestión de Camas visualiza el Censo Hospitalario Digital en Tiempo Real en la pantalla principal; si la plataforma registra lechos disponibles que cumplen el perfil requerido, entonces avanza al subproceso de asignación; si el servicio está ocupado al 100%, entonces el software ubica la solicitud en una lista de espera digital jerarquizada por gravedad.
La Enfermera supervisora de piso valida en la Web App las proyecciones de alta del día, alimentando la disponibilidad futura del censo.
Flujo de Información Descriptivo: Entra la Solicitud Digital de Cama. Se entregan como salidas el Censo Hospitalario Digital en Tiempo Real y la Lista de Espera Digital de Solicitudes Priorizadas.
Modelado del Proceso Mejorado (AS-IS): 

Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 5.1 TO-BE en Bizagi)
Subproceso 5.2: Asignación Centralizada e Inteligente de Camas
Actores Involucrados: Personal de la Unidad Central de Gestión de Camas, Enfermera supervisora de piso.
Actividades paso a paso:
El Personal de la Unidad Central de Gestión de Camas selecciona la solicitud en Vitalsy; si el paciente requiere aislamiento por patología infecciosa, entonces la plataforma filtra y sugiere únicamente habitaciones individuales de aislamiento; si no requiere aislamiento, entonces sugiere lechos compatibles por género y especialidad en sala general.
El Personal de la Unidad Central de Gestión de Camas confirma la asignación en Vitalsy.
La Enfermera supervisora de piso recibe un aviso en el terminal de su estación notificando la asignación del nuevo paciente a la habitación indicada.
Flujo de Información Descriptivo: Se toman las solicitudes priorizadas. Se genera como salida la Ficha Digital de Asignación de Lecho.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 5.2 TO-BE en Bizagi)
Subproceso 5.3: Habilitación y Desinfección Terminal Digitalizada de la Unidad
Actores Involucrados: Enfermera supervisora de piso, Personal de servicios generales / limpieza, Auxiliar de enfermería.
Actividades paso a paso:
La Plataforma Web Vitalsy (al marcarse el egreso del paciente previo) despacha automáticamente una orden de trabajo digital al terminal/dispositivo del personal de limpieza asignado a ese sector.
El Personal de servicios generales / limpieza acude a la habitación y ejecuta la desinfección terminal; si la cama perteneció a un paciente con código de aislamiento, entonces el personal de limpieza aplica el protocolo digital de desinfección profunda; si fue un alta convencional, entonces ejecuta el protocolo estándar.
El Personal de servicios generales / limpieza presiona "Limpieza Completada" en Vitalsy.
El Auxiliar de enfermería viste la cama con lencería limpia e insumos de acogida, presionando "Unidad Equipada" en pantalla.
La Enfermera supervisora de piso recibe la confirmación en pantalla y convalida el estado de la cama a "Disponible", actualizando el censo central en tiempo real.
Flujo de Información Descriptivo: Entra la notificación de vacancia. Se emiten la Orden Digital de Limpieza Terminal, el Registro Digital de Desinfección y la Confirmación de Cama Habilitada en Sistema.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 5.3 TO-BE en Bizagi)
Flujo de Información Descriptivo del Proceso 5
Entra la Solicitud Digital de Cama. El Personal de Gestión de Camas consulta el Censo Hospitalario Digital en Tiempo Real y emite la Ficha Digital de Asignación de Lecho. Tras el egreso, Vitalsy genera automáticamente la Orden Digital de Limpieza Terminal para el Personal de servicios generales / limpieza, quien firma el Registro Digital de Desinfección. Tras la lencería colocada por el Auxiliar de enfermería, la Enfermera supervisora de piso confirma en Vitalsy el estado de Cama Habilitada en Sistema, actualizando la disponibilidad sin llamadas telefónicas.
Modelado del Proceso Mejorado (TO-BE)
(Espacio reservado para la inserción del diagrama del Proceso 5 TO-BE en Bizagi)
3.4.2.6. PROCESO 6: Gestión del Personal Asistencial (Proceso de Apoyo Modificado)
Descripción del Proceso
Este proceso de apoyo digitaliza la administración del equipo de salud. Sustituye los roles de turno impresos y la distribución empírica de pacientes por un módulo de programación digital, un algoritmo de balanceo de cargas basado en el score NEWS2 y la severidad clínica, y un módulo web para la entrega de turno (Handover Digital).
Actores Involucrados
Jefatura de enfermería / Dirección médica.
Enfermera supervisora de piso.
Enfermera de piso (saliente).
Enfermera de piso (entrante).
Personal de recursos humanos.
Actividades y Subprocesos
Subproceso 6.1: Programación Digital de Turnos y Balanceo Automatizado de Cargas
Actores Involucrados: Jefatura de enfermería / Dirección médica, Enfermera supervisora de piso, Enfermera de piso.
Actividades paso a paso:
La Jefatura de enfermería / Dirección médica elabora y publica el Rol Mensual de Turnos Digital en la plataforma Vitalsy.
La Enfermera supervisora de piso abre el Módulo de Asignación Diaria al inicio de la jornada.
La Plataforma Web Vitalsy sugiere una distribución equitativa de pacientes evaluando el score NEWS2 y la carga de cuidados de cada habitación; si un sector tiene pacientes en categoría amarilla o roja, entonces la plataforma asigna un menor número de camas a esa enfermera; si los pacientes están en categoría verde, entonces asigna la relación estándar.
La Enfermera supervisora de piso aprueba la distribución y despacha la Planilla Digital de Asignación a las cuentas del personal.
La Enfermera de piso recibe en su pantalla la lista de pacientes y habitaciones a su cargo.
Flujo de Información Descriptivo: Se utiliza como entrada el censo activo. Se emiten el Rol Mensual de Turnos Digital y la Planilla Digital de Asignación Balanceada Enfermera-Paciente.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 6.1 TO-BE en Bizagi)
Subproceso 6.2: Entrega de Turno Digitalizada a Pie de Cama (Handover)
Actores Involucrados: Enfermera de piso (saliente), Enfermera de piso (entrante).
Actividades paso a paso:
La Enfermera de piso (saliente) abre el Módulo de Handover en Vitalsy, donde el software consolida automáticamente las constantes fisiológicas del turno, medicamentos e-MAR aplicados/pendientes y alertas registradas.
La Enfermera de piso (saliente) y la Enfermera de piso (entrante) realizan el recorrido a pie de cama por las habitaciones asignadas.
La Enfermera de piso (saliente) transmite las observaciones clínicas apoyándose en la pantalla de Vitalsy.
La Enfermera de piso (entrante) revisa los datos en el sistema; si detecta alguna duda o pendiente no documentado, entonces solicita la aclaración e inspección inmediata al paciente; si la información está completa y coincide con el paciente, entonces valida el reporte en pantalla.
La Enfermera de piso (entrante) firma digitalmente la recepción del turno en Vitalsy, transfiriendo formalmente la responsabilidad asistencial.
Flujo de Información Descriptivo: Entran las notas de enfermería y el Kardex digital. Se genera firmado el Registro Electrónico de Cambio de Turno (Handover Digital).
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 6.2 TO-BE en Bizagi)
Subproceso 6.3: Gestión Digital de Incidencias, Ausentismo y Coberturas
Actores Involucrados: Enfermera supervisora de piso, Jefatura de enfermería / Dirección médica, Personal de recursos humanos.
Actividades paso a paso:
La Enfermera supervisora de piso registra las inasistencias de personal en Vitalsy al inicio del turno.
La Plataforma Web Vitalsy evalúa la cobertura; si la inasistencia genera sobrecarga en un sector crítico, entonces la supervisora activa la reasignación automática de cargas en sistema y tramita la solicitud digital de retén; si la dotación presente absorbe la demanda, entonces el software rebalancea las camas entre las enfermeras activas.
La Jefatura de enfermería / Dirección médica aprueba la convocatoria digital del profesional de retén.
El Personal de recursos humanos recibe la alerta en el módulo de personal, valida la justificación y autoriza la cobertura de la guardia extraordinaria.
La Enfermera supervisora de piso confirma el ingreso del retén en el Módulo de Asistencia Digital.
Flujo de Información Descriptivo: Entra el reporte de ausentismo. Se emiten la Solicitud Digital de Cobertura Extraordinaria y el Control Digital de Asistencia e Incidencias.
Modelado del Proceso Mejorado (TO-BE): (Espacio reservado para la inserción del diagrama del Subproceso 6.3 TO-BE en Bizagi)

Flujo de Información Descriptivo del Proceso 6
El flujo se inicia con el Rol Mensual de Turnos Digital publicado por la Jefatura de enfermería. Al inicio del día, Vitalsy procesa el censo y los scores NEWS2 para generar la Planilla Digital de Asignación Balanceada Enfermera-Paciente. En el cambio de turno, la Enfermera de piso (saliente) y la Enfermera de piso (entrante) utilizan el Módulo de Handover Web a pie de cama, concluyendo con la firma digital del Registro Electrónico de Cambio de Turno. Ante ausentismos, la Enfermera supervisora de piso emite la Solicitud Digital de Cobertura Extraordinaria, procesada por el Personal de recursos humanos en el Control Digital de Asistencia e Incidencias.
Modelado del Proceso Mejorado (TO-BE)
(Espacio reservado para la inserción del diagrama del Proceso 6 TO-BE en Bizagi)
