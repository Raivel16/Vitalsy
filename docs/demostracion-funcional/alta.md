# Demostración funcional: alta

Recorrido manual del egreso de **Rosa Elena Huamán Ccahuana**, documento **47821563**, la paciente hospitalizada en [admision.md](admision.md). El monitoreo de [monitoreo-alertas.md](monitoreo-alertas.md) puede haberse hecho antes; el alta no lo exige.

En **Pacientes** la fila debe ofrecer **Atención**. Si todavía dice **Continuar**, firme antes las indicaciones de admisión.

## Dónde entrar y con qué contraseña

| Entorno | Dirección | Contraseña de todas las cuentas |
| --- | --- | --- |
| Desarrollo local (Docker en su máquina) | http://localhost:8080 | `Vitalsy.2026` |
| Laboratorio | La dirección que publique el pipeline. La web del compose de laboratorio usa el puerto 4200. | `password_ejemplo` |

Para cambiar de perfil: pulse **Cerrar sesión**. Cada persona solo ve el formulario que le corresponde. Si no aparece el botón de este paso, falta un entregable anterior o entró con otro correo.

## 1. Médico tratante abre el alta

1. Entre con `medico_tratante@vitalsy.local` y la contraseña del entorno.
2. En el menú pulse **Egreso**.
3. En el listado de hospitalizados busque a Rosa Elena Huamán Ccahuana. Si hay muchas filas, use el buscador de esa pantalla y escriba `Rosa`.
4. Pulse **Iniciar proceso de alta**.
5. Lea la cadena de entregables. Pulse **Registrar orden de alta**.

El aviso indica que siguen la epicrisis, el trabajo social y la enfermería. Pulse **Cerrar sesión**.

## 2. Médico residente escribe epicrisis y receta

1. Entre con `medico_residente@vitalsy.local`.
2. Abra **Egreso**.
3. En la tarjeta de Rosa pulse **Continuar alta**.
4. Complete la epicrisis:

| Campo | Qué escribir |
| --- | --- |
| Diagnósticos | `Colecistitis aguda litiásica. Hipertensión arterial. Diabetes mellitus tipo 2.` |
| Procedimientos | `Tratamiento médico en sala. Ecografía abdominal. No se realizó cirugía en este ingreso.` |
| Evolución | `Evolución favorable, afebril en las últimas 24 horas, tolera dieta blanda y deambula. Alta con control por consultorio externo.` |

5. Pulse **Guardar epicrisis**.
6. En el formulario de receta que aparece a continuación:

| Campo | Qué escribir |
| --- | --- |
| Medicamento | `Losartán` |
| Dosis | `50 mg` |
| Vía | `Oral` |
| Frecuencia | `Cada 24 horas` |
| Días | `30` |

7. Pulse **Emitir receta**.
8. Pulse **Cerrar sesión**.

## 3. Trabajo social valora el entorno

1. Entre con `trabajo_social@vitalsy.local`.
2. Abra **Egreso** y pulse **Continuar alta** en Rosa.
3. Complete:

| Campo | Qué escribir |
| --- | --- |
| Informe de valoración social | `Vive con su esposo en domicilio propio. Cuenta con transporte para el control. El familiar comprende los signos de alarma y el horario de la medicación.` |
| ¿Entorno adecuado? (si/no) | `si` |

Escriba `si` en minúsculas, sin tilde. Otra palabra deja el entorno como no validado.

4. Pulse **Guardar valoración**.
5. Pulse **Cerrar sesión**.

## 4. Enfermera de piso cierra la parte clínica

1. Entre con `enfermera_piso@vitalsy.local`.
2. Abra **Egreso** y pulse **Continuar alta** en Rosa.
3. En **Resultado de la conciliación** escriba:

`Se suspende la medicación de sala. Continúa losartán 50 mg cada 24 horas y metformina 850 mg cada 12 horas, que ya tomaba en casa. Se explica no reiniciar antibiótico ni analgésico que no esté en la receta.`

4. Pulse **Registrar conciliación**.
5. En el informe de enfermería:

| Campo | Qué escribir |
| --- | --- |
| Indicaciones de medicamentos | `Losartán 50 mg, un comprimido cada mañana. Metformina 850 mg con el desayuno y la cena.` |
| Signos de alarma | `Fiebre mayor de 38 °C, dolor abdominal que aumenta, vómitos o coloración amarilla de la piel. Acudir a emergencia.` |
| Cuidados domiciliarios | `Dieta blanda por tres días, reposo relativo y control por consultorio en siete días.` |
| Vitalsy Life | Marque **No es usuario: generar invitación** |

6. Pulse **Generar informe**. Si no eligió una opción de Vitalsy Life, el sistema pide el seguimiento y no guarda.
7. En **Nombre de quien recibe** escriba `Rosa Elena Huamán Ccahuana`.
8. Pulse **Confirmar recepción**.
9. Pulse **Cerrar sesión**. No registre todavía la salida: falta el pase de caja.

## 5. Altas y caja emite el pase

1. Entre con `altas_caja@vitalsy.local`.
2. Abra **Egreso** y pulse **Continuar alta** en Rosa.
3. Pulse **Marcar liquidación conforme**.
4. Pulse **Emitir pase de salida**.
5. Pulse **Cerrar sesión**.

## 6. Camillero consulta el pase

1. Entre con `camillero@vitalsy.local`.
2. Abra **Egreso**.
3. Abra la ficha de Rosa. Debe leer que el pase ya está emitido y que la salida la registra la enfermera de piso. Este perfil no tiene botón para dar el alta.
4. Pulse **Cerrar sesión**.

## 7. Enfermera registra la salida

1. Entre otra vez con `enfermera_piso@vitalsy.local`.
2. Abra **Egreso** y pulse **Continuar alta** en Rosa.
3. Pulse **Registrar salida efectiva**.

El aviso indica que la salida quedó registrada y la cama queda vacante.

## Qué debe verse al cerrar

La ficha dice que el paciente ya egresó. Rosa Elena Huamán Ccahuana deja de aparecer en **Pacientes**. En **Egreso**, la cadena de entregables queda completa.
