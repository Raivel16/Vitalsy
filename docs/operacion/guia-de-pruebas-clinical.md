# Guía de pruebas funcionales de Vitalsy Clinical

**Producto:** Vitalsy Clinical (backend Laravel + web React). **Fuera de alcance:** la app móvil *Vitalsy Life* (`movil/`) no se prueba en esta guía; solo se simula su lado de servidor por API cuando un escenario de Clinical lo necesita (código de vinculación).

**Versión automática:** casi todos los escenarios de esta guía se ejecutan solos con `npm run e2e` (ver [pruebas-e2e.md](pruebas-e2e.md)).

**Para quién:** QA o evaluador sin conocimiento del código. Cada paso indica rol/cuenta, ruta o pantalla, qué escribir, resultado esperado y siguiente paso.

**Cómo usar este documento**

1. Prepare el entorno (sección 1) y verifique las comprobaciones previas.
2. Lea el mapa de roles (sección 2) para saber qué cuenta usar.
3. Ejecute los escenarios de la sección 3 **en el orden indicado** (siguen la vida real de un paciente). Cada escenario depende del anterior.
4. Ejecute los casos transversales (sección 4) y registre todo en la hoja de hallazgos (sección 6 y `registro-de-hallazgos.csv`).
5. Al final, complete el criterio go/no-go (sección 7).
6. Lea antes la sección 9 «Hallazgos previos»: son defectos que ya se detectaron al preparar esta guía; confírmelos durante la prueba.

**Convenciones**

- «Resultado esperado» describe lo que debe verse. Los textos entre comillas son los textos reales de la interfaz.
- **no verificado** = el dato proviene de leer el código o la documentación y no se ejecutó el sistema; confírmelo.
- `ENC-0004` etc. son los identificadores que se esperan en una base recién sembrada. Si el suyo difiere, use el que muestre el sistema.
- Las cuentas demo son `{rol}@vitalsy.local` con la contraseña `DEMO_PASSWORD` de su `.env`.

---

## 1. Preparación del entorno

### 1.1 Requisitos

| Requisito | Detalle |
|---|---|
| Docker Desktop | Con Docker Compose v2 (`docker compose`). |
| Puertos libres | 8080 (Nginx), 8443 (HTTPS dev), 8000 (API directa), 5432 (PostgreSQL). El 80 se deja a XAMPP. |
| Navegador | Chrome o Edge reciente (y Firefox/Safari para el caso de compatibilidad). |
| PHP 8.2 local | Opcional; solo para `key:generate --show` (hay alternativa sin PHP). |
| Memoria | El primer arranque instala dependencias (Composer y npm): puede tardar varios minutos. |

### 1.2 Archivo `.env` (raíz del repositorio)

1. Copie la plantilla: `copy .env.example .env` (PowerShell) o `cp .env.example .env`.
2. Edite estas variables (el resto de la plantilla puede quedar igual):

| Variable | Qué poner | Nota |
|---|---|---|
| `APP_KEY` | Resultado completo de `php artisan key:generate --show` (formato `base64:...`). | Sin PHP local: `docker run --rm php:8.2-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)), PHP_EOL;"`. Es obligatoria: el compose la pasa a backend y reverb. |
| `POSTGRES_PASSWORD` | Una contraseña (ej. `Clave-Postgres-2026`). | La usa el contenedor de PostgreSQL. |
| `DB_PASSWORD` | **El mismo valor** que `POSTGRES_PASSWORD`. | El compose los lee por separado; si difieren, el backend no conecta. |
| `DEMO_PASSWORD` | Contraseña de las cuentas demo (ej. `Demo-Vitalsy-2026`). | Si queda vacía **no se crea ninguna cuenta demo** (el seeder lo omite). |
| `POSTGRES_DB` / `DB_NAME` | `mi_db` (valor por defecto). | Mantenga ambos iguales. |
| `POSTGRES_USER` / `DB_USER` | `postgres` (valor por defecto). | Mantenga ambos iguales. |
| `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` | Pueden quedar los de la plantilla (`vitalsy`, `vitalsy-local-key`, `vitalsy-local-secret`). | Solo desarrollo; en producción deben ser aleatorios. |

Variables de la plantilla **sin efecto** en el compose de desarrollo: `NGINX_PORT`, `APP_PORT`, `FRONTEND_PORT`, `PORT` (los puertos publicados son fijos: 8080/8443/8000/5432). Ver hallazgo HP-09.

### 1.3 Certificados de desarrollo (si faltan)

Nginx escucha también en 443 (publicado como 8443) y exige `docker/nginx/certs/dev.crt` y `dev.key`; esos archivos **no se versionan**. Si la carpeta solo contiene `.gitkeep`:

```
bash docker/nginx/generate-dev-certs.sh
```

(requiere `openssl`; en Windows use Git Bash). Sin los certificados el contenedor `nginx` no arranca (ver HP-10).

### 1.4 Levantar el sistema

```
docker compose up --build
```

Servicios que levanta el compose de desarrollo: `nginx`, `frontend` (Vite), `backend` (`php artisan serve`), `reverb` (WebSocket) y `postgres`. **Reverb sí se levanta en desarrollo**: Nginx enruta `/app/` hacia él y la web recibe alertas en tiempo real. No hay contenedor de planificador (ver 1.8).

Espere hasta ver en el log del backend: «Esperando PostgreSQL…», luego «Instalando dependencias de Composer…», las migraciones y finalmente el servidor sirviendo en el puerto 8000. El primer arranque es lento; el frontend compila al primer acceso.

### 1.5 Migraciones y datos demo

El `dev-entrypoint.sh` del backend ejecuta automáticamente, en cada arranque:

```
php artisan migrate --force
php artisan db:seed --force
```

`db:seed` ejecuta `DatabaseSeeder`, que: crea una cuenta por rol (`{rol}@vitalsy.local`), siembra `CatalogSeeder` y `DemoInfrastructureSeeder` (4 pabellones y ~34 camas con variedad de género y aislamiento; si el administrador borró algo, no se resucita), siembra 3 ingresos demo si no hay ninguno y `DemoPeopleSeeder` (22 personas con nombre y un escenario de relevo de turno).

Comandos manuales (por si hace falta repetir):

```
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force
```

**Si actualiza desde una versión anterior** (después de `git pull` en `dev`): para la infraestructura de camas (RF-110–112) ejecute también `docker compose exec backend php artisan migrate --force` y `docker compose exec backend php artisan db:seed --force` (carga ~34 camas demo; no resucita lo borrado); reconstruya las imágenes con `docker compose up --build` (la imagen del backend ahora incluye `pcntl`, necesaria para que `reverb` arranque) y ejecute `docker compose exec backend php artisan migrate --force` (nueva columna `author_user_id` en `vital_sign_readings`, RF-26). Los ingresos de demostración ENC-0001 a ENC-0003 no tienen cama del censo asignada: si va a firmar su consentimiento, asígneles primero una cama en `/camas` (HP-07).

**Reinicio total de datos** (borra todo, solo para pruebas): `docker compose down -v` y luego `docker compose up --build`. No use `migrate:fresh` si desea conservar datos.

**Datos sembrados reales**

| Tipo | Contenido |
|---|---|
| Cuentas por rol (15) | `admision@`, `camillero@`, `enfermera_piso@`, `auxiliar_enfermeria@`, `medico_residente@`, `medico_tratante@`, `enfermera_supervisora@`, `equipo_respuesta_rapida@`, `trabajo_social@`, `altas_caja@`, `gestion_camas@`, `servicios_generales@`, `jefatura_enfermeria@`, `recursos_humanos@`, `administrador_accesos@` (todas `@vitalsy.local`). |
| Personas con nombre (22) | `rosa.quispe`, `lucia.mendoza`, `carmen.huaman`, `patricia.salas`, `elena.vargas`, `mariela.torres` (enfermeras de piso); `andres.castillo`, `valeria.nunez` (residentes); `ricardo.paredes`, `sofia.landa` (tratantes); `jorge.ramos` (auxiliar); `diana.flores` (admisión); `marco.rivas` (camillero); `teresa.ibanez` (supervisora); `alvaro.guerra` (ERR); `claudia.rojas` (trabajo social); `hugo.palacios` (altas/caja); `natalia.cruz` (gestión de camas); `pedro.ccori` (servicios generales); `gloria.valdivia` (jefatura); `monica.aguilar` (RR. HH.); `ivan.salazar` (administrador). Todas `@vitalsy.local`. |
| Ingresos demo | `ENC-0003` Carmen Yolanda Vega (DNI 09881234, cobertura rechazada, paso «derivacion»); `ENC-0002` Luis Ernesto Paredes (DNI 40112233, cobertura pendiente, paso «cobertura»); `ENC-0001` Ana María Quispe Rojas (DNI 45678912, hab. 312-B, brazalete `BRZ-0001-ANA`, traslado `OT-2026-0001`, paso «traslado»). |
| Ingresos de práctica de relevo | `ENC-PRAC-1` Beatriz Alvarado Núñez (NEWS2 8), `ENC-PRAC-2` Fernando Ugarte Salas (NEWS2 3), `ENC-PRAC-3` Isabel Cáceres Montes (NEWS2 0); hospitalizados, hab. 301/302. |
| Pabellones y camas | `MED-A` Medicina Interna A: 101-A (mixta), 101-B (mixta), 102-A (femenino), todas disponibles. `CIR-B` Cirugía B: 201-A (masculino, disponible), 201-B (masculino, aislamiento, **bloqueada**), 202-A (mixta, **en limpieza**). |
| Relevo de turno | Rosa Quispe termina turno **15 minutos después de sembrar**; Lucía Mendoza entra a continuación (Medicina Interna A). La ventana de entrega dura unas 3 horas desde la siembra. Para repetirla: `docker compose exec backend php artisan db:seed --force`. |

### 1.6 Comprobaciones previas (antes de empezar)

| # | Comprobación | Cómo | Resultado esperado |
|---|---|---|---|
| P-1 | Contenedores arriba | `docker compose ps` | `nginx`, `frontend`, `backend`, `reverb`, `postgres` en estado `running`. |
| P-2 | Salud de la API | Abra `http://localhost:8080/api/health` | JSON `{"status":"ok","db":"ok"}` (HTTP 200). Con BD caída: `{"status":"degraded","db":"fail"}` (503). |
| P-3 | Carga del login | Abra `http://localhost:8080` | Pantalla con «Vitalsy», «Gestión clínica hospitalaria», «Iniciar sesión», campos «Correo» y «Contraseña», botón «Entrar». |
| P-4 | Login de prueba | `admision@vitalsy.local` + su `DEMO_PASSWORD` | Entra a «Inicio» con la cola de trabajo de Admisión. |
| P-5 | Datos sembrados | Con `admision@` abra **Pacientes** | Aparecen los ingresos demo (Carmen, Luis, Ana y los de práctica). |
| P-6 | Tiempo real | Con cualquier cuenta, en las herramientas de desarrollo > Red > WS, verifique conexión a `/app/vitalsy-local-key` | Conexión WebSocket abierta (101). Si falla, vea 1.8. |

### 1.7 Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `nginx` sale al arrancar | Faltan `dev.crt`/`dev.key` | Ejecute 1.3 y `docker compose up -d --force-recreate nginx`. |
| `backend` reinicia con error de conexión | `DB_PASSWORD` ≠ `POSTGRES_PASSWORD`, o volumen con contraseña anterior | Iguale ambas; si el volumen ya existe con otra clave: `docker compose down -v` y vuelva a levantar. |
| «No application encryption key» / errores 500 | `APP_KEY` vacía o mal copiada | Regenere con 1.2 y recree: `docker compose up -d --force-recreate backend reverb`. |
| Login rechaza todas las cuentas | `DEMO_PASSWORD` vacía al sembrar | Defínala y ejecute `docker compose exec backend php artisan db:seed --force`. |
| `/api/health` responde 503 | PostgreSQL no listo o credenciales | Revise `docker compose logs postgres backend`. |
| Pantalla en blanco o 502 en 8080 | Frontend aún compilando o backend sin arrancar | Espere y revise `docker compose logs frontend backend`. |
| Muchos «429 Too Many Requests» al iniciar sesión | El login limita a 10 intentos por minuto | Espere un minuto. |
| La cámara no abre al escanear | Navegador sin HTTPS fuera de `localhost` | Use `http://localhost:8080` en el PC; en otro equipo, `https://<IP>:8443` (acepte el certificado). Siempre puede **escribir** el código. |

### 1.8 Tiempo real, planificador y lo que no se puede verificar en local

