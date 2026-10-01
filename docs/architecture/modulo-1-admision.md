# Módulo 1: Admisión y recepción

Interfaces del ingreso hospitalario. Los códigos de requisito no se muestran en pantalla: esta guía indica qué interfaz corresponde a cada uno y cómo comprobar que funciona.

## Cómo usar el ingreso

El trabajo empieza en **Pacientes**. El menú solo muestra Inicio, Pacientes y, para admisión, **Registrar ingreso**. Los formularios se abren desde Continuar o la ficha, siempre con el paciente identificado (`?ingreso=`).

1. Desde la raíz del repositorio: `docker compose up --build`.
2. Abrir http://localhost:8080.
3. Iniciar sesión con una cuenta local. La contraseña de las cuentas demo es `Vitalsy.2026`.
4. En **Pacientes** vea el censo. Si el caso está en su turno, pulse **Continuar**.
5. Complete el formulario y use el botón de registro o confirmación de esa pantalla: al guardar con éxito el ingreso avanza. Ya no hay un botón aparte de «Confirmar paso en el censo».
6. Un stepper en la barra del caso muestra los pasos hechos, el actual y los pendientes. El aviso de turno («El siguiente paso corresponde a…») solo aparece en la ficha del ingreso, con el nombre del paciente dentro del recuadro blanco (`Paciente: …`).

### Cómo entran pacientes nuevos

Hay dos vías (ambas crean un ingreso en el censo):

| Vía | Quién | Cómo |
|---|---|---|
| Registro manual | Admisión | Menú **Registrar ingreso** o `/pacientes/nuevo`. Completa orden, paciente, cobertura e inicia en el paso de orden. |
| API de intake | Sistema emisor / Admisión | `POST /api/v1/hospital-admission/intake` con el mismo payload (orden, paciente, cobertura). Fuente `external`. |

Más adelante se podrá decidir cuál dejar como canal principal.

El censo de demostración ya trae tres ingresos:

| Paciente | Dónde está | Quién actúa ahora |
|---|---|---|
| Luis Ernesto Paredes | Cobertura pendiente | Admisión |
| Carmen Yolanda Vega | Cobertura rechazada | Admisión |
| Ana María Quispe Rojas | Lista para traslado | Celador / Camillero. Habitación 312, lecho B, brazalete `BRZ-0001-ANA` |

Los códigos de traslado y brazalete son propios de cada paciente: consultar o verificar el de Ana no sirve para otro ingreso.

Para recorrer el camino completo de Ana:

1. Entre como camillero (`camillero@vitalsy.local`), abra a Ana, consulte el traslado y confírmelo; luego verifique el brazalete (el escaneo confirma solo).
2. Entre como enfermera de piso (`enfermera_piso@vitalsy.local`). Confirme recepción y siga valoración, constantes, conciliación, escalas y Kardex.
3. Entre como médico residente (`medico_residente@vitalsy.local`). Firme las indicaciones.

Si la cobertura no está aprobada, derive el trámite y registre: el ingreso queda en trámite. Cuando se apruebe, vuelva a cobertura, marque **Aprobada** y registre.

La cama no se asigna en el registro de ingreso. Gestión de camas (`/camas`, RF-68–73) confirma el lecho. Si al firmar el consentimiento el ingreso aún no tiene habitación, el sistema deja una asignación provisional para la orden de traslado del camillero (RF-07).

## Cómo entrar

| Perfil | Correo | Qué abre |
|---|---|---|
| Admisión | `admision@vitalsy.local` | RF-01 a RF-06 y registro/intake |
| Celador / Camillero | `camillero@vitalsy.local` | RF-07 y RF-08 |
| Enfermera de piso | `enfermera_piso@vitalsy.local` | RF-09 a RF-15 |
| Auxiliar de enfermería | `auxiliar_enfermeria@vitalsy.local` | RF-12 (constantes basales) |
| Médico residente | `medico_residente@vitalsy.local` | RF-16 |
| Médico tratante | `medico_tratante@vitalsy.local` | Módulo 2 (visita / CPOE) |

Contraseña de las cuentas demo: `Vitalsy.2026`.

Cada pantalla solo se abre con el perfil de esa fila. El menú no lista los pasos sueltos: se llegan desde el censo con paciente cargado.

## Cómo revisar el acceso (RNF-08 y RNF-09)

| Requisito | Qué debe hacer | Cómo confirmar que está bien |
|---|---|---|
| RNF-08 | Exigir sesión y limitar cada interfaz al perfil | Sin sesión solo aparece Iniciar sesión. Una ruta de otro perfil muestra que la vista no está disponible. |
| RNF-09 | Cerrar la sesión tras 5 minutos sin actividad | Tras 5 minutos sin actividad vuelve a Iniciar sesión. |

## Qué revisar

| Requisito | Qué debe hacer | Interfaz | Rol | Cómo confirmar que está bien |
|---|---|---|---|---|
| RF-01 | Ver la orden de internamiento | Continuar → orden | Admisión | Con el paciente abierto, consulte su número de orden. |
| RF-02 | Validar filiación y cobertura | Continuar → filiación / cobertura | Admisión | Validar filiación y registrar cobertura avanza el caso. |
| RF-03 | Derivar cobertura | Derivación desde cobertura | Admisión | El teléfono solo admite dígitos. Al registrar, el caso queda en trámite. |
| RF-04 | Emitir brazalete | Continuar → brazalete | Admisión | Emite un código propio del paciente en curso, no solo el de Ana. |
| RF-05 | Abrir expediente | Continuar → expediente | Admisión | Apertura y avanza al consentimiento. |
| RF-06 | Consentimiento | Continuar → consentimiento | Admisión | Al registrar, el caso pasa a camillero. |
| RF-07 | Orden de traslado | Continuar → traslado | Celador / Camillero | Cada `OT-…` muestra al paciente dueño de ese código. |
| RF-08 | Verificar brazalete | Continuar → identidad | Celador / Camillero | Cada `BRZ-…` confirma solo a su paciente; el escaneo valida solo. |
| RF-09 | Recepción en piso | Continuar → recepción | Enfermera de piso | Confirma llegada al lecho asignado. |
| RF-10 | Reubicación | Recepción → reubicación | Enfermera de piso | Motivo, habitación y lecho solicitados; notifica a la central. |
| RF-11–RF-16 | Valoración a indicaciones | Continuar según el paso | Enfermería / Médico | Registrar en cada pantalla avanza el ingreso. En constantes, la PA se guarda como sistólica/diastólica (NEWS2 usa solo la sistólica). En conciliación, «sin medicación habitual» también avanza. |
| RF-17 | Censo | `/pacientes` | Todos | Lista pacientes y Continuar solo si es su turno. |
| RF-19 | Continuar paso vigente | Censo / ficha | Todos | Abre la actividad con el paciente ya identificado. |
| RF-20 | Buscar por brazalete | Censo → Escanear brazalete | Todos | Filtra el listado por el código leído. |

## API de intake (externa)

`POST /api/v1/hospital-admission/intake` (autenticado, rol admisión):

```json
{
  "orderNumber": "OI-2026-0200",
  "patientName": "Nombre Apellido",
  "documentNumber": "12345678",
  "originService": "Emergencia adultos",
  "coveragePayer": "SIS",
  "coverageStatus": "aprobada",
  "coveragePlan": "SIS Gratuito",
  "requestingPhysician": "Dra. Ejemplo",
  "reason": "Motivo clínico"
}
```

Respuesta `201` con el `encounter` creado en el paso de orden.
