# Demostración funcional: admisión

Recorrido manual del ingreso, desde el registro hasta las indicaciones basales. Al terminar, el paciente queda hospitalizado y se puede continuar con el monitoreo y el alta.

Use siempre a la misma persona: **Rosa Elena Huamán Ccahuana**, documento **47821563**.

## Dónde entrar y con qué contraseña

| Entorno | Dirección | Contraseña de todas las cuentas |
| --- | --- | --- |
| Desarrollo local (Docker en su máquina) | http://localhost:8080 | `Vitalsy.2026` |
| Laboratorio | La dirección que publique el pipeline. La web del compose de laboratorio usa el puerto 4200. | `password_ejemplo` |

El correo cambia según el perfil. La contraseña no.

Si en el laboratorio el ingreso dice que el correo o la contraseña no son correctos, las cuentas de demostración no se sembraron en ese servidor. En local, `docker compose up` las crea al arrancar.

La sesión se cierra sola a los cinco minutos sin actividad. Si vuelve a la pantalla de acceso, entre de nuevo con el mismo correo.

Para cambiar de perfil: pulse **Cerrar sesión**, arriba a la derecha.

## 1. Admisión registra el ingreso

1. Abra la dirección del entorno.
2. En **Correo** escriba `admision@vitalsy.local`.
3. En **Contraseña** escriba la de la tabla de arriba.
4. Pulse **Entrar**.
5. En el menú pulse **Registrar ingreso**.

Complete **Registrar ingreso** así:

| Campo | Qué escribir o elegir |
| --- | --- |
| Número de orden | `OI-2026-0148` |
| Documento de identidad | `47821563` |
| Nombre del paciente | `Rosa Elena Huamán Ccahuana` |
| Servicio de origen | `Emergencia adultos` |
| Pagador asegurador | `SIS` |
| Estado de cobertura | `Aprobada` |
| Plan de cobertura | `SIS Gratuito` |
| Motivo de ingreso | `Dolor en hipocondrio derecho de 18 horas, náuseas y fiebre. Sospecha de colecistitis aguda.` |

6. Pulse **Registrar**.

El documento solo admite dígitos. No use puntos ni guiones.

## 2. Orden de internamiento

La pantalla **Orden de internamiento** se abre con el número ya escrito.

1. Pulse **Consultar orden**.
2. Compruebe que aparece Rosa Elena Huamán Ccahuana, documento 47821563, origen Emergencia adultos y cobertura SIS.
3. Pulse **Confirmar orden**.

## 3. Filiación

En **Datos filiatorios** el nombre y el documento ya vienen cargados. No los cambie.

| Campo | Qué poner |
| --- | --- |
| Nombre completo del paciente | `Rosa Elena Huamán Ccahuana` |
| Número de documento | `47821563` |
| Fecha de nacimiento | `12/03/1984` |
| Casilla | Marque **Confirmo que los datos coinciden con el documento presentado** |

Pulse **Validar filiación**. Debe aparecer «Filiación validada.»

## 4. Cobertura

En **Cobertura sanitaria** el pagador y el plan se muestran solos.

1. En **Estado de cobertura** deje **Aprobada**.
2. Pulse **Registrar cobertura**.

No pulse **Derivar trámite**. Esa vía deja el ingreso en espera y no sigue hacia el brazalete.

## 5. Brazalete

1. En **Brazalete de identificación** pulse **Emitir brazalete**.
2. Anote el código que aparece en pantalla, por ejemplo un valor que empieza por `BRZ-`. Lo va a escribir el camillero. No use `BRZ-0001-ANA`: ese código pertenece a otra paciente de demostración.

## 6. Expediente y consentimiento

1. En **Expediente clínico de ingreso** pulse **Aperturar expediente**.
2. En **Consentimiento informado**:

| Campo | Qué poner |
| --- | --- |
| Nombre de quien firma | `Rosa Elena Huamán Ccahuana` |
| Relación con el paciente | `Titular / propio paciente` |
| Casilla | Marque **Acepto el consentimiento informado para atención médica y procedimientos hospitalarios** |
| Vitalsy Life | Deje sin marcar **El paciente es usuario de la app Vitalsy Life** |

3. Pulse **Registrar consentimiento**.
4. Pulse **Cerrar sesión**.

## 7. Camillero traslada

1. Entre con `camillero@vitalsy.local` y la misma contraseña del entorno.
2. Abra **Pacientes**.
3. En **Buscar paciente** escriba `Rosa` y pulse **Buscar**.
4. En la fila de Rosa Elena Huamán Ccahuana pulse **Continuar**.

**Orden de traslado a piso**

1. El campo **Número de traslado** debe venir escrito. No lo borre.
2. Pulse **Consultar traslado**.
3. Pulse **Confirmar traslado**. Debe aparecer «Traslado confirmado.»
4. Siga al paso de identidad con el stepper o vuelva a **Pacientes** y pulse otra vez **Continuar**.

**Verificación de identidad**