- **Tiempo real (RNF-01/RNF-12).** Reverb corre en el compose. Con la conexión abierta, la bandeja se refresca por evento; si el WebSocket cae, la web sondea cada 15 s (con conexión, cada 60 s). Para verificar las alertas sin depender del WebSocket, abra **Alertas** y observe que una alerta nueva aparece en ≤ 15 s sin recargar; para confirmar el empuje, bloquee `/app` en el navegador y compare. La latencia ≤ 2 s extremo a extremo y la reconexión ≤ 5 s tras perder señal **no son verificables de forma concluyente en local** (la propia documentación lo declara pendiente de staging).
- **Planificador (SLA).** El escalamiento por vencimiento (RF-45, RF-48) y las alertas por control o dosis vencidos (RF-32/42) las ejecuta `alerts:process-slas`, programado «cada minuto» en el código pero **ningún contenedor del compose ejecuta el planificador** (ver HP-01). Para las pruebas ejecútelo a mano:

```
docker compose exec backend php artisan alerts:process-slas
```

  Devuelve una línea con los contadores («Escalamientos de enfermería: …»). Alternativa: dejar `docker compose exec backend php artisan schedule:work` corriendo en otra terminal.
- **No verificable localmente:** TLS 1.3 real (RNF-05, requiere dominio y certificados; el compose de desarrollo admite TLS 1.2+1.3), disponibilidad 99,9 % (RNF-11), recuperación ante desastres (RNF-13), carga de 200 usuarios (RNF-04), integración real con LIS/PACS (solo hay *stubs*), compatibilidad Safari sin equipo Apple.

### 1.9 Simular una cuenta de Vitalsy Life por API (solo si va a probar la vinculación)

El escenario E1c necesita un código `VL-XXXX-XXXX`. Sin usar la app móvil, créelo con la API ciudadana (PowerShell):

```
$b="http://localhost:8080/api/v1/life"
$r=Invoke-RestMethod "$b/auth/register" -Method Post -ContentType "application/json" -Body '{"name":"Rosa Delgado Ruiz","email":"life.p4@correo.pe","password":"Clave-segura-9"}'
$h=@{Authorization="Bearer $($r.token)"}
Invoke-RestMethod "$b/consent" -Method Put -Headers $h -ContentType "application/json" -Body '{"sharingEnabled":true}'
$s=1..10|%{@{id="hr-$_";kind="heart_rate";value=60+$_;unit="bpm";startedAt=(Get-Date).AddDays(-$_).ToUniversalTime().ToString("o");endedAt=(Get-Date).AddDays(-$_).AddMinutes(1).ToUniversalTime().ToString("o");origin="manual"}}
$body=@{items=@(@{id="bio-1";kind="biometrics";status="pending";body=($s|ConvertTo-Json -Compress)})}|ConvertTo-Json -Depth 6
Invoke-RestMethod "$b/sync" -Method Post -Headers $h -ContentType "application/json" -Body $body
(Invoke-RestMethod "$b/link-codes" -Method Post -Headers $h).code
```

- Resultado esperado: `accepted` contiene `bio-1` y el último comando imprime un código `VL-XXXX-XXXX`. **Vence a los 30 minutos y es de un solo uso**: genérelo justo antes del paso E1c-04. (Forma exacta de la muestra tomada de `LifeEndToEndTest`; si `accepted` viene vacío, revise `rejected[].reason`.)
- El rango se calcula con ≥ 7 días de historia útil, por eso se envían 10 días.

---

## 2. Mapa de roles y pantallas

### 2.1 Los 15 roles

El catálogo es idéntico en `RoleCatalog.php` y `roles.ts`. El menú lateral se filtra por rol (`navigation.tsx`). **«Inicio»** (`/`) está disponible para todos.

| Rol (clave) | Etiqueta | Cuenta | Menú lateral (además de Inicio) |
|---|---|---|---|
| `admision` | Admisión | `admision@` | Pacientes, Registrar ingreso |
| `camillero` | Celador / Camillero | `camillero@` | Pacientes, Egreso |
| `enfermera_piso` | Enfermera de piso | `enfermera_piso@` | Pacientes, Expediente clínico, Laboratorio, Imágenes, Constantes, Controles, e-MAR, Cuidados, Alertas, Registrar deterioro, Egreso, Turnos y cobertura |
| `auxiliar_enfermeria` | Auxiliar de enfermería | `auxiliar_enfermeria@` | Pacientes, Expediente clínico, Constantes, Controles, Cuidados, Alertas, Registrar deterioro, Limpieza |
| `medico_residente` | Médico residente | `medico_residente@` | Pacientes, Expediente clínico, Visita médica, Laboratorio, Imágenes, Evolución médica, Alertas, Egreso |
| `medico_tratante` | Médico tratante | `medico_tratante@` | Igual que residente **más** CPOE |
| `enfermera_supervisora` | Enfermera supervisora de piso | `enfermera_supervisora@` | Pacientes, Controles, Alertas, Registrar deterioro, Censo de camas, Limpieza, Turnos y cobertura |
| `equipo_respuesta_rapida` | Equipo de Respuesta Rápida | `equipo_respuesta_rapida@` | Pacientes, Alertas |
| `trabajo_social` | Trabajo social | `trabajo_social@` | Pacientes, Egreso |
| `altas_caja` | Altas / Caja | `altas_caja@` | Pacientes, Egreso |
| `gestion_camas` | Gestión de camas | `gestion_camas@` | Censo de camas |
| `servicios_generales` | Servicios generales / Limpieza | `servicios_generales@` | Limpieza |
| `jefatura_enfermeria` | Jefatura de enfermería | `jefatura_enfermeria@` | Turnos y cobertura |
| `recursos_humanos` | Recursos humanos | `recursos_humanos@` | Turnos y cobertura |
| `administrador_accesos` | Administrador de accesos | `administrador_accesos@` | Usuarios, Infraestructura de camas |

Rutas del menú: Pacientes `/pacientes`; Registrar ingreso `/pacientes/nuevo`; Expediente clínico `/atencion/chart`; Visita médica `/atencion/visita`; Laboratorio `/atencion/laboratorio`; Imágenes `/atencion/imagenes`; Evolución médica `/atencion/evolucion`; CPOE `/atencion/cpoe`; Constantes `/atencion/constantes`; Controles `/atencion/controles`; e-MAR `/atencion/emar`; Cuidados `/atencion/cuidados`; Alertas `/alertas`; Registrar deterioro `/alertas/deterioro`; Egreso `/egreso`; Censo de camas `/camas`; Limpieza `/camas/limpieza`; Turnos y cobertura `/personal`; Usuarios `/usuarios`.

Pantallas del ingreso (se abren desde «Continuar» en el censo, con `?ingreso=ENC-xxxx`): `/admision/orden`, `/admision/filiacion`, `/admision/cobertura`, `/admision/cobertura/derivacion`, `/admision/brazalete`, `/admision/expediente`, `/admision/consentimiento` (admisión); `/traslado/orden`, `/traslado/identidad` (camillero); `/piso/recepcion`, `/piso/reubicacion`, `/enfermeria/valoracion`, `/enfermeria/constantes`, `/enfermeria/conciliacion`, `/enfermeria/riesgos`, `/enfermeria/kardex` (enfermera de piso; constantes también auxiliar); `/medico/indicaciones` (residente o tratante).

### 2.2 Permisos negativos (lo que NO debe poder)

Haga cada prueba de dos maneras: (a) escribiendo la URL en el navegador con la sesión del rol indicado; (b) cuando sea posible, por API (el servidor debe responder **403** «No tiene permiso para esta acción.»). En la web, una ruta de otro perfil muestra: «Esta vista no está disponible para su perfil. Se requiere …». Sin sesión: solo se ve «Iniciar sesión» (API: 401 «Debe iniciar sesión para continuar.»).

| ID | Cuenta | Intento | Resultado esperado |
|---|---|---|---|
| N-01 | `admision@` | Abrir `/atencion/cpoe`, `/atencion/emar`, `/egreso`, `/camas` | Mensaje «Esta vista no está disponible para su perfil». |
| N-02 | `camillero@` | Abrir `/pacientes/nuevo` y `/admision/consentimiento` | Mensaje de vista no disponible. |
| N-03 | `auxiliar_enfermeria@` | Abrir `/atencion/emar` y `/atencion/cpoe` | Vista no disponible (e-MAR solo enfermera de piso; CPOE solo tratante). |
| N-04 | `medico_residente@` | Abrir `/atencion/cpoe` | Vista no disponible (solo `medico_tratante`). |
| N-05 | `medico_tratante@` | Abrir `/atencion/emar` | Vista no disponible. |
| N-06 | `enfermera_piso@` | Abrir `/camas`, `/usuarios`, `/atencion/cpoe` | Vista no disponible. |
| N-07 | `enfermera_supervisora@` | Abrir `/egreso` | Vista no disponible. |
| N-08 | `trabajo_social@` | Abrir `/pacientes/nuevo`, `/atencion/chart` | Vista no disponible. |
| N-09 | `gestion_camas@` | Abrir `/pacientes`, `/camas/limpieza` | Vista no disponible. |
| N-10 | `servicios_generales@` | Abrir `/camas`, `/alertas` | Vista no disponible. |
| N-11 | `recursos_humanos@` | Abrir `/personal` y en ella intentar publicar rol | La pantalla abre (consulta y autoriza cobertura) pero **no** muestra «Publicar rol mensual oficial»; por API `POST /api/v1/staff/shift-plans` → 403. |
| N-12 | `jefatura_enfermeria@` | Intentar «Registrar inasistencia» o asignar | No visible; por API `POST /api/v1/staff/absences` → 403. |
| N-13 | Cualquier rol salvo `administrador_accesos` | Abrir `/usuarios`; API `GET /api/v1/users` | Vista no disponible / 403. |
| N-14 | `equipo_respuesta_rapida@` | Registrar constantes o confirmar recepción de alerta de enfermería | Sin acceso a «Constantes»; por API `POST …/vital-signs` → 403. |
| N-15 | `enfermera_piso@` | Emitir pase de salida (`POST /api/v1/discharge/encounters/{id}/exit-pass`) | 403 (solo `altas_caja`). |
| N-16 | `altas_caja@` | Registrar salida efectiva (`POST …/exit`) | 403 (solo `enfermera_piso`). |
| N-17 | `administrador_accesos@` | Abrir `/pacientes`, `/alertas`; intentar API clínica | Vista no disponible / 403. Ningún rol (ni el administrador) puede editar o borrar historial de alertas (no existen rutas PUT/PATCH/DELETE). |
| N-18 | Cuenta desactivada | Iniciar sesión | «El correo o la contraseña no son correctos.» (la cuenta inactiva no entra). |
| N-19 | Cuenta con contraseña temporal | Llamar a la API clínica antes de cambiarla | 403 «Debe cambiar la contraseña temporal para continuar.»; en la web solo se muestra la pantalla de cambio de contraseña. |

*Cómo hacer (b) sin herramientas:* inicie sesión en la web, abra las herramientas de desarrollo > Consola y ejecute, por ejemplo, `fetch('/api/v1/users',{credentials:'include'}).then(r=>r.status)`. Para métodos POST se necesita el token XSRF; si no lo domina, registre solo la parte (a) y marque (b) como «no ejecutado».

---
## 3. Escenarios de punta a punta

Los pacientes de prueba P1–P5 y sus datos completos están en la sección 5. Use una ventana de navegador por rol (o cierre sesión entre roles; recuerde que la sesión caduca a los 5 minutos de inactividad).

Orden de ejecución recomendado: **E0 → E1 (P1) → E1b → E1 (continuación) → E1c → E1d (P2–P5 rápido) → E2 → E3 → E4 → E5 → E6 → E7.** Si dispone de poco tiempo, ejecute E0, E1, E2, E3 y E4 con P1/P2; el resto con los datos demo sembrados.

### E0. Acceso y sesión (RF-99, RF-100, RNF-08, RNF-09)

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E0-01 | Sin sesión · `/` | Pulse «Entrar» con ambos campos vacíos. | Errores «El correo es obligatorio.» y «La contraseña es obligatoria.»; no hay llamada al servidor. |
| E0-02 | Sin sesión · `/` | Correo `admision`, contraseña `x`. | «Ingrese un correo válido.» |
| E0-03 | Sin sesión · `/` | Correo `admision@vitalsy.local`, contraseña `incorrecta123`. | Mensaje «El correo o la contraseña no son correctos.» |
| E0-04 | Sin sesión · `/` | Pulse el ojo «Mostrar contraseña» y luego «Ocultar contraseña». | La contraseña alterna entre visible y oculta. |
| E0-05 | `admision@` · `/` | Correo `admision@vitalsy.local` + `DEMO_PASSWORD`; «Entrar». | Entra a «Inicio»: texto de ayuda de Admisión, tarjetas «Pacientes en turno», «Controles vencidos», «Alertas abiertas», «Dosis e-MAR vencidas» y bloque «Cola de trabajo». |
| E0-06 | `admision@` | Cierre sesión (botón de salida del encabezado). Pulse «atrás» del navegador. | Vuelve a «Iniciar sesión»; no se muestran datos clínicos. (RF-100) |

