# Demostración funcional: monitoreo y alertas

Recorrido manual de una toma de constantes que abre una alerta, del acuse de enfermería y de la atención del médico. Use a la paciente que ya quedó hospitalizada en [admision.md](admision.md): **Rosa Elena Huamán Ccahuana**, documento **47821563**.

Si en **Pacientes** su fila todavía dice **Continuar**, el ingreso no ha terminado. Complete antes la firma de indicaciones.

## Dónde entrar y con qué contraseña

| Entorno | Dirección | Contraseña de todas las cuentas |
| --- | --- | --- |
| Desarrollo local (Docker en su máquina) | http://localhost:8080 | `Vitalsy.2026` |
| Laboratorio | La dirección que publique el pipeline. La web del compose de laboratorio usa el puerto 4200. | `password_ejemplo` |

Para cambiar de perfil: pulse **Cerrar sesión**. La sesión también se cierra sola a los cinco minutos sin usar el sistema.

## 1. Enfermera registra constantes alteradas

1. Entre con `enfermera_piso@vitalsy.local` y la contraseña del entorno.
2. Abra **Pacientes**.
3. En **Buscar paciente** escriba `Rosa` y pulse **Buscar**.
4. Pulse **Atención**.
5. En el menú, grupo **Atención en piso**, pulse **Constantes**.

La pantalla es **Monitoreo de constantes**. Los campos vienen vacíos: no use las cifras del ingreso. Escriba esta toma, que calcula NEWS2 en 5 y abre la alerta:

| Campo | Qué escribir o elegir |
| --- | --- |
| Frecuencia respiratoria | `22` |
| Saturación | `94` |
| Presión sistólica | `128` |
| Presión diastólica | `82` |
| Pulso | `102` |
| Temperatura | `38.4` |
| Escala de SpO2 | `Escala 1 (estándar)` |
| Oxígeno suplementario | `Aire ambiente (sin O2)` |
| Conciencia | `Alerta` |

Pulse **Registrar constantes**.

Debe verse la gráfica y un aviso de que se activó una alerta clínica. Si el navegador pide permiso para el sonido, acéptelo: la sirena forma parte de la demostración.

## 2. Campana y bandeja

1. Pulse la campana del encabezado. El número corresponde a las alertas de este perfil.
2. Lea el aviso. Pulse la confirmación de lectura que ofrece el aviso.
3. Cuando la sirena pare, pulse **Ir al evento**. Si prefiere la bandeja, abra **Alertas** en el menú y entre a la alerta de Rosa.

En **Evento de alerta** pulse **Confirmar recepción**. La sirena no debe seguir. El caso queda en seguimiento, no cerrado.

## 3. Nueva toma dentro de la alerta

Siga en el mismo evento, pestaña **Nueva toma / NEWS2**. Repita una toma que sigue alterada, para que el sistema avise al médico:

| Campo | Qué escribir o elegir |
| --- | --- |
| Frecuencia respiratoria | `22` |
| Saturación | `94` |
| Presión sistólica | `126` |
| Presión diastólica | `80` |
| Pulso | `100` |
| Temperatura | `38.2` |
| Conciencia | `Alerta` |

Pulse **Recalcular NEWS2**.

No programe el control de esta pantalla: ese formulario solo se habilita cuando NEWS2 vuelve a 0. Con esta toma el aviso médico es el resultado esperado.

## 4. Preocupación clínica, si quiere mostrarla

Sigue siendo opcional. En la pestaña **Deterioro / preocupación clínica**:

| Campo | Qué escribir |
| --- | --- |
| Motivo de la atención médica | `Persiste febril y taquipneica. Dolor en hipocondrio derecho a la palpación. Solicito valoración médica en sala.` |

Pulse **Solicitar atención médica**.

## 5. Médico atiende la alerta

1. Pulse **Cerrar sesión**.
2. Entre con `medico_residente@vitalsy.local` y la misma contraseña.
3. Abra **Alertas**. La solicitud también la vería el médico tratante.
4. Entre al evento de Rosa Elena Huamán Ccahuana.
5. Si el botón está visible, pulse **Confirmar recepción**.
6. En **Evaluación e indicaciones de urgencia**:

| Campo | Qué escribir |
| --- | --- |
| Evaluación del paciente | `Paciente orientada, febril, taquipneica, dolor en hipocondrio derecho. Abdomen blando, Murphy positivo. Se mantiene en sala con vigilancia.` |
| Indicaciones médicas de urgencia | `Control de constantes en 1 hora. Hemograma y ecografía abdominal. Analgesia según indicación vigente. Avisar si la frecuencia respiratoria supera 24 o la temperatura 39 °C.` |

7. Pulse **Registrar atención médica**.

No pulse el pedido al equipo de respuesta rápida ni marque traslado a cuidados intensivos. Esos pasos alargan el caso hacia UCI y no hacen falta para esta demostración.

## 6. e-MAR del mismo turno

Vuelva a entrar como `enfermera_piso@vitalsy.local`. Abra **Pacientes**, busque a Rosa, pulse **Atención** y luego **e-MAR**.

1. Elija una dosis pendiente de losartán o de metformina.
2. La pantalla muestra el código esperado del medicamento y el del brazalete. Cópielos.
3. En **Código paciente (brazalete)** pegue el código del brazalete que muestra la propia pantalla.
4. En **Código medicamento** pegue el código esperado del medicamento.
5. Compruebe que los cinco correctos quedan marcados.
6. Pulse **Confirmar administración**.

Si escribe un código distinto, la administración queda bloqueada. Eso también se puede mostrar: escriba `OTRO-CODIGO`, compruebe el bloqueo y después repita con los códigos correctos.

## Qué debe verse al cerrar

La alerta de Rosa tiene acuse de enfermería y atención médica registrada. El e-MAR muestra la dosis como administrada. El paciente sigue hospitalizado, así que [alta.md](alta.md) puede empezar con el médico tratante.