1. En **Código del brazalete** escriba exactamente el código que anotó al emitir el brazalete.
2. Pulse **Verificar brazalete**.
3. Pulse **Cerrar sesión**.

Si el código no coincide, el sistema no deja continuar. Vuelva a la pantalla del brazalete con admisión solo si necesita leer el código de nuevo.

## 8. Enfermera de piso recibe y valora

1. Entre con `enfermera_piso@vitalsy.local`.
2. En **Pacientes**, busque `Rosa` y pulse **Continuar**.

**Recepción física en piso**

Pulse **Confirmar recepción**. No hace falta reubicar: **Registrar reubicación** es solo si el lecho de la orden no es el correcto.

**Valoración inicial**

| Campo | Qué escribir |
| --- | --- |
| Motivo de consulta | `Dolor en hipocondrio derecho desde ayer, náuseas y un pico febril en emergencia. Ingresa estable, orientada y colaboradora.` |
| Antecedentes | `Hipertensión arterial en tratamiento. Diabetes mellitus tipo 2. Colecistectomía no previa. Niega cirugías.` |
| Alergia | Escriba `Penicilina` y pulse **Agregar alergia** |
| Casilla | Marque **Ninguna otra conocida.** |

Pulse **Guardar valoración**.

**Constantes vitales basales**

Estas cifras dejan NEWS2 en 0. Así el ingreso no abre una alerta; la alerta se provoca después, en el monitoreo.

| Campo | Qué escribir o elegir |
| --- | --- |
| Frecuencia respiratoria | `16` |
| Saturación | `98` |
| Presión sistólica | `118` |
| Presión diastólica | `76` |
| Pulso | `78` |
| Temperatura | `36.6` |
| Escala de SpO2 | `Escala 1 (estándar)` |
| Oxígeno suplementario | `Aire ambiente (sin O2)` |
| Conciencia | `Alerta` |

Pulse **Registrar constantes**. El aviso debe decir que las constantes quedaron registradas y no debe anunciar una alerta clínica.

**Conciliación farmacéutica de ingreso**

Deje sin marcar la casilla de «sin medicación habitual». Agregue dos fármacos y pulse **Agregar medicamento** después de cada uno:

| Medicamento | Dosis | Frecuencia | Vía |
| --- | --- | --- | --- |
| `Losartán` | `50 mg` | `Cada 24 horas` | `Oral` |
| `Metformina` | `850 mg` | `Cada 12 horas` | `Oral` |

| Campo | Qué escribir |
| --- | --- |
| Alergias conocidas | `Penicilina` |
| Observaciones adicionales de enfermería | `Toma losartán en la mañana y metformina con el desayuno y la cena. Niega omisiones en las últimas 48 horas.` |

Pulse **Registrar conciliación**.

**Escalas de riesgo**

Morse, deje estos radios:

| Pregunta | Elección |
| --- | --- |
| Antecedentes de caídas | `No (0 pts)` |
| Diagnóstico secundario | `Sí (15 pts)` |
| Ayuda para deambular | `Ninguna / reposo (0 pts)` |
| Vía endovenosa | `Sí (20 pts)` |
| Marcha / traslado | `Normal / inmóvil (0 pts)` |
| Estado mental | `Conoce sus límites (0 pts)` |

Braden, elija en cada lista el valor más alto (el de menor riesgo), salvo **Actividad** y **Movilidad**, donde puede dejar el segundo valor si quiere mostrar un riesgo leve. Pulse **Registrar escalas**.

**Kardex electrónico de ingreso**

Revise que figuren la valoración, la alergia a penicilina, los dos medicamentos y las constantes. Pulse **Confirmar revisión del Kardex**.

7. Pulse **Cerrar sesión**.

## 9. Médico residente firma las indicaciones

1. Entre con `medico_residente@vitalsy.local`.
2. En **Pacientes**, busque `Rosa` y pulse **Continuar**.
3. En **Indicaciones médicas basales** pulse **Editar prescripciones** si los campos no se pueden escribir.
4. Complete el ítem:

| Campo | Qué escribir |
| --- | --- |
| Indicación 1 | `Dieta blanda` |
| Categoría | `Dieta` |
| Detalle | `Dieta blanda, hidratación oral y control de dolor según evolución.` |

5. En **Nombre del médico** escriba `Dr. Andrés Salazar Ríos`.
6. En **Colegiatura** escriba `CMP 45821`.
7. Marque **Confirmo y firmo las indicaciones basales para inicio formal del plan de cuidados en piso.**
8. Pulse **Firmar indicaciones**.

Esa firma crea el plan basal del e-MAR a partir de losartán y metformina. El ítem de dieta no se convierte en una dosis.

## Qué debe verse al cerrar

Rosa Elena Huamán Ccahuana ya no está en un paso de admisión. En **Pacientes**, su fila ofrece **Atención** en lugar de **Continuar**. Con eso puede abrir [monitoreo-alertas.md](monitoreo-alertas.md).