**Siguiente paso:** E1-01.

### E1. Módulo 1 — Admisión y recepción (P1 «Mateo Gonzales Rivera», caso normal)

Flujo lineal por rol (stepper): orden → filiación → cobertura → brazalete → expediente → consentimiento (Admisión) → traslado → identidad (Camillero) → recepción → valoración → constantes → conciliación → escalas → Kardex (Enfermera de piso) → indicaciones (Médico).

**A. Admisión (`admision@`)**

| Paso | Ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E1-01 | `/pacientes/nuevo` («Registrar ingreso») | Pulse «Registrar» con todo vacío. | Errores: «El número de orden es obligatorio.», «El nombre del paciente es obligatorio.», «El documento es obligatorio.», «El plan de cobertura es obligatorio.» No navega. |
| E1-02 | igual | En «Documento de identidad» escriba `71A23-4501`. | El campo solo conserva dígitos: `712345` (se filtra al escribir; máximo 12). |
| E1-03 | igual | Complete: Número de orden `OI-2026-0101`; Documento `71234501`; Nombre `Mateo Gonzales Rivera`; Servicio de origen `Emergencia adultos`; Pagador `SIS`; Estado de cobertura `Aprobada`; Plan `SIS Gratuito`; Motivo `Neumonía adquirida en la comunidad`. «Registrar». | Navega a `/admision/orden?ingreso=ENC-0004` (el número puede variar). El ingreso queda en el paso «orden». |
| E1-04 | `/admision/orden` | «Consultar orden». | Muestra Número, Origen, Médico solicitante («No indicado»), Motivo, Paciente (`Mateo Gonzales Rivera · DNI 71234501`), Cobertura. |
| E1-05 | igual | «Imprimir orden». | Se abre el diálogo de impresión con el título «Orden de internamiento» y los mismos datos. Cancele. |
| E1-06 | igual | «Confirmar orden». | «Orden confirmada.» Aparece «Continuar al siguiente paso». Púlselo. |
| E1-07 | `/admision/filiacion` | Deje la fecha vacía y pulse «Validar filiación». | «La fecha de nacimiento es obligatoria.» y «Confirme que los datos coinciden con la orden.» |
| E1-08 | igual | Fecha de nacimiento `1985-03-14`; marque «Confirmo que los datos coinciden con el documento presentado»; «Validar filiación». | «Filiación validada.» El botón queda deshabilitado; «Continuar al siguiente paso». |
| E1-09 | `/admision/cobertura` | Con estado «Aprobada» pulse «Registrar cobertura». | «Cobertura registrada. Puede continuar con el brazalete.» Sello «Aprobada», «Vigente». |
| E1-10 | `/admision/brazalete` | «Emitir brazalete». | «Brazalete emitido.» Se muestra el código `BRZ-0004-MGR` (BRZ + número del ingreso + iniciales de hasta 3 palabras, siempre en ASCII: «Á» se escribe «A» y «Ñ» «N», porque Code 128 no admite tildes) con código de barras. «Imprimir código de barras» abre impresión. |
| E1-11 | `/admision/expediente` | «Aperturar expediente». | «Expediente abierto correctamente. Identificador EXP-0004.» Ubicación «Pendiente de asignación» (no hay cama aún). |

**Siguiente paso:** **E1b (asignar cama) antes del consentimiento — obligatorio.** El sistema rechaza el consentimiento (422) si el ingreso no tiene una cama del censo M5 asignada (HP-07, corregido).

#### E1b. Asignación de cama (Módulo 5 — RF-68, RF-72, RF-73)

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E1b-01 | `gestion_camas@` · `/camas` | Pulse «Nueva solicitud». | Se abre el cajón «Nueva solicitud de cama». |
| E1b-02 | igual | Paciente: escriba `Mateo` y elija el resultado; Especialidad `Medicina interna`; Género `Masculino`; Aislamiento `Ninguno (cama convencional)`. «Registrar solicitud». | «Solicitud de cama registrada. Aparece en la lista de espera priorizada.» La solicitud figura en la lista de espera. |
| E1b-03 | igual | Intente enviar otra solicitud sin paciente ni especialidad. | «Seleccione al paciente o escriba su nombre.», «Indique la especialidad que requiere.», «Indique el género del paciente.» |
| E1b-04 | igual | En la solicitud de Mateo pulse «Asignar lecho compatible» y luego «Confirmar asignación». | «Lecho 101-A asignado a Mateo Gonzales Rivera. Notificada a la enfermera supervisora.» (el lecho sugerido puede ser 101-B). El lecho pasa a ocupado. |
| E1b-05 | `enfermera_supervisora@` · `/camas` | En el panel de notificaciones pulse «Confirmar recepción». | «Asignación confirmada.» |

**Siguiente paso:** vuelva a Admisión y continúe en E1-12.

**B. Admisión — consentimiento**

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E1-12 | `admision@` · `/admision/consentimiento` | «Registrar consentimiento» sin datos. | «El nombre de quien firma es obligatorio.» y «Debe aceptar el consentimiento informado.» |
| E1-13 | igual | Nombre `Mateo Gonzales Rivera`; Relación `Titular / propio paciente`; marque el consentimiento; **deje desmarcado** «El paciente es usuario de la app Vitalsy Life». | Aparece la nota «Si se desmarca: el ingreso continúa sin vincular la línea de base domiciliaria.» |
| E1-14 | igual | «Imprimir consentimiento físico». | Abre impresión con paciente, firmante, relación y declaración. Cancele. |
| E1-15 | igual | «Registrar consentimiento». | «Consentimiento firmado.» El ingreso pasa al Camillero. |

**C. Camillero (`camillero@`)**

| Paso | Ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E1-16 | `/pacientes` | Busque `Mateo` y pulse «Buscar»; luego «Continuar» en su fila. | Abre `/traslado/orden?ingreso=ENC-0004` con «Número de traslado» precargado (`OT-<año>-000N`). |
| E1-17 | `/traslado/orden` | «Consultar traslado». | Muestra Habitación 101, lecho A y servicio «Medicina Interna A» (formato exacto del texto: no verificado). |
| E1-18 | igual | «Confirmar traslado». | «Traslado confirmado.» Continuar. |
| E1-19 | `/traslado/identidad` | El código aparece precargado `BRZ-0004-MGR`. Pulse «Verificar brazalete». | «Identidad confirmada: Mateo Gonzales Rivera.» El ingreso pasa a la enfermera de piso. |
| E1-20 | igual (**prueba de seguridad**) | En otro ingreso en paso «identidad» (use P2 más adelante), escriba el código `BRZ-0001-ANA` (de otra paciente) y verifique. | **Esperado:** rechazo con «El brazalete no corresponde al paciente del ingreso abierto.»; el ingreso no avanza (HP-02, corregido). Si aparece «Identidad confirmada: Ana María Quispe Rojas.», registre un hallazgo bloqueante. |
| E1-21 | igual | Escriba un código inexistente `BRZ-9999-XXX`. | «El código no corresponde al paciente.» |
| E1-22 | igual | «Escanear brazalete» (si hay cámara). | Abre el lector; al leer un código válido confirma sin segundo clic (RF-08). Con `localhost` la cámara está permitida. |

**D. Enfermera de piso (`enfermera_piso@`)**

| Paso | Ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E1-23 | `/piso/recepcion` | Revise «Ubicación y parámetros de internación»; «Confirmar recepción». | Mensaje de éxito de recepción; estado «Ingresado». |
| E1-24 | `/piso/reubicacion` (enlace «Registrar reubicación») | Sin datos pulse «Notificar reubicación». Luego Motivo `Cama asignada ocupada`, Lecho disponible `102-A`, «Notificar reubicación». | Errores «El motivo de la discrepancia es obligatorio.» / «Elija un lecho disponible del censo.»; luego «Reubicación notificada a la central. Habitación 102, lecho A.» **Aviso:** esto modifica habitación/lecho del ingreso; para mantener 101-A en el resto de la prueba use P3 aquí o no la ejecute con P1. |
| E1-25 | `/enfermeria/valoracion` | «Guardar valoración» vacío. | «El motivo de consulta es obligatorio.» y «Los antecedentes son obligatorios.» |
| E1-26 | igual | Motivo `Tos, fiebre y disnea de 3 días`; Antecedentes `Hipertensión arterial controlada`; marque «Ninguna otra conocida.» (sin alergias); «Guardar borrador» (aviso «Borrador guardado en este equipo.») y «Guardar valoración». | «Valoración registrada.» |
| E1-27 | `/enfermeria/constantes` | Escriba FR `16`, SpO2 `97`, PA `120`/`80`, Pulso `72`, Temp `36.8`; Escala 1; Aire ambiente; Conciencia `Alerta`. «Registrar constantes». | Banner NEWS2 verde (0). «Constantes registradas.» No aparece aviso de alerta. |
| E1-28 | igual | Antes, pruebe límites: FR `3`, SpO2 `49`, Temp `44`. | «La frecuencia respiratoria no es posible. Revise la medición.», idem saturación y temperatura (rangos: FR 4–60, SpO2 50–100, PAS 40–280, PAD 30–160, pulso 20–250, temp 30–43). |
| E1-29 | `/enfermeria/conciliacion` | Agregue medicamento: `Metformina`, `850 mg`, `cada 12 horas`, Vía `Oral`, «Agregar medicamento»; Alergias vacío; «Registrar conciliación». | Estado «Validada». |
| E1-30 | `/enfermeria/riesgos` | Morse: caídas No, diagnóstico secundario No, ayuda Ninguna, IV No, marcha Normal, estado mental «Conoce sus límites». Braden: todas las subescalas en el máximo (4; fricción 3). «Registrar escalas». | Morse 0 «Riesgo bajo de caídas»; Braden 23 «Sin riesgo actual de úlceras por presión»; «Escalas registradas.» |
| E1-31 | `/enfermeria/kardex` | Revise las 5 secciones; «Confirmar revisión del Kardex». | «Kardex revisado.» Pasa al médico. |

**E. Médico (`medico_residente@`)**

| Paso | Ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E1-32 | `/medico/indicaciones` | Revise «Revisión de enfermería» (motivo, alergias). Pulse «Firmar indicaciones» sin completar. | El botón permanece deshabilitado hasta marcar la confirmación y tener ≥ 1 indicación; mensajes «Debe registrar al menos una indicación.», «El nombre del médico es obligatorio.», «La colegiatura es obligatoria.», «Debe confirmar la firma de las indicaciones.» |
| E1-33 | igual | «Editar prescripciones» → «Agregar indicación»: Categoría `Dieta`, Detalle `Dieta blanda hiposódica`; «Listo». Nombre del médico `Andrés Castillo Ortiz`; Colegiatura `CMP 045678`; marque la confirmación; «Firmar indicaciones». | Estado «Firmado». El ingreso queda **cerrado/hospitalizado** y la firma crea el plan CPOE basal con Metformina. |

**Resultado final E1:** ENC-0004 aparece en Pacientes como hospitalizado con botón «Atención». **Siguiente paso:** E1c.

#### E1c. Cobertura pendiente/rechazada y vinculación Vitalsy Life (P4 «Rosa Delgado Ruiz»)

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E1c-01 | `admision@` · `/pacientes/nuevo` | Orden `OI-2026-0104`; DNI `71234504`; Nombre `Rosa Delgado Ruiz`; Origen `Consulta externa`; Pagador `EsSalud`; Estado `Pendiente de verificación`; Plan `Regular`. «Registrar». | Ingreso nuevo en paso «orden». Confirme orden y valide filiación (fecha `1990-07-02`). |
| E1c-02 | `/admision/cobertura` | Estado `Pendiente`; «Registrar cobertura». | «Cobertura registrada. Derive el trámite (caja o trabajo social) antes de continuar la admisión.» Banner «Validación requerida» con enlace «Derivar trámite». |
| E1c-03 | `/admision/cobertura/derivacion` | Destino `Trabajo social`; Nombre del familiar `Julia Ruiz`; Teléfono `91234567`; «Registrar derivación». Antes pruebe teléfono con letras `91AB` y `123`. | Letras filtradas; `123` → «El teléfono del familiar solo admite dígitos (7 a 15).»; válido → «Derivación registrada a trabajo social. El familiar queda notificado.» El ingreso queda «en trámite». |
| E1c-04 | `/admision/cobertura` | Cambie a `Aprobada` y «Registrar cobertura». | «Cobertura registrada. Puede continuar con el brazalete.» No se puede emitir brazalete mientras esté pendiente/rechazada. |
| E1c-05 | Admisión · brazalete y expediente | Emitir brazalete (`BRZ-0005-RDR`) y aperturar expediente. Luego **E1b** para P4 (Femenino → lecho 102-A o 101-B). | — |
| E1c-06 | Genere el código `VL-…` (sección 1.9). `/admision/consentimiento` | Firmante `Rosa Delgado Ruiz`; marque «El paciente es usuario de la app Vitalsy Life»; en «Código o QR de autorización» escriba `vl-` + el código en minúsculas. | El campo lo convierte a mayúsculas. Si el formato es inválido: «Formato VL-XXXX-XXXX». |
| E1c-07 | igual | «Registrar consentimiento». | «Línea de base importada» con la métrica `heart_rate` (rango bajo–alto y días). «Consentimiento firmado.» |
| E1c-08 | igual (negativo) | Con otro ingreso, repita el mismo código. | Mensaje de error y «Reintentar vinculación»; el ingreso continúa sin línea de base («El ingreso continúa sin la línea de base domiciliaria.»). Código consumido: `code_consumed`; vencido: `code_expired`. |
| E1c-09 | `enfermera_piso@` | Tras el ingreso de P4, consulte la línea de base (en el expediente, pestaña «Admisión»; por API `GET /api/v1/hospital-admission/encounters/ENC-0005/life-baseline`). | Muestra métricas importadas; sin nombre ni correo de la cuenta Life. |

**Siguiente paso:** E1d.

#### E1d. Ingreso rápido de P2, P3, P5

Repita los pasos E1-01 a E1-33 (con E1b antes del consentimiento) usando los datos de la sección 5.2 para P2, P3 y P5. Casos a vigilar:

- **P3 (alergia):** en la valoración registre la alergia `Penicilina` («Agregar alergia»); en la conciliación agregue `Amoxicilina`, `500 mg`, `cada 8 horas`, Vía `Oral`. Esperado: «Posible alergia: Amoxicilina coincide con alergia a penicilina.» y estado «Con observaciones»; el médico ve la alerta en la revisión de enfermería y las alergias en el Kardex.
- **P3 constantes basales con NEWS2 3** (FR 22, pulso 95): «Constantes registradas.» y aviso «Se activó una alerta clínica. Revísela en la campana o en la bandeja de alertas.»
- **P5:** mismo flujo; se usa en E4 para «rechaza Vitalsy Life».
- Todos al terminar deben figurar como hospitalizados.

**Siguiente paso:** E2.

---

### E2. Módulo 2 — Atención y seguimiento (RF-21 a RF-38; P1)

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E2-01 | `medico_tratante@` · `/pacientes` | Busque `Mateo`; pulse «Atención». | Abre el expediente `/atencion/chart?ingreso=ENC-0004` con pestañas Admisión, Constantes, Tratamiento, Paraclínicos, Evoluciones, Alertas. |
| E2-02 | `/atencion/cpoe` | Sin completar pulse «Registrar CPOE». Luego en «Nueva prescripción»: Medicamento `Paracetamol`, Dosis `500 mg`, Vía `VO`, Frecuencia `cada 8 horas`; «Registrar CPOE». | Primero «Complete medicamento, dosis, vía y frecuencia en cada línea.»; luego «Prescripción CPOE registrada. La enfermera verá las dosis en e-MAR del turno.» La tabla «Prescripción activa» muestra el código `DRUG-PARACETAMOL-500MG`. |
| E2-03 | igual | «Agregar medicamento al plan activo»: `Omeprazol`, `20 mg`, `VO`, `cada 24 horas`; «Agregar al plan». Luego edite (Guardar) y elimine (Eliminar) la línea. | «Medicamento agregado al plan activo.», «Medicamento actualizado.», «Medicamento eliminado del plan.»; el «Kardex electrónico» se actualiza. |
| E2-04 | `enfermera_piso@` · `/atencion/constantes` | Constantes normales: FR `16`, SpO2 `98`, PA `118`/`76`, Pulso `70`, Temp `36.6`, Alerta. «Registrar constantes». | NEWS2 0: «NEWS2 0. Próximo control: <fecha+12 h>.» La «Gráfica evolutiva» agrega un punto (RF-29, RF-31). |
| E2-05 | igual | Registre FR `22`, resto normal. | NEWS2 2 (banner amarillo): «Se activó el proceso de alertas (NEWS2 2).» y se crea una alerta (ver E3). |
| E2-06 | `enfermera_piso@` · `/atencion/emar` | Revise la tabla horaria. En una dosis pulse «Verificar y administrar» (o «Justificar / Administrar» si está vencida). | Panel «Verificación de Seguridad al Pie de Cama · 5 Correctos» con los dos campos de código **vacíos**: la pantalla ya no muestra los códigos esperados (HP-04, corregido). Para saber qué escanear: el brazalete es el código de `/admision/brazalete` (también en el censo); el medicamento es `DRUG-{NOMBRE}-{DOSIS}` en mayúsculas y sin espacios (lo muestra la tabla «Prescripción activa» del CPOE) y `php artisan emar:codes ENC-XXXX` (en el contenedor `backend`) lista ambos para un ingreso. |
| E2-07 | igual (negativo) | En «Código paciente (brazalete)» escriba `BRZ-0004-MGR` y en «Código medicamento» `DRUG-OTRO-1MG`; «Confirmar administración». | Bloqueado: «Los cinco correctos no coinciden. Administración bloqueada.» La dosis sigue pendiente. |
| E2-08 | igual | Escriba el código correcto del medicamento (p. ej. `DRUG-PARACETAMOL-500MG`); «Confirmar administración». | «Dosis administrada y firmada.» La dosis pasa a administrada y queda inmutable (RF-33/35). |
| E2-09 | `medico_residente@` · `/atencion/laboratorio` | «Integrar desde LIS». | «2 resultados integrados desde el LIS.»: «Hemoglobina 11.2 g/dL» y «Creatinina 0.9 mg/dL» (origen «Integración LIS / FHIR»; son datos *stub*). |
| E2-10 | `/atencion/imagenes` | «Integrar desde PACS». | «2 informes integrados desde el PACS.»: «Radiografía de tórax: sin consolidaciones» (RX) y «Ecografía abdominal: sin líquido libre» (ECO). |
| E2-11 | `/atencion/visita` | Abra la visita. | Tres bloques: Laboratorio, Imágenes y «Notas de enfermería del día» consolidados (RF-23). |
| E2-12 | `/atencion/evolucion` | Guarde vacío; luego nota `Paciente con mejoría clínica, afebril, tolera vía oral.`; «Registrar evolución». | «La nota de evolución es obligatoria.»; luego «Evolución registrada.»; la nota aparece en «Historial de notas anteriores». |
| E2-13 | `enfermera_piso@` · `/atencion/cuidados` | Pestaña Notas: nota `Hola` (4 caracteres) y luego `Paciente descansa, sin dolor.`; «Registrar nota». | «La nota debe tener al menos 5 caracteres.»; luego «Nota de enfermería registrada.» con autor y hora. |
| E2-14 | `auxiliar_enfermeria@` · `/atencion/cuidados` | Pestaña Actividades: elija `Higiene de manos / oral`; «Marcar finalizado». Pruebe «Otros» sin descripción. | «Cuidado directo registrado: Higiene de manos / oral.»; «Describa la actividad (mínimo 3 caracteres).» Filtre por «Hoy», «7 días», rango. (RF-37) |
| E2-15 | `auxiliar_enfermeria@` · `/atencion/constantes` | Registre constantes de P1 (FR `17`, SpO2 `97`, PA `120`/`80`, Pulso `74`, Temp `36.7`). | Registro exitoso. En `/atencion/chart` → pestaña «Constantes» → despliegue el día en «Lecturas por fecha»: la columna «Registró» muestra a la auxiliar (nombre · rol). Las lecturas anteriores a RF-26 muestran «—» (RF-26). |
| E2-16 | `medico_tratante@` · `/atencion/chart` | Recorra cada pestaña; en «Constantes» use el filtro de fechas. | Cada pestaña muestra los registros del paciente y su autor; el historial se agrupa por fecha (RF-38). |
| E2-17 | `enfermera_piso@` · `/atencion/controles` | Revise la bandeja. | Muestra el control programado de P1 con «Vence», paciente, ubicación, frecuencia y estado (RF-42). Pulse «Registrar control», complete constantes y «Confirmar control». |

**Siguiente paso:** E3.

---

### E3. Módulo 3 — Alertas (RF-39 a RF-53; P2 «Elena Cruz Huanca»)

Prepare dos navegadores (o perfiles): A = `enfermera_piso@`, B = `medico_residente@`. Mantenga el volumen del equipo audible.

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E3-01 | A · `/atencion/constantes?ingreso=<P2>` | FR `28`, SpO2 `89`, PA `85`/`50`, Pulso `135`, Temp `39.5`, O2 «Oxígeno suplementario», Conciencia `Responde a la voz`. «Registrar constantes». | NEWS2 **19**, banner rojo «Riesgo alto». «Se activó el proceso de alertas (NEWS2 19).» Alerta de severidad alta para la enfermera de piso. |
| E3-02 | A · cualquier pantalla | Observe el encabezado. | La campana muestra el conteo y suena la sirena continua; aparece un aviso emergente con «Abrir el evento». (RF-53) |
| E3-03 | A · `/alertas` | Revise «Por confirmar», «En seguimiento», «En bandeja». Pulse «Confirmar recepción». | «Confirmó la recepción de la alerta de Elena Cruz Huanca.» **La sirena se calla**, la alerta sigue abierta. |
| E3-04 | A · `/alertas/<id>` | Pestaña «Nueva toma / NEWS2»: ingrese constantes que sigan alteradas (FR `26`) y «Recalcular NEWS2». | «NEWS2 sigue alterado: se notificó automáticamente al médico de guardia.» |
| E3-05 | B · `/alertas` | Verá la alerta del médico (bandeja compartida residente/tratante). «Confirmar recepción». | Confirmación registrada con fecha y hora (RF-47); se calla su sirena. |
| E3-06 | B · detalle | Sin texto pulse «Registrar atención médica»; luego en «El paciente no se estabiliza» escriba `Persiste hipotensión e hipoxemia a pesar de O2.` y «Solicitar equipo de respuesta rápida». | «Registre la evaluación y las indicaciones de urgencia.»; luego «Se solicitó la intervención del equipo de respuesta rápida.» |
| E3-07 | `equipo_respuesta_rapida@` · `/alertas` | «Confirmar recepción»; en el evento: Evaluación `Paciente crítico, requiere soporte avanzado.`; marque «Requiere traslado a cuidados intensivos»; «Registrar evaluación del equipo». | «Se emitió la orden de UCI. Médico y enfermera deben autorizarla.» Estado «orden_uci»; el evento **no** se cierra. |
| E3-08 | B · detalle | «Autorizar traslado a UCI». | «Autorización de traslado a UCI registrada.» Falta la de enfermería. |
| E3-09 | A · detalle | «Autorizar traslado a UCI». | Autorizada por médico y enfermera: estado «uci_autorizada». |
| E3-10 | A (o `camillero@`, o supervisora) | Unidad/habitación UCI `UCI-1`, Lecho `01`; «Registrar traslado efectivo». | «Traslado efectivo a UCI registrado. La ubicación del ingreso se actualizó.» Estado «en_uci». |
| E3-11 | A | Servicio `Medicina interna`, Habitación `101`, Lecho `A`; «Registrar retorno a sala». | «Retorno a sala registrado. La alerta quedó cerrada con trazabilidad completa.» |
| E3-12 | A o B · `Historial del evento` | Revise la línea de tiempo. | Muestra, en orden, generación, confirmaciones, solicitud médica, ERR, autorizaciones, traslado y retorno, con usuario y hora. No hay botón de editar ni borrar (RF-52, RNF-07). |
| E3-13 | `auxiliar_enfermeria@` · `/alertas/deterioro` | Sin texto «Registrar deterioro»; luego `Paciente pálido, respiración rápida y somnoliento.`, Severidad `Alta`. | «Describa el deterioro observado.»; luego «Se registró el deterioro y se notificó a la enfermera de piso responsable.» (RF-40) |
| E3-14 | A · detalle de esa alerta | Pestaña «Deterioro / preocupación clínica»: Motivo `Preocupación por empeoramiento rápido.`; «Solicitar atención médica». | Sin motivo: «Indique por qué el caso requiere atención médica.»; luego «Se notificó a los médicos de guardia (residente y tratante). Campana y sirena hasta confirmar lectura.» (RF-43) |
| E3-15 | B | En esa alerta: Evaluación e Indicaciones de urgencia; «Registrar atención médica». | «Se registró la atención médica y se cerró el evento. Continuidad en sala.» |
| E3-16 | A · alerta nueva de P3 o P4 (sin confirmar) | **No confirme.** Espere 5 min y ejecute `docker compose exec backend php artisan alerts:process-slas`. Revise la bandeja de `enfermera_supervisora@`. | La alerta escala a la supervisora (RF-45); el comando informa «Escalamientos de enfermería: 1». Tras otros 5 min sin acuse y otra ejecución, pasa al médico (residente). |
| E3-17 | A · detalle de una alerta con NEWS2 0 | Registre constantes normales; en «Programar control (solo si NEWS2 = 0)» ingrese `15` minutos y «Programar control». | «Se programó el próximo control para <hora>. Consúltelo en Controles.» o se cierra la alerta. Minutos fuera de 15–1440: «Indique entre 15 y 1440 minutos.» |
| E3-18 | tras 15+ min | Ejecute `alerts:process-slas`. | El control vencido genera una alerta («Control vencido», origen `control`) con campana y sirena; se cierra al registrar el control en «Controles». (RF-42) |
| E3-19 | `enfermera_piso@` · e-MAR con dosis vencida | Espere la gracia de 30 min y ejecute `alerts:process-slas`. | Alerta por dosis e-MAR vencida (origen `emar`); se cierra al firmar la dosis. |

**Siguiente paso:** E4.

---

### E4. Módulo 4 — Alta y egreso (RF-54 a RF-67; P1 y variantes Life con P4 y P5)

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E4-01 | `medico_tratante@` · `/egreso` | Busque `Mateo` (hospitalizados); «Iniciar proceso de alta». | Abre `/egreso/ENC-0004`; «Quién sigue» y cadena de entregables 0 de N. |
| E4-02 | igual | «Registrar orden de alta». | «Orden digital de alta registrada. Sigue el médico residente con la epicrisis. Trabajo social y enfermería avanzan en paralelo.» Una segunda vez: «Este ingreso ya tiene una orden digital de alta.» |
| E4-03 | `medico_residente@` · `/egreso/ENC-0004` | «Guardar epicrisis» vacío; luego Diagnósticos `Neumonía adquirida en la comunidad resuelta`, Procedimientos `Ninguno`, Evolución `Favorable, afebril 48 h.` | «Registre los diagnósticos de la epicrisis.»; luego «Epicrisis electrónica registrada.» |
| E4-04 | igual | «Emitir receta»: Medicamento `Amoxicilina`, Dosis `500 mg`, Vía `Oral`, Frecuencia `cada 8 horas`, Días `7`. | «Recetas ambulatorias emitidas.» |
| E4-05 | `trabajo_social@` · `/egreso/ENC-0004` | Informe `Red de apoyo familiar adecuada; domicilio con servicios básicos.`; «¿Entorno adecuado? (si/no)» escriba `si` o `Sí` (ambos se interpretan como afirmativo, HP-12 corregido); «Guardar valoración». | «Valoración social registrada.» (RF-57/58) |
| E4-06 | `enfermera_piso@` · `/egreso/ENC-0004` | Resultado de la conciliación `Se concilian medicamentos domiciliarios con la receta.`; «Registrar conciliación». | «Conciliación farmacéutica al alta registrada.» |
| E4-07 | igual | «Generar informe» **sin** elegir seguimiento Life; luego con Indicaciones `Amoxicilina cada 8 horas por 7 días`, Signos de alarma `Fiebre mayor a 38 C`, Cuidados `Reposo relativo`, y elija «No es usuario: generar invitación». | Primero «Indique el seguimiento en Vitalsy Life.»; luego «Informe digital de alta de enfermería generado.» y aparece el código `VLI-…` con QR, «Código de invitación» y «Válido hasta» (30 días). |
| E4-08 | igual | Nombre de quien recibe `Julia Ruiz`; «Confirmar recepción». | «Recepción de indicaciones confirmada.» Un reenvío distinto: «La recepción de indicaciones ya fue registrada y no puede modificarse.» |
| E4-09 | `altas_caja@` · `/egreso/ENC-0004` | **Antes** de la cuenta, pulse «Emitir pase de salida». | Rechazo con la regla pendiente («La liquidación administrativa aún no está conforme.»). |
| E4-10 | igual | «Marcar liquidación conforme»; luego «Emitir pase de salida». | «Estado de cuenta verificado.»; «Pase de salida digital emitido.» |
| E4-11 | `camillero@` · `/egreso` | Revise las salidas autorizadas. | Aparece P1 con autorización de salida (RF-65). |
| E4-12 | `enfermera_piso@` · `/egreso/ENC-0004` | «Registrar salida efectiva». | «Salida efectiva registrada. La cama queda vacante.» «El paciente ya egresó.» P1 deja de aparecer en Pacientes y en el tablero. |
| E4-13 | `enfermera_piso@` | Intente «Registrar salida efectiva» en un caso sin pase. | Rechazo: «No hay un pase de salida emitido para este ingreso.» |
| E4-14 | P4 (variante «Ya es usuario») | Repita E4 con P4 y en E4-07 elija «Ya es usuario: sincronizar el plan domiciliario». | Código `VLA-…` («Código de activación») con QR; resumen «Ya es usuario: plan domiciliario sincronizado con Vitalsy Life». Con la cuenta Life del 1.9: `GET /api/v1/life/discharge-plans/<código>` devuelve el plan (1.ª vez); otra cuenta → 409 `plan_claimed`. |
| E4-15 | P5 (variante «Rechaza») | Repita E4 con P5 y elija «Rechaza el seguimiento digital». | Resumen «Rechaza el seguimiento digital»; **no** se emiten códigos. |
| E4-16 | `medico_residente@` | Revise que ve «modo» y estado del plan Life pero no el código. | Solo `enfermera_piso` ve códigos y QR; el resto ve modo, estado y vigencia. |
| E4-17 | cualquiera | «Imprimir ficha de alta». | Abre impresión con la ficha del alta. |

**Siguiente paso:** E5.

---

### E5. Módulo 5 — Camas y limpieza (RF-68 a RF-77)

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E5-01 | `gestion_camas@` · `/camas` | Revise el censo, KPIs y filtros por pabellón; «Actualizar». | Pabellones Medicina Interna A y Cirugía B con camas y estados (disponible, ocupada, limpieza, bloqueada). |
| E5-02 | igual | Registre una solicitud con `Aislamiento: Contacto (bata + guantes)`, especialidad `Cirugía`, género `Masculino` (paciente sin ingreso: escriba un nombre). | Solicitud en lista de espera; sin lecho compatible libre (201-B está bloqueada) permanece en espera con prioridad. |
| E5-03 | igual | Intente asignar un lecho incompatible (p. ej. paciente masculino a 102-A femenino). | Rechazo: «El lecho no es compatible con el paciente: …» (RF-72). |
| E5-04 | `enfermera_supervisora@` · `/camas` | «Proyección de altas»: Paciente internado = P2 (u otro); Alta prevista fecha pasada → «La fecha prevista debe ser futura.»; luego fecha futura; «Registrar proyección». | «Proyección de alta registrada.» y contador «N vigentes» (RF-71). |
| E5-05 | `servicios_generales@` · `/camas/limpieza` | Tras el egreso de P1 verá una orden para la cama 101-A. Marque los 4 ítems («Limpieza de superficies duras», «Desinfección de porta-suero», «Cambio de colchón sanitario», «Ventilación de ambiente (30 min)») y «Registrar desinfección terminada». | Con menos de 4 ítems el botón no avanza; completa: «Desinfección registrada en <unidad>. Pasa a equipamiento.» |
| E5-06 | `auxiliar_enfermeria@` · `/camas/limpieza` | «Marcar unidad equipada». | «Unidad equipada: <unidad>. Pasa a validación de la supervisora.» |
| E5-07 | `enfermera_supervisora@` · `/camas/limpieza` | «Habilitar cama en censo hospitalario». | «Cama habilitada en el censo central: <unidad>.» La cama vuelve a «disponible» en `/camas`. |
| E5-08 | cualquiera | Salte etapas por API (equipar sin desinfectar) | 422 con regla de estado previo. |
| E5-09 | `admision@` | Con un ingreso en paso «consentimiento» **sin** cama asignada en `/camas`, intente «Registrar consentimiento». | Rechazo: «Asigne una cama en Gestión de camas antes de registrar el consentimiento.» (HP-07, corregido). |

**Siguiente paso:** E6.

---

### E6. Módulo 6 — Personal (RF-78 a RF-88)

> **Orden importante:** haga primero E6-A (relevo) porque «Publicar rol mensual» **reemplaza el mes** y borra los turnos de práctica sembrados. Si ya publicó, reinicie con `db:seed --force`.

**E6-A. Relevo de turno (`enfermera_piso` entrante)**

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E6-01 | `lucia.mendoza@vitalsy.local` · `/personal` | Panel «Entrega de turno». | Candidata «Rosa Quispe Mamani — Medicina Interna A · termina HH:MM · 2 paciente(s)». Si «No hay un relevo disponible ahora»: pasó la ventana (1 h antes a 2 h después del cambio); reinicie con `db:seed --force`. |
| E6-02 | igual | Elija a la saliente; «Consolidar handover». | Lista de pacientes con NEWS2, dosis pendientes y alertas (p. ej. Beatriz NEWS2 8). |
| E6-03 | igual | «Firmar recepción de turno». | «Recepción de turno firmada.» Los pacientes pasan a Lucía; el reporte queda inmutable. |
| E6-04 | `rosa.quispe@` | Intente consolidar como saliente. | Sin candidatas (la entrante es quien firma). |

**E6-B. Rol mensual (`jefatura_enfermeria@`)**

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E6-05 | `/personal` | En «Agregar colaborador al rol» busque `Rosa` (nombre, correo o rol) y «Agregar al rol». Marque turnos en la matriz (clic en la celda alterna D/N/L). Servicio `Medicina Interna A`. | La fila aparece; leyenda: D Diurno 07:00–19:00, N Noche 19:00–07:00, L libre. Contadores de personal y turnos. |
| E6-06 | igual | «Publicar rol mensual oficial» sin turnos. | «Marque al menos un turno antes de publicar el rol.» |
| E6-07 | igual | Con turnos marcados, «Publicar rol mensual oficial» y «Confirmar reemplazo». | «Rol mensual de turnos publicado.»; «Publicado el <fecha> por <usuario>.» |

**E6-C. Distribución diaria (`enfermera_supervisora@`)**

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E6-08 | `/personal` · «Asignación activa del turno» | Fecha de hoy; seleccione ≥ 1 enfermera; «Sugerir distribución». Sin enfermeras: «Seleccione al menos una enfermera del turno.» | Propuesta con pacientes por enfermera balanceada por NEWS2 y nivel de carga (Holgada < 4, Óptima 4–9, Sobrecarga ≥ 10). |
| E6-09 | igual | Cambie una enfermera en la tabla; «Aprobar asignación». | «Asignación diaria aprobada.» (RF-79/80; no hay notificación persistente a la enfermera: RF-80 parcial). |
| E6-10 | `/personal` · «Registro de contingencias» | Colaborador = una enfermera con pacientes; Fecha de hoy; Motivo `Descanso médico`; «Registrar inasistencia». Pruebe sin datos: «Seleccione al colaborador.» / «Indique la fecha.» / «Seleccione el motivo.» | «Inasistencia registrada. N paciente(s) reasignado(s) a …» y, si no hay receptoras, «Se abrió una solicitud de cobertura para la jefatura». |
| E6-11 | `jefatura_enfermeria@` · «Coberturas y retén» | «Aprobar convocatoria de retén» en la solicitud. | «Convocatoria de retén aprobada.» Estado «Pendiente de RRHH». |
| E6-12 | `recursos_humanos@` | «Autorizar cobertura extraordinaria». | «Cobertura extraordinaria autorizada.» «Lista para ingreso». |
| E6-13 | `enfermera_supervisora@` | Elija el retén y «Confirmar ingreso del retén». | «Ingreso del retén confirmado.» Estado «Retén en piso». Saltar pasos o repetir: 422. |

**Siguiente paso:** E7.

---

### E7. Administración de usuarios (RF-101 a RF-104; `administrador_accesos@`)

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E7-01 | `/usuarios` | Revise la lista y los filtros «Todos», «Activos», «Inactivos»; busque `rosa`. | Lista con nombre, correo, rol y estado (RF-101). |
| E7-02 | `/usuarios/nuevo` | «Crear cuenta» vacío. | «El nombre es obligatorio.», «El correo es obligatorio.», «Seleccione un rol.» Correo `sin-arroba` → «Ingrese un correo válido.» |
| E7-03 | igual | Nombre `Prueba QA Nueva`, correo `qa.nueva@vitalsy.local`, Rol `Auxiliar de enfermería`; «Crear cuenta». | «Cuenta creada para qa.nueva@vitalsy.local. Entregue la contraseña temporal; no se vuelve a mostrar.» Muestra la contraseña temporal; «Copiar contraseña». |
| E7-04 | igual | Repita con el mismo correo. | Rechazo por correo ya registrado (422; texto exacto no verificado). |
| E7-05 | Sesión nueva | Entre con `qa.nueva@vitalsy.local` y la temporal. | Solo se muestra la pantalla de cambio de contraseña. «Guardar contraseña» con `corta1` → rechazo (mínimo 10 caracteres, letras y números); con `Nueva-clave-2026` y confirmación igual → entra a Inicio. La nueva debe ser distinta de la actual. |
| E7-06 | `administrador_accesos@` · `/usuarios/<id>` | Cambie el rol a `Enfermera de piso`; «Guardar cambios». | «Cambios guardados.» (RF-103). El menú de esa cuenta cambia en su próximo inicio. |
| E7-07 | igual | Intente cambiar su **propio** rol y desactivar su **propia** cuenta. | «No puede cambiar su propio rol.» / «No puede desactivar su propia cuenta.» |
| E7-08 | igual | «Desactivar cuenta» → «Confirmar desactivación» (de `qa.nueva@`). | «Cuenta desactivada. La persona ya no puede iniciar sesión.» Esa cuenta no puede entrar (N-18); sus registros permanecen. |
| E7-09 | igual | Intente desactivar la última cuenta de administrador. | «Debe quedar al menos un administrador de accesos activo.» |

### E7b. Infraestructura de camas (RF-110 a RF-112; `administrador_accesos@`)

Cada institución define sus pabellones, habitaciones y camas; los datos precargados son solo para probar.

| Paso | Rol · ruta | Acción y datos | Resultado esperado |
|---|---|---|---|
| E7b-01 | `/infraestructura` | Revise los pabellones precargados y sus camas. | Cada cama muestra habitación, código, género, aislamiento, estado y si está activa (RF-110). |
| E7b-02 | igual | «Crear pabellón» vacío. | «El código es obligatorio.», «El nombre es obligatorio.», «Seleccione una especialidad.» |
| E7b-03 | igual | Código `QA-1`, nombre `Pabellón QA`, especialidad `Medicina interna`; «Crear pabellón». | «Pabellón QA-1 creado.» Sin camas todavía. Un código repetido se rechaza. |
| E7b-04 | igual | «Nueva cama»: pabellón `QA-1`, habitación `701`, cama `A`, género `Mixta`; «Crear cama». | «Cama 701-A creada.» Repetirla → «Ya existe una cama con esa habitación y código en el pabellón.» |
| E7b-05 | igual | «Alta en lote»: pabellón `QA-1`, habitaciones `710` a `712`, `2` camas; «Vista previa del lote». | Vista previa con 6 camas (710-A … 712-B). «Crear 6 camas nuevas» → «Lote creado: 6 camas nuevas.» Repetir el lote → «6 ya existen» y no hay nada que crear (RF-112). |
| E7b-06 | igual | «Desactivar cama 710-A». Luego entre como `gestion_camas@` y abra `/camas`. | «Cama 710-A desactivada.» La cama no se ofrece, sugiere ni asigna. «Activar cama 710-A» la devuelve (RF-111). |
| E7b-07 | igual | Intente desactivar o borrar una cama **ocupada** o **en limpieza** (p. ej. `101-B` con paciente). | Rechazo: «No se puede … la cama …: está ocupada o en limpieza.» |
| E7b-08 | igual | «Borrar cama 711-A» → «Sí, borrar». | «Cama 711-A borrada. El historial se conserva.» Desaparece de la lista y de la asignación; sus asignaciones y limpiezas pasadas siguen en el historial. Crear otra cama con el mismo código la restaura. |
| E7b-09 | Otros roles | `gestion_camas@` abre `/infraestructura` o llama `GET /api/v1/bed-infrastructure/wards`. | Vista no disponible / 403. |

---
## 4. Casos transversales

### 4.1 Validaciones y mensajes de error (todas las pantallas)

Regla del proyecto: toda pantalla valida **antes** de enviar y muestra feedback de éxito o error. Para cada formulario verifique: (a) campo vacío obligatorio, (b) formato inválido, (c) mensaje visible junto al campo o en un aviso, (d) que no se envíe la petición al servidor cuando falla la validación del cliente, (e) el aviso de éxito tras guardar. Los mensajes de error técnicos del servidor no deben mostrarse tal cual (la web los sustituye por un texto genérico del formulario).

| ID | Campo / regla | Dato de prueba | Resultado esperado |
|---|---|---|---|
| T-01 | Documento (ingreso, filiación): solo dígitos, máx. 12 | `12A-34 56` | Queda `123456`; vacío: «El documento es obligatorio.» |
| T-02 | Teléfono del familiar: 7 a 15 dígitos | `12345`, `1234567890123456`, `91234567` | Los dos primeros: «El teléfono del familiar solo admite dígitos (7 a 15).»; el tercero es válido. |
| T-03 | Código Life: `VL-XXXX-XXXX` | `VL-12`, `vl-ab12-cd34` | `VL-12` → «Formato VL-XXXX-XXXX»; minúsculas se convierten a mayúsculas. |
| T-04 | Constantes (rangos): FR 4–60, SpO2 50–100, PAS 40–280, PAD 30–160, pulso 20–250, Temp 30–43 | valores en el límite y fuera | Dentro: acepta; fuera: «… no es posible. Revise la medición.»; vacío: «… es obligatoria.» |
| T-05 | Contraseña nueva: ≥ 10, letras y números, distinta de la actual | `corta1`, `soloLetrasAbc` | Rechazo con mensaje; confirmación distinta rechazada. |
| T-06 | Notas: enfermería ≥ 5 caracteres; actividad «Otros» ≥ 3 | `Hola`, `ab` | Mensajes indicados en E2-13/E2-14. |
| T-07 | Alta: epicrisis (diagnóstico ≥ 3), valoración social (≥ 5), conciliación (≥ 5), informe (indicaciones ≥ 5), receta (Días entero ≥ 1) | `ab`, Días `0` | Mensaje de campo; el servidor repite la validación (422). |
| T-08 | Orden de ingreso duplicada | Registrar otra vez `OI-2026-0101` | Error «Ya existe un ingreso con esa orden.» (422). |
| T-09 | Proyección de alta en pasado | fecha pasada | «La fecha prevista debe ser futura.» |
| T-10 | Texto largo y caracteres especiales | Nombre de 200 caracteres; `Ñandú O'Brien <b>` | Límite 120 en nombre (servidor); caracteres se muestran como texto, sin interpretarse. |

### 4.2 Expiración por inactividad (RNF-09)

1. Inicie sesión con cualquier cuenta y no toque el teclado, el ratón (clic) ni el desplazamiento durante **5 minutos** (el movimiento del ratón sin clic **no** cuenta como actividad).
2. Esperado: vuelve a «Iniciar sesión» con el aviso «La sesión se cerró por inactividad. Vuelva a iniciar sesión.» Sin datos clínicos visibles; la tecla «atrás» no los muestra.
3. Con un formulario a medias, recuerde que se pierde lo no guardado salvo «Guardar borrador» (local al equipo).
4. Variante: realice una acción cada 4 minutos; la sesión debe mantenerse.

### 4.3 403 cruzados y sesión

Ejecute la lista N-01 a N-19 (sección 2.2). Además: (a) cierre sesión en una pestaña y pulse una acción en otra: debe pedir iniciar sesión (401), sin romper la pantalla; (b) copie una URL con `?ingreso=ENC-xxxx` de otro rol y ábrala: solo muestra lo que su rol puede ver.

### 4.4 Auditoría y trazabilidad (RF-52, RNF-07)

| ID | Verificación | Resultado esperado |
|---|---|---|
| T-11 | Línea de tiempo de una alerta (E3-12) | Cada evento con autor y hora; sin controles de edición ni borrado. |
| T-12 | Dosis e-MAR administrada | No puede volver a editarse ni cancelarse individualmente; muestra quién y cuándo. |
| T-13 | Nota de evolución médica firmada | Aparece con autor y hora; no hay opción de modificar. |
| T-14 | Cuenta desactivada (E7-08) | Sus registros previos conservan el autor; la cuenta no se elimina. |
| T-15 | Handover firmado (E6-03) | Queda registrado con ambas enfermeras y hora; no editable. |
| T-16 | Inmutabilidad en BD (solo equipo técnico) | `docker compose exec postgres psql -U postgres -d mi_db -c "UPDATE alert_events SET detail='x' WHERE id=(SELECT min(id) FROM alert_events);"` debe fallar con un mensaje que cita RNF-07. **No verificado en PostgreSQL** (la documentación indica que los triggers se probaron en SQLite). |
| T-17 | Cifrado en reposo (solo equipo técnico) | `docker compose exec postgres psql -U postgres -d mi_db -c "SELECT body FROM nursing_evolution_notes LIMIT 1;"` debe mostrar un texto cifrado (no la nota en claro). Los datos de identidad y constantes **no** se cifran por diseño (ver `seguridad-datos.md`). |

### 4.5 Impresión

| ID | Documento | Dónde | Verificar |
|---|---|---|---|
| T-18 | Orden de internamiento | `/admision/orden` → «Imprimir orden» | Título «Orden de internamiento»; número, paciente, origen, médico, motivo, cobertura; encabezado «Vitalsy Clinical»; pie «Documento generado para impresión institucional.» |
| T-19 | Brazalete | `/admision/brazalete` → «Imprimir código de barras» | Solo el código de barras legible, con el código `BRZ-…`. Escanéelo con un lector o la app de cámara. |
| T-20 | Consentimiento | `/admision/consentimiento` → «Imprimir consentimiento físico» | Paciente, quien firma, relación, declaración. |
| T-21 | Ficha de alta | `/egreso/<id>` → «Imprimir ficha de alta» | Datos del alta; el modo Life aparece sin exponer códigos a roles no autorizados. |
| T-22 | Seguridad de impresión | Registre un paciente con nombre `<img src=x onerror=alert(1)> Prueba` (solo en entorno de prueba) y use «Imprimir orden». | **Esperado:** el nombre se imprime como texto (HP-11, corregido: los datos se escapan). Si aparece una alerta de JavaScript, registre un hallazgo bloqueante de seguridad. |

### 4.6 Accesibilidad básica

| ID | Prueba | Resultado esperado |
|---|---|---|
| T-23 | Navegar solo con teclado (Tab, Shift+Tab, Enter, Esc) en login, registro de ingreso, constantes | Orden lógico; foco visible; todos los botones alcanzables; Esc cierra el lector de código y los cajones. |
| T-24 | Etiquetas | Cada campo tiene etiqueta visible; los errores se asocian al campo y se anuncian (`role="alert"`). |
| T-25 | Color no como único indicador | El riesgo NEWS2 muestra texto («Riesgo alto», número) además del color. |
| T-26 | Zoom 200 % y texto grande | Sin pérdida de contenido ni solapamientos. |
| T-27 | Contraste | Texto legible; revise estados deshabilitados y avisos informativos con una herramienta de contraste (no verificado). |
| T-28 | Lector de pantalla (NVDA/Narrador) | El banner de NEWS2 alto se anuncia como alerta; las tablas tienen encabezados. (No verificado.) |

### 4.7 Tiempos, responsividad y navegadores

| ID | Requisito | Cómo medir | Umbral |
|---|---|---|---|
| T-29 | RNF-02 procesamiento de constantes/NEWS2 | Herramientas de desarrollo > Red: tiempo de `POST …/vital-signs` | ≤ 1 s por registro. |
| T-30 | RNF-03 carga de `/pacientes` y `/camas` | Pestaña Rendimiento o cronómetro hasta ver la tabla completa | ≤ 2 s en red local (no hay 50 usuarios concurrentes en local). |
| T-31 | RNF-15 tareas críticas | Cuente clics desde «Inicio»: registrar constantes, confirmar recepción de alerta, administrar dosis | ≤ 3 clics/toques desde la pantalla principal de cada tarea. |
| T-32 | RNF-14 responsivo | Ventana de 1366 px, 1024/768 px y 414/360 px (modo dispositivo del navegador) en login, Pacientes, Constantes, Alertas | Sin pérdida de funcionalidad ni solapamientos; menú adaptado. |
| T-33 | RNF-16 color de riesgo | NEWS2 0 verde; 1–4 y 5–6 amarillo; ≥ 7 rojo, igual en constantes, alertas, expediente y handover | Consistente en todas las pantallas. |
| T-34 | RNF-18 navegadores | Repita E0, E1-27 y E3-01 en Chrome, Edge y Firefox (y Safari si hay equipo) | Sin errores funcionales ni visuales. |
| T-35 | RNF-12 reconexión (parcial) | Con una alerta abierta, DevTools > Red > «Sin conexión» 20 s y volver a «En línea» | Reintenta y al reconectar refresca la bandeja con lo ocurrido; sin duplicados. No concluyente la cifra de 5 s en local. |
| T-36 | RNF-11 salud | `GET /api/health` repetido; detenga `postgres` (`docker compose stop postgres`) | 503 `degraded`; al reanudar vuelve 200. |

### 4.8 Seguridad básica

| ID | Prueba | Resultado esperado |
|---|---|---|
| T-37 | 11 intentos de login fallidos en un minuto | A partir del 11.º: 429 (límite 10/min). |
| T-38 | Texto con `<script>alert(1)</script>` en nombre, notas y búsqueda | Se muestra como texto; nada se ejecuta. |
| T-39 | Búsqueda con `' OR 1=1 --` en Pacientes | Sin error ni resultados indebidos. |
| T-40 | Cookie de sesión (DevTools > Aplicación) | `HttpOnly`; en desarrollo sin `Secure` (HTTP). En producción: `Secure`, `SameSite=Lax`. |
| T-41 | Datos sensibles en la URL | Solo `ingreso=ENC-xxxx`; ningún nombre ni documento en la URL. |

---

## 5. Datos de prueba

### 5.1 Reglas de validación reales que condicionan los datos

- **Documento:** solo dígitos, máx. 12 en la web (el servidor admite hasta 30 caracteres y **no** exige dígitos: HP-05). Use DNI de 8 dígitos.
- **Teléfono del familiar:** 7 a 15 dígitos.
- **Número de orden:** texto libre, máx. 40, único por ingreso.
- **Nombre del paciente:** máx. 120. **Motivo:** máx. 255.
- **Cobertura:** `aprobada`, `pendiente`, `rechazada`. Pagadores: SIS, EsSalud, SOAT, EPS Rímac, EPS Pacífico, Particular. Orígenes: Emergencia adultos, Emergencia pediátrica, Consulta externa, Consultorios externos, Derivación interhospitalaria, Quirófano urgencias.
- **Código Life:** `VL-` + 4 + `-` + 4 alfanuméricos en mayúsculas.
- **Constantes:** rangos de T-04.
- **Contraseñas nuevas:** ≥ 10 caracteres con letras y números.

### 5.2 Pacientes ficticios

| ID | Paciente | DNI | Orden | Caso | Cobertura | Datos clínicos clave |
|---|---|---|---|---|---|---|
| P1 | Mateo Gonzales Rivera | 71234501 | OI-2026-0101 | Normal, recorrido completo hasta alta | SIS · Aprobada · SIS Gratuito | Motivo: neumonía. Sin alergias. BPMH: Metformina 850 mg cada 12 horas Oral. Basales: FR 16, SpO2 97, PA 120/80, pulso 72, Temp 36.8, Alerta (NEWS2 0). Fecha nac. 1985-03-14. Género masculino. |
| P2 | Elena Cruz Huanca | 71234502 | OI-2026-0102 | Crítico: NEWS2 alto → ERR → UCI → retorno | EsSalud · Aprobada · Regular | Basales normales (FR 18, SpO2 96, PA 118/76, pulso 80, Temp 36.9). Luego en E3: FR 28, SpO2 89, PA 85/50, pulso 135, Temp 39.5, O2, voz = NEWS2 19. Fecha nac. 1972-11-05. Femenino. |
| P3 | Julio Campos Pérez | 71234503 | OI-2026-0103 | Alergia a penicilina + amoxicilina en BPMH; NEWS2 basal 3 | SOAT · Aprobada · Particular | Alergia `Penicilina`. BPMH: Amoxicilina 500 mg cada 8 horas Oral. Basales: FR 22, SpO2 96, PA 125/80, pulso 95, Temp 37.0, Alerta. Fecha nac. 1968-01-20. Masculino. |
| P4 | Rosa Delgado Ruiz | 71234504 | OI-2026-0104 | Cobertura pendiente → derivación → aprobada; vincula Vitalsy Life; alta «Ya es usuario» | EsSalud · Pendiente → Aprobada · Regular | Familiar: Julia Ruiz, tel. 91234567. Basales: FR 19, SpO2 95, PA 130/85, pulso 88, Temp 37.2 (NEWS2 1 → alerta). Fecha nac. 1990-07-02. Femenino. |
| P5 | Sara Medina Flores | 71234505 | OI-2026-0105 | Rechaza Vitalsy Life en el alta | SIS · Aprobada · SIS Gratuito | Basales normales (FR 15, SpO2 99, PA 115/75, pulso 68, Temp 36.5). Fecha nac. 1998-09-30. Femenino. |

Datos fijos sembrados que también sirven: `ENC-0001` Ana (recorrido camillero → enfermería → médico con `OT-2026-0001` y `BRZ-0001-ANA`), `ENC-0002` Luis (cobertura pendiente), `ENC-0003` Carmen (cobertura rechazada, derivación) y `ENC-PRAC-1/2/3` (relevo y NEWS2 8/3/0).

### 5.3 Datos para pruebas negativas

| Dato | Uso |
|---|---|
| `BRZ-9999-XXX` | Brazalete inexistente. |
| `BRZ-0001-ANA` | Brazalete de otro paciente (E1-20). |
| `OT-2099-9999` | Traslado inexistente («No se encontró la orden de traslado.»). |
| `OI-2026-9999` | Orden inexistente («No se encontró la orden.»). |
| `VL-ZZZZ-ZZZZ` | Código Life inexistente. |
| `DRUG-OTRO-1MG` | Código de medicamento erróneo (e-MAR). |
| Texto de 5000 caracteres | Límite de campos de texto libre. |

---

## 6. Registro de hallazgos y puntos a mejorar

### 6.1 Hoja de registro

Copie esta plantilla (también en `docs/operacion/registro-de-hallazgos.csv`) y registre **un hallazgo por fila**. Ya contiene los hallazgos previos HP-01 a HP-12 para que confirme o descarte cada uno. **HP-02, HP-04, HP-06, HP-07, HP-08, HP-11 y HP-12 ya están corregidos** (estado «Corregido»): confirme que no reaparecen. Siguen abiertos HP-01, HP-03, HP-05, HP-09 y HP-10.

| Campo | Qué anotar |
|---|---|
| ID | `H-001`, `H-002`… (los previos son `HP-xx`). |
| Fecha | AAAA-MM-DD y hora. |
| Módulo | M1 Admisión, M2 Atención, M3 Alertas, M4 Alta, M5 Camas, M6 Personal, Usuarios, Transversal, Entorno. |
| Rol / cuenta | Cuenta usada, p. ej. `enfermera_piso@vitalsy.local`. |
| Paso de la guía | p. ej. `E3-07`. |
| Pasos para reproducir | Lista numerada con los datos escritos. |
| Resultado esperado | Según la guía. |
| Resultado obtenido | Lo que realmente pasó (texto del mensaje). |
| Severidad | **Bloqueante** (impide el flujo o riesgo para el paciente/seguridad), **Mayor** (función incorrecta con rodeo), **Menor** (cosmético o textual), **Mejora** (sugerencia). |
| Categoría | Funcional, Validación, Seguridad, Rendimiento, Usabilidad, Accesibilidad, Datos, Integración, Documentación, Entorno. |
| Evidencia | Captura (nombre de archivo), vídeo, respuesta de red, fragmento de log. |
| Estado | Abierto, En análisis, Corregido, Verificado, No es defecto, Aplazado. |
| Responsable / observaciones | Quién lo atiende y notas. |

Criterio de severidad: un error que permita ejecutar una acción clínica con el paciente equivocado, perder una alerta, o exponer datos a un rol no autorizado es **Bloqueante** aunque ocurra solo en un caso.

### 6.2 Puntos a mejorar (por categoría)

Anote aquí, durante la prueba, observaciones que no son defectos pero mejorarían el producto. Se parte de lo ya observado al preparar la guía:

| Categoría | Observación inicial | Para evaluar |
|---|---|---|
| Usabilidad | La alta social pide escribir `si`/`no` en un campo de texto libre (`¿Entorno adecuado? (si/no)`); cualquier otra grafía se guarda como «no». | ¿Es claro? ¿Debería ser casilla o selector? |
| Usabilidad | El campo «Número de traslado» y el código del brazalete aparecen **precargados**, de modo que la verificación se reduce a un clic. | ¿Aporta seguridad real el paso? |
| Usabilidad | El texto de «Registrar ingreso» promete que se generará «la solicitud de asignación inmediata» de cama; el aviso ya dice que el registro no asigna ni solicita cama y que Gestión de camas la confirma (HP-08, corregido). | ¿Se entiende el siguiente paso? |
| Seguridad | La pantalla del e-MAR ya no muestra los códigos esperados (HP-04, corregido); el probador los obtiene del brazalete, de la tabla «Prescripción activa» del CPOE o con `php artisan emar:codes ENC-XXXX`. | ¿Los 5 correctos exigen ahora escanear de verdad? |
| Funcional | No hay notificación persistente a la enfermera tras aprobar la asignación (RF-80 parcial). | ¿Cómo se entera la enfermera? |
| Funcional | El reporte de handover se guarda sin validación aparte (RF-82 parcial). | ¿Es suficiente el reporte a pie de cama? |
| Rendimiento | El primer arranque compila el frontend en el momento (modo desarrollo). | Tiempo hasta ver el login. |
| Documentación | `.env.example` contiene variables sin efecto en desarrollo (HP-09). | ¿Se pudo configurar sin ayuda? |
| Accesibilidad | Sin evidencia de pruebas con lector de pantalla. | Resultados de T-23 a T-28. |
| Datos | Datos demo con fechas fijas (LIS/PACS *stub* de septiembre de 2026). | ¿Confunde frente a la fecha actual? |
| Interoperabilidad | LIS/PACS devuelven siempre los mismos 2 resultados (stub). | Qué se espera de una integración real. |
| Entorno | El planificador de SLA no corre solo (HP-01). | Procedimiento operativo necesario. |

---

## 7. Criterios de aceptación go / no-go

**Regla general:** **GO** si no queda ningún hallazgo **Bloqueante** abierto y todos los criterios marcados «Obligatorio» están en «Cumple». **NO-GO** si algún bloqueante sigue abierto o algún obligatorio no cumple. Los «Mayor» abiertos requieren plan de corrección y aceptación explícita del responsable.

| Criterio | RF / RNF | Verificación | Umbral | Obligatorio | Resultado |
|---|---|---|---|---|---|
| Ingreso completo de un paciente de punta a punta | RF-01 a RF-20 | E1 (P1) | 15 pasos sin error; ficha y censo coherentes | Sí | |
| Verificación de identidad impide paciente equivocado | RF-08 | E1-20 | Rechaza brazalete ajeno | Sí | |
| Cobertura no aprobada bloquea brazalete y deriva | RF-02, RF-03 | E1c-02 a E1c-04 | Bloquea y deriva con teléfono válido | Sí | |
| Vinculación Life con código válido/vencido/consumido | RF-95 | E1c-06 a E1c-08 | Importa; rechaza inválidos sin romper el ingreso | Sí | |
| NEWS2 determinista y colores de riesgo | RF-28, RNF-16 | E1-27, E2-04/05, E3-01, T-33, Apéndice A | Puntajes igual a la tabla; colores consistentes | Sí | |
| Alerta automática con NEWS2 ≥ 1 y control a 12 h con NEWS2 0 | RF-30, RF-31, RF-39 | E2-04/05, E1d | Se crea alerta / se programa 12 h | Sí | |
| Confirmación de lectura calla la sirena y deja trazabilidad | RF-44, RF-53 | E3-02/03 | Sirena se detiene; alerta sigue abierta | Sí | |
| Escalamiento por SLA (nurse 5 min, médico 15 min) | RF-45, RF-48 | E3-16 (con `alerts:process-slas`) | Escala a supervisora y luego al médico | Sí | |
| Ciclo ERR → UCI → retorno con historial completo | RF-49 a RF-52 | E3-05 a E3-12 | Todos los estados y registros inmutables | Sí | |
| e-MAR bloquea ante inconsistencia y firma dosis | RF-33 a RF-35 | E2-07, E2-08 | Bloquea; firma inmutable | Sí | |
| CPOE actualiza Kardex y e-MAR | RF-25, RF-32 | E2-02/03 | Dosis visibles en e-MAR | Sí | |
| Gates del alta (orden, epicrisis, receta, social, informe, recepción, cuenta, pase) | RF-54 a RF-65 | E4-01 a E4-11 | Cada gate rechaza fuera de orden | Sí | |
| Salida efectiva solo `enfermera_piso` y libera la cama | RF-66, RF-67 | E4-12, N-15, N-16 | Otros roles 403; cama pasa a limpieza | Sí | |
| Limpieza genera orden y exige checklist | RF-74 a RF-77 | E5-05 a E5-07 | Flujo completo hasta «disponible» | Sí | |
| Todo ingreso tiene cama M5 antes del consentimiento (así su egreso genera limpieza) | RF-74 | E5-09 | Consentimiento rechazado sin cama asignada | No (HP-07, corregido) | |
| Rol mensual, balanceo, handover y cobertura | RF-78 a RF-88 | E6 | Flujos correctos y transiciones validadas | Sí | |
| Administración de usuarios y desactivación | RF-101 a RF-104 | E7 | Crea, edita, desactiva; no deja sin administrador | Sí | |
| Control de acceso por rol | RNF-08 | N-01 a N-19 | 100 % rechazados | Sí | |
| Cierre por inactividad a 5 min | RNF-09 | 4.2 | Cierra y avisa | Sí | |
| Datos clínicos cifrados y registros inmutables | RNF-06, RNF-07 | T-16, T-17, T-11 a T-15 | Cumple | Sí | |
| Tiempos de procesamiento y de carga | RNF-02, RNF-03 | T-29, T-30 | ≤ 1 s y ≤ 2 s | Sí | |
| Eficiencia en tareas críticas | RNF-15 | T-31 | ≤ 3 clics | No | |
| Responsivo y navegadores | RNF-14, RNF-18 | T-32, T-34 | Sin pérdida de funcionalidad | No | |
| Planificador de SLA operativo sin intervención manual | RF-45, RF-48 | HP-01 | Existe un proceso programado | Sí (producción) | |
| Zona horaria hospitalaria | RF-32, RF-83 | HP-03 | Turnos y controles en hora local | Sí (producción) | |
| TLS 1.3, disponibilidad, DR, concurrencia | RNF-05, 11, 13, 04 | No verificables en local | Ver sección 8 | Fuera de esta prueba | |

---

## 8. Limitaciones de esta guía

- **Entorno local, no productivo.** Docker de desarrollo (`APP_ENV=local`, `APP_DEBUG=true`, `php artisan serve`, Vite en modo desarrollo, HTTP). Los resultados de rendimiento no representan producción.
- **TLS 1.3 / HTTPS (RNF-05):** solo verificable con `docker-compose.prod.yml`, dominio y certificados reales (comandos `curl`/`openssl` de `docs/architecture/https-produccion.md`). El compose de desarrollo admite TLS 1.2 y 1.3.
- **Reverb y tiempo real (RNF-01, RNF-12):** corre en local, pero la latencia ≤ 2 s hasta el navegador y la reconexión ≤ 5 s tras perder señal exigen una corrida en un entorno de staging con clientes reales; en local solo se verifica el comportamiento funcional.
- **LIS/PACS:** se usan clientes *stub* con datos fijos; no hay interoperabilidad HL7/FHIR real (RNF-17).
- **Carga y concurrencia (RNF-03/04):** hay guiones k6 locales, fuera del repositorio, sin ejecutar; no se prueban 50/200 usuarios.
- **Disponibilidad y recuperación (RNF-11, RNF-13):** requieren medición anual y simulacro de respaldo y restauración con `pg_dump` / `pg_restore` (`recuperacion-ante-desastres.md`).
- **Planificador:** las pruebas de SLA y de controles/dosis vencidas dependen de ejecutar `alerts:process-slas` a mano (HP-01).
- **Reloj del sistema:** no hay forma de adelantar el tiempo desde la interfaz; las pruebas de 5, 15 y 30 minutos requieren espera real.
- **Navegadores:** Safari y dispositivos físicos solo si dispone de ellos.
- **Cámara:** el escáner usa `html5-qrcode`; en equipos sin cámara use la escritura manual del código.
- **PostgreSQL y triggers:** la documentación indica que los triggers de inmutabilidad y la conversión a columnas cifradas no se probaron automáticamente en PostgreSQL; T-16 y T-17 son la primera verificación real.
- **Vitalsy Life (app móvil):** fuera de alcance; solo se simula el servidor ciudadano por API (sección 1.9).
- **Esta guía** se elaboró leyendo código y documentación, **sin ejecutar el sistema**; los puntos marcados «no verificado» y los textos de pantalla deben confirmarse en la primera pasada.

---

## 9. Hallazgos previos

Defectos o riesgos detectados al leer el código y la documentación para preparar esta guía. **Ninguno se ha reproducido ejecutando el sistema**; confírmelos en las pruebas indicadas y regístrelos en la hoja (ya figuran como `HP-xx`).

| ID | Hallazgo | Evidencia | Severidad propuesta | Confirmar en |
|---|---|---|---|---|
| HP-01 | ✅ **Corregido** (verifique que no reaparece). **El escalamiento por SLA no se ejecuta solo.** `routes/console.php` programa `alerts:process-slas` cada minuto, pero ni `docker-compose.yml` ni `docker-compose.prod.yml` levantan `schedule:work` ni un cron; el entrypoint solo arranca `artisan serve`. Sin ese proceso, no hay escalamiento a supervisora/médico/ERR ni alertas por control o dosis vencidos (RF-45, RF-48, RF-32/42). | Búsqueda en compose y `docker/`; `ProcessAlertSlas` solo se invoca por el comando. | Bloqueante para producción | E3-16 a E3-19 |
| HP-02 | ✅ **Corregido** (verifique que no reaparece). **La verificación de brazalete no se liga al paciente abierto.** `POST /wristbands/verify` solo recibe `code` y devuelve el paciente dueño del código; la web avanza el ingreso actual con cualquier código válido de otro paciente. La documentación afirma que «cada BRZ confirma solo a su paciente». | `HospitalAdmissionController::verifyWristband`, `AdmissionBoard::verifyWristband`, `TransferPages.tsx::verifyWristbandCode`. | Bloqueante (seguridad del paciente) | E1-20 |
| HP-03 | ✅ **Corregido** (verifique que no reaparece). **Zona horaria fija en UTC** (`config/app.php`: `'timezone' => 'UTC'`). Los turnos del e-MAR (07–19), la fecha de turno de las asignaciones y la ventana de relevo se calculan con el reloj del servidor; para un hospital en Perú (UTC−5) el turno «diurno» corresponde a 02:00–14:00 locales. | `EmarService::shiftWindow`, `config/app.php`. | Mayor | E2-04, E2-06, E6-01 |
| HP-04 | ✅ **Corregido** (verifique que no reaparece). **El e-MAR muestra en pantalla los códigos esperados** del medicamento y del brazalete (y se pre-cargan en el flujo de camillero), lo que reduce la verificación de los «5 correctos» a copiar el valor mostrado. | `EmarPage.tsx` (texto «Código esperado del medicamento»), `EmarService::present`. | Mayor (diseño de seguridad) | E2-06 |
| HP-05 | ✅ **Corregido** (verifique que no reaparece). **Servidor sin validación numérica del documento** (`max:30`, solo cadena) en `POST /encounters` e `intake`; la regla «solo dígitos» vive únicamente en la web. Una carga por API admite letras. | `AdmissionCensusController` reglas `documentNumber`. | Menor | T-01 (vía API) |
| HP-06 | ✅ **Corregido** (verifique que no reaparece). **La orden de alta puede registrarse para cualquier ingreso existente**: `registerOrder` solo exige que exista el ingreso, no que esté hospitalizado (`cerrado`); el filtro vive en la interfaz. | `DischargeService::registerOrder/requireEncounter`. | Mayor (por API) | E4-02 (probar con un ingreso en paso «orden» por API) |
| HP-07 | ✅ **Corregido** (verifique que no reaparece). **Un egreso sin asignación de cama del censo M5 no genera orden de limpieza ni avisa.** `vacateEncounter` retorna en silencio si no hay `BedAssignment`; los ingresos con habitación provisional (`300+n`) o importados quedan sin limpieza y sin censo actualizado. | `BedManagement::vacateEncounter`, `AdmissionIdentifiers::ensureTransferReady`. | Mayor | E5-09 |
| HP-08 | ✅ **Corregido** (verifique que no reaparece). **Texto engañoso en «Registrar ingreso»:** «Al formalizar el registro se generará la solicitud de asignación inmediata». La documentación del módulo 1 y el código indican que no se asigna ni se solicita cama en el registro. | `PatientRegistrationPage.tsx`, `modulo-1-admision.md`. | Menor | E1-03 |
| HP-09 | ✅ **Corregido** (verifique que no reaparece). **Plantilla `.env.example` con variables sin efecto** en desarrollo (`NGINX_PORT=80`, `APP_PORT`, `FRONTEND_PORT`, `PORT`) y dos contraseñas de BD que deben coincidir a mano (`POSTGRES_PASSWORD`/`DB_PASSWORD`). | `.env.example`, `docker-compose.yml`. | Menor | Sección 1.2 |
| HP-10 | ✅ **Corregido** (verifique que no reaparece). **Arranque dependiente de certificados no versionados:** `docker/nginx/certs/dev.crt|dev.key` están en `.gitignore` y `dev.conf` los exige; `CLAUDE.md` indica solo `docker compose up --build`. En un clon limpio nginx no arranca hasta ejecutar `generate-dev-certs.sh`. | `.gitignore`, `docker/nginx/dev.conf`, `https-dev-lan.md`. | Menor | Sección 1.3 |
| HP-11 | ✅ **Corregido** (verifique que no reaparece). **Posible inyección HTML en impresión:** `printClinicalDocument` inserta `bodyHtml` en un `iframe srcdoc` sin escapar y las plantillas interpolan nombre, documento y firmante tal como se escribieron. Un nombre con HTML podría ejecutarse al imprimir. | `shared/print/printDocument.ts`, `AdmissionOrderPage.tsx`, `IdentityPages.tsx`. | Mayor/Bloqueante (seguridad), por confirmar | T-22 |
| HP-12 | ✅ **Corregido** (verifique que no reaparece). **Valoración social con campo de texto libre `si/no`**: cualquier grafía distinta de `si` (p. ej. «Sí») se guarda como «no validado». | `DischargeCasePage.tsx::SocialStep`. | Menor | E4-05 |

Observaciones documentales (no son defectos de código): RF-80 y RF-82 figuran como «parcial» en `modulo-6-personal.md`; RNF-01 y RNF-12 figuran pendientes de corrida en staging en `modulo-3-alertas.md`.

---

## Apéndice A. Puntuación NEWS2 (para calcular el resultado esperado)

Total = suma de 7 parámetros. Banda: **≥ 7 rojo (riesgo alto)**; **5–6 amarillo (riesgo medio)**; **1–4 amarillo (bajo-medio)**, y si algún parámetro puntúa 3 → «bajo-medio con puntuación de 3 en un parámetro»; **0 verde (bajo)**.

| Parámetro | 3 | 2 | 1 | 0 |
|---|---|---|---|---|
| Frecuencia respiratoria | ≤ 8 ó ≥ 25 | 21–24 | 9–11 | 12–20 |
| SpO2 escala 1 | ≤ 91 | 92–93 | 94–95 | ≥ 96 |
| SpO2 escala 2 | ≤ 83 ó ≥ 97 con O2 | 84–85 ó 95–96 con O2 | 86–87 ó 93–94 con O2 | 88–92 (sin O2: cualquier valor ≥ 88) |
| Oxígeno suplementario | — | Sí | — | No |
| Presión sistólica | ≤ 90 ó ≥ 220 | 91–100 | 101–110 | 111–219 |
| Pulso | ≤ 40 ó ≥ 131 | 111–130 | 41–50 ó 91–110 | 51–90 |
| Conciencia | Confusión nueva, voz, dolor, no responde | — | — | Alerta (o confusión crónica) |
| Temperatura (°C) | ≤ 35.0 | ≥ 39.1 | 35.1–36.0 ó 38.1–39.0 | 36.1–38.0 |

Ejemplos: P1 basal = 0; P3 basal (FR 22 → 2, pulso 95 → 1) = 3; P2 en E3 = 3+3+2+3+3+3+2 = **19**; FR 28 sola = 3 (alerta de parámetro único).

Frecuencias de monitoreo mostradas: alto «Monitoreo continuo»; medio y parámetro único «Mínimo cada 1 hora»; bajo-medio «Mínimo cada 4 a 6 horas»; bajo «Mínimo cada 12 horas».

## Apéndice B. Plazos del sistema (valores por defecto)

| Concepto | Valor | RF |
|---|---|---|
| Acuse de la enfermera antes de escalar a supervisora | 5 min | RF-44/45 |
| Acuse de la supervisora antes de escalar al médico | 5 min | RF-45 |
| Seguimiento tras acuse | 15 min | RF-53 |
| Respuesta médica antes de escalar a ERR | 15 min | RF-48 |
| Control rutinario con NEWS2 0 | 12 h | RF-31 |
| Gracia de dosis e-MAR | 30 min | RF-32 |
| Recordatorio de cumplimiento | 15 min | RF-42 |
| Vigencia del código Life de vinculación | 30 min, un solo uso | RF-94 |
| Vigencia del plan de alta Life | 30 días | RF-96 |
| Inactividad de sesión | 5 min | RNF-09 |
| Intentos de login | 10 por minuto | — |

## Apéndice C. Comandos útiles

```
docker compose ps
docker compose logs -f backend
docker compose exec backend php artisan alerts:process-slas
docker compose exec backend php artisan schedule:work
docker compose exec backend php artisan db:seed --force
docker compose exec backend php artisan migrate:status
docker compose exec backend php artisan emar:codes ENC-0001        # códigos de brazalete y medicamento que debe escanear en el e-MAR
docker compose exec backend php artisan test          # opcional: suite automática del backend
docker compose down -v                                # borra datos y empieza de cero
```
