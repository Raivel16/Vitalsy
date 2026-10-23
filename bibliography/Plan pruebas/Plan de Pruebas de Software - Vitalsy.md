# Plan de pruebas de software

## Vitalsy

Plataforma para el ingreso, la atención, la alerta, el egreso, las camas y el personal, junto con la aplicación ciudadana de línea de base.

---

## 1. Introducción

### 1.1. Propósito del documento

Este plan fija la estrategia, el alcance, el entorno, los recursos, el orden de ejecución y los criterios de calidad de las pruebas de Vitalsy. Sirve como referencia para quien orquesta cada unidad de desarrollo y para quien revisa que el comportamiento observado coincide con el criterio de aceptación del requisito.

El desarrollo del sistema se ordena en tres fases: Inception, Construction y Operations. La prueba no se concentra en un tramo final. En Inception se fija el criterio. En Construction la prueba se escribe antes del código mínimo que la cumple. En Operations la suite se vuelve a ejecutar en cada integración y el fallo encontrado regresa a Construction con una prueba que lo reproduce.

El documento describe cómo se aplica ese proceso al sistema ya definido. Cuando un mecanismo forma parte de la estrategia y el repositorio todavía no lo contiene, el plan lo establece como caso o como procedimiento. No se presentan como resultados las cifras que este plan no mide.

### 1.2. Alcance

El plan cubre las unidades en las que el capítulo de desarrollo descompuso el intent:

- Acceso y catálogo de roles.
- Admisión y recepción.
- Atención y seguimiento del hospitalizado.
- Alertas clínicas y cumplimiento de controles.
- Alta y egreso.
- Gestión de camas y limpieza.
- Personal asistencial.
- Vitalsy Life, la aplicación del teléfono.
- La alineación visual de los módulos de atención, alertas, egreso, camas y personal, sin alterar las reglas clínicas ya fijadas.
- La repetición de la suite en la integración y la corrección del fallo que aparece en el uso.

Quedan dentro del alcance los niveles unitario, de integración, funcional y de aceptación, y los tipos de funcionalidad, validación de datos, interfaz, seguridad básica de sesión y de rol, regresión y propiedades sobre reglas puras. El plan incorpora, como especificación, los recorridos de navegador del acceso y del censo, la medición de cobertura con umbral y la ejecución de la suite del teléfono en el mismo gatillo de integración que la web y la API.

### 1.3. Definiciones, acrónimos y referencias

| Término | Definición |
| --- | --- |
| TDD | Desarrollo guiado por pruebas. El ciclo es rojo, verde y refactorización: la prueba que expresa el criterio falla; el código mínimo la pone en verde; la refactorización conserva ese comportamiento. |
| Bolt | Ciclo corto de Construction. Nombra un recurso concreto, fija el criterio con una prueba y se cierra cuando la persona acepta el cambio con la suite correspondiente en verde. |
| Inception | Fase en la que el intent se descompone en unidades, actores, acciones y criterios de aceptación, con revisión humana antes de modificar el código. |
| Construction | Fase en la que cada unidad se convierte en diseño, código y pruebas. |
| Operations | Fase en la que el incremento se despliega, se vuelve a comprobar en la integración y se mantiene cuando aparece un fallo. |
| V-Bounce | Acompañamiento del ciclo: el esfuerzo principal está en el intent, en la arquitectura y en la validación continua. La generación de código es la parte breve del Bolt. |
| Oráculo | Resultado esperado contra el que se juzga la prueba. Lo propone el asistente cuando ayuda a redactar el caso, y lo acepta o lo corrige una persona. |
| Criterio de aceptación | Condición observable, escrita en el requisito, que la prueba debe fijar. |
| RF | Requisito funcional. El catálogo vigente va de RF-01 a RF-104 y nombra actor, acción y criterio. |
| NEWS2 | Escala de alerta temprana aplicada a las constantes. Un puntaje fuera de lo esperado abre el proceso de alerta. |
| Morse | Escala de riesgo de caídas. En el sistema se usan los cortes de cuidado agudo. |
| Braden | Escala de riesgo de lesiones por presión. Una puntuación más baja indica un riesgo más alto. |
| CPOE | Prescripción electrónica del médico tratante. |
| e-MAR | Registro electrónico de administración de medicación, con verificación de los cinco correctos. |
| LIS | Integración de resultados de laboratorio, mediante el cliente previsto en la API. |
| PACS | Integración de informes de imagen, mediante el cliente previsto en la API. |
| Sanctum | Mecanismo de sesión por cookie de la API. El guard es el de sesión web. No se usa un token JWT como sustituto de esa cookie. |
| Rol | Clave del catálogo de catorce actores. La cuenta de demostración sigue el patrón `{rol}@vitalsy.local`. |
| Job validate | Trabajo de GitHub Actions que, en cada push y cada pull request hacia `main` y `dev`, ejecuta las pruebas de la web, el build, las pruebas de la API y la revisión de estilo con Pint. |
| KPI | Indicador del proceso de pruebas. En este plan se define la fórmula y el umbral; no se publica un valor medido. |

Referencias internas del proyecto que este plan respeta:

- `docs/requirements/requerimientos.md`, requisitos RF-01 a RF-104.
- Documentos de arquitectura por unidad en `docs/architecture/` y el corte de datos en `docs/architecture/modelo-datos.md`.
- `CONTRIBUTING.md` y `docs/architecture/reglas.md`, que declaran el desarrollo guiado por pruebas.
- Capítulos de desarrollo, de estrategia de pruebas y de automatización del documento del sistema.
- `.github/workflows/ci.yml` y `docs/devops/subir-al-laboratorio.md`.

---

## 2. Objetivos del plan de pruebas

### 2.1. Objetivos generales

- Comprobar que cada unidad hace lo que su requisito nombra: el actor previsto obtiene el efecto y el dato inválido es rechazado.
- Detectar el fallo en el momento en que se escribe el criterio, antes de acumular código que lo oculte.
- Repetir esa detección en cada cambio que se integra a `dev` o a `main`.
- Proteger con prioridad los flujos de identidad del paciente, medicación, alerta clínica y salida del hospital.
- Mantener separadas la validación visible del formulario y la validación del servidor.
- Dejar el defecto reproducido por una prueba, de modo que la corrección no se pierda en la siguiente integración.
- Usar la asistencia de un modelo para proponer casos, datos y una lectura del fallo, con una persona que acepta el oráculo antes de incorporarlo a la suite.
- Medir el proceso con indicadores definidos en este plan, sin sustituir la medición por una cifra supuesta.

### 2.2. Resultados esperados

Los criterios de la tabla son umbrales del plan. No son mediciones ya obtenidas.

| Resultado esperado | Criterio de éxito del plan | Cómo se comprueba |
| --- | --- | --- |
| El criterio del Bolt queda fijado por una prueba | La prueba existe, nombra el rol y el efecto, y está en verde en local y en el job que corresponda antes de integrar | PHPUnit, Vitest o Jest, y el estado del job |
| El rol ajeno no ejecuta la acción protegida | En los recursos de identidad, medicación, alerta y salida, un rol no incluido en la ruta recibe el rechazo que el middleware ya devuelve y el efecto de negocio no ocurre | Prueba de característica de la API |
| Las reglas puras se mantienen en su dominio | NEWS2 no produce un puntaje negativo en combinaciones válidas; Morse y Braden devuelven un nivel de su conjunto; documento y teléfono rechazan letras | Pruebas de ejemplo y propiedades que el plan especifica |
| La sesión clínica exige autenticación | Todo `/api/v1` salvo el login exige sesión. El login fallido responde en español. El límite es de diez intentos por minuto | `AuthApiTest` y la configuración de la ruta |
| La regresión de web y API se repite en cada integración | El job `validate` ejecuta Vitest, el build, PHPUnit sobre SQLite y Pint. Un fallo detiene la integración del Bolt | GitHub Actions |
| La suite del teléfono entra al mismo gatillo | El plan establece que `npm test` de `services/movil` forme parte del workflow de integración | Caso de Operations |
| El recorrido de entrar y ver el censo queda automatizado en navegador | El plan especifica tres casos: login rechazado, login aceptado con el rol `admision` y censo visible | Casos de navegador del plan |
| La cobertura tiene umbral repetible | El laboratorio documenta 80 % como meta de su compuerta. En GitHub el umbral se introduce después de medir, sin fijar un porcentaje que esta revisión no calculó | Procedimiento de Operations |
| No quedan defectos críticos abiertos al cerrar el Bolt | Cero defectos de severidad crítica sin una prueba que los reproduzca y sin corrección aceptada | Registro del defecto en la rama `bugfix/RF-XX-*` |
| El oráculo generado se revisa | Ningún caso propuesto por un modelo se incorpora sin lectura humana del criterio, del rol y de la ruta real | Revisión del Bolt |

---

## 3. Alcance de las pruebas

### 3.1. Funcionalidades a probar

| Unidad | Requisito | Funcionalidad | Tipo de prueba | Fase |
| --- | --- | --- | --- | --- |
| Acceso | RF-99 a RF-100 | Inicio de sesión por cookie, consulta de la sesión, cierre de sesión, catálogo de catorce roles y menú según el perfil | Característica de API, componente, unitaria de catálogo | Construction, Bolt de acceso |
| Admisión y recepción | RF-01 a RF-20 | Orden, filiación, cobertura, derivación, brazalete, expediente, consentimiento, traslado, recepción, reubicación, valoración, constantes, conciliación, riesgos, kardex e indicaciones; censo con búsqueda y paginación | Característica de API, componente, unitaria de NEWS2, Morse, Braden y validación | Construction, Bolt de admisión y censo |
| Atención y seguimiento | RF-21 a RF-38 | Laboratorio, imágenes, visita, evolución, prescripción, monitoreo, e-MAR, controles, cuidados y expediente clínico | Característica de API e interfaz del módulo | Construction, Bolt de atención |
| Alertas | RF-39 a RF-53 | Bandeja, deterioro observado, acuse, revaloración, aviso al médico, escalamiento por tiempo, campana y señal sonora | Característica de API, componente y audio | Construction, Bolt de alertas |
| Alta y egreso | RF-54 a RF-67 | Orden de alta, epicrisis, trabajo social, pase de salida, cuenta y salida física registrada por la enfermera de piso | Característica de API e interfaz | Construction, Bolt de egreso, camas y personal |
| Camas | RF-68 a RF-77 | Censo de camas, lista de espera, aislamiento, liberación al egresar y orden de limpieza | Característica de API e interfaz | Construction, Bolt de egreso, camas y personal |
| Personal | RF-78 a RF-88 | Rol mensual, asignación ponderada por NEWS2, entrega de turno, ausencia en sector crítico y alerta al personal del día | Característica de API e interfaz | Construction, Bolt de egreso, camas y personal |
| Vitalsy Life | RF-89 a RF-98 | Acceso ciudadano, cola local, línea de base, avisos preventivos, plan de medicación, privacidad, perfil, dispositivos y cliente de sincronización | Unitaria y de componente con Jest | Construction, Bolt de Vitalsy Life |
| Pizarra clínica | RNF-16 | Misma conducta clínica con el lenguaje visual compartido de atención, alertas, egreso, camas y personal | Regresión de componente de esos módulos | Construction, Bolt de pizarra |
| Plataforma | Infraestructura del monorepo | Arranque con Compose, esquema mínimo tras migrar y separación de web y API | Característica de esquema y humo del framework | Construction, Bolt de plataforma |
| Integración continua | Todas las unidades de web y API | Repetición de la suite y del estilo PHP en cada push y pull request a `main` y `dev` | Regresión | Operations |

### 3.2. Funcionalidades fuera de alcance

- Auditoría de intrusión o pentesting. La seguridad que este plan exige es la de sesión, el límite de intentos de login, el rechazo del rol ajeno y los análisis que la guía del laboratorio atribuye a su pipeline externo.
- Un modelo entrenado de predicción de defectos, una priorización aprendida por grafo, un agente que navegue la interfaz por refuerzo y una reparación automática de selectores. Esas técnicas se vuelven a valorar cuando existan historial de caídas, identificadores estables y una suite de navegador pequeña ya revisada.
- Una librería de propiedades en Python y un módulo de producto en ese lenguaje. Las propiedades se especifican sobre PHP y TypeScript.
- Pest como ejecutor. El ejecutor del backend es PHPUnit.
- MySQL, tokens JWT, cola Redis, worker separado y PHP-FPM como proceso real de la imagen que arranca. La ejecución usa PostgreSQL 16; las pruebas de API usan SQLite.
- Docker de Vitalsy Life. La aplicación del teléfono se ejecuta con Expo y su suite con Jest.
- Tratar el cliente de `/api/life/sync` y `/api/life/discharge-plans/{code}` como prueba de que Laravel responde. Esas rutas no están declaradas en la API. El caso del cliente comprueba el cliente.
- Casos de administración de usuarios para RF-101 a RF-104. El desarrollo incluye esos requisitos en la unidad de acceso. El catálogo vigente no tiene la clave del administrador de accesos, y este plan no inventa esa clave ni escribe un caso que dependa de ella.
- Certificación normativa externa de las escalas clínicas. Las pruebas comprueban que el sistema aplica los cortes ya codificados, no que una autoridad sanitaria certifique la escala.

---

## 4. Estrategia de pruebas

### 4.1. Enfoque general

La calidad se trata como una actividad de todo el ciclo. El objetivo es detectar el fallo pronto, sobre un criterio explícito, y repetir la detección cuando el código cambia. La asistencia de un modelo acelera la redacción del caso y la lectura del fallo. No sustituye el oráculo ni la decisión de integrar.

#### Metodología TDD

- Rojo. Se escribe la prueba que expresa el criterio de aceptación. La prueba falla porque el comportamiento todavía no está.
- Verde. Se implementa el código mínimo que hace pasar esa prueba.
- Refactorización. Se ordena el diseño sin cambiar el comportamiento que la prueba ya fija.

Quien orquesta el Bolt revisa el diff, ejecuta la prueba y acepta el cambio cuando el rol previsto obtiene el efecto y el formulario valida los datos antes de enviarlos. Si el modelo propone la prueba, la persona comprueba que el oráculo coincide con el requisito, que el rol es el del catálogo y que la ruta existe. Un caso que llama a un endpoint inexistente se descarta.

El defecto que aparece después se reproduce primero con una prueba. No se desactiva la prueba para recuperar el verde.

#### Validación continua y asistencia de inteligencia artificial

El ciclo coloca la generación de la prueba dentro de Construction y vuelve a ejecutar la suite al integrar. El esfuerzo fuerte permanece en el criterio, en la arquitectura y en la comprobación, no en un cierre documental al final del proyecto.

La asistencia se usa con una finalidad concreta en cada momento:

| Uso | Finalidad | Límite |
| --- | --- | --- |
| Proponer el caso a partir del requisito | Acelerar el rojo del Bolt con rol, ruta y efecto observables | La persona borra el caso si la ruta no existe o si el oráculo afirma un comportamiento que el requisito no pide |
| Proponer datos de prueba | Cubrir el flujo válido, el dato inválido y el límite de las escalas y de los formularios | Los datos clínicos permanecen dentro de rangos verosímiles. No se acepta un generador cuyo oráculo no haya sido leído |
| Señalar zonas de riesgo | Orientar el orden de los casos hacia identidad, medicación, alerta y salida | Mientras no exista historial de caídas del proyecto, la prioridad la marca el criterio clínico del requisito |
| Explicar un fallo de la suite | Acortar la lectura del log y sugerir el diff mínimo | La persona contrasta la explicación con el requisito. El modelo no marca el job como verde |
| Sugerir una propiedad | Ampliar la prueba de ejemplo de una función pura a un invariante | La aserción nombra el invariante. No basta comprobar que la función no lanza una excepción |
| Mantener el script cuando cambia la pantalla | Indicar qué identificador estable y qué aserción deben actualizarse en el mismo Bolt | No se relaja la aserción para conservar un selector de presentación. La reparación automática de selectores queda fuera hasta que la suite de navegador sea pequeña y estable |

El papel de quien propone el código y el papel de quien revisa la prueba pueden recaer en la misma persona, en momentos distintos del Bolt. La revisión consiste en leer el caso, no en aceptarlo sin confrontarlo con el requisito.

### 4.2. Niveles de prueba

| Nivel | Descripción | Dónde se aplica en Vitalsy | Responsable |
| --- | --- | --- | --- |
| Unitarias | Una función o un objeto sin red ni base de datos | `News2Calculator`, `MorseFallScale`, `BradenScale`, `ButterworthFilter`, `RoleCatalog`, reglas de `inputRules.ts`, pasos del stepper y el dominio del teléfono (cola, línea de base, consentimiento, cifrado, plan, avisos) | Quien orquesta el Bolt |
| Integración | Varios componentes reales del mismo proceso | Pruebas de característica de Laravel contra la API, con la base de pruebas. En la web, Testing Library monta la página y comprueba el comportamiento visible sin abrir un navegador completo | Quien orquesta el Bolt |
| Funcionales | El comportamiento que el requisito pide, visto desde el actor, incluido el recorrido en navegador | El rol `admision` completa un paso; el rol `enfermera_piso` confirma una dosis; un rol sin permiso no ve la acción. El recorrido en navegador real lo especifican los casos de este plan | Quien orquesta el Bolt, en el momento de revisión |
| Aceptación | El criterio de la historia en el entorno integrado, con el rol correcto | La persona responsable del requisito acepta el Bolt cuando la prueba automática del criterio está en verde y el recorrido crítico se ha visto en la aplicación | Responsable del requisito |

### 4.3. Tipos de pruebas

| Tipo | Descripción | Herramienta | Momento |
| --- | --- | --- | --- |
| Funcionales | El recurso hace lo que el requisito nombra: crear el encuentro, avanzar el paso, firmar la indicación, administrar la dosis, acusar la alerta, registrar la salida | PHPUnit, Vitest, Jest | Cada Bolt |
| Validación de datos | Documento y teléfono solo con dígitos; campos obligatorios; alergias y observaciones opcionales cuando el formulario así los trata. El cliente muestra el error antes de enviar. El servidor rechaza el payload inválido | Vitest y PHPUnit | Bolts de admisión, atención y Life |
| Interfaz | Estado vacío, error, resultado, stepper que no enlaza un paso cerrado al rol, campana que deja de sonar al confirmar | Testing Library. El navegador real, en los tres recorridos que el plan especifica | Cada Bolt de pantalla y Operations |
| Seguridad básica | Sesión obligatoria en `/api/v1` salvo el login; diez intentos de login por minuto; el rol ajeno no ejecuta la acción; la cookie de sesión no se sustituye por un token inventado | PHPUnit. Trivy y Gitleaks quedan en el pipeline externo del laboratorio, no en el workflow de GitHub | Cada cambio de autenticación o de rol |
| Regresión | La suite de web y de API se repite en cada pull request hacia `dev` o `main`. Si más adelante la duración obliga a elegir, se priorizan los módulos tocados por el diff y los flujos de identidad, medicación, alerta y egreso | GitHub Actions | Operations |
| Propiedades | Invariantes de las reglas puras para muchas entradas, con semilla fija, además de los ejemplos ya escritos | Generador en la prueba de PHP y `fast-check` en Vitest, según especifica el plan | Bolt de admisión y censo, y Operations cuando se integran |
| Rendimiento y compuerta de laboratorio | Cobertura, duplicación y vulnerabilidades críticas que la guía del laboratorio atribuye a su pipeline incluido | Pipeline externo. Este repositorio no fija esos jobs en `.github/workflows/ci.yml` | Operations, sin afirmar una ejecución concreta de ese pipeline |
| Exploratoria | Recorrido no guionado del incremento, con el rol del Bolt, para ver un comportamiento que el caso escrito no nombró | Uso de la aplicación en el entorno de desarrollo | Cierre del Bolt, antes de la aceptación |

---

## 5. Entorno de pruebas

### 5.1. Hardware

El plan no fija una granja de servidores propia. El entorno comprobable es el puesto de desarrollo y el runner del workflow.

| Componente | Especificación que el proyecto define | Uso |
| --- | --- | --- |
| Puesto de desarrollo | Máquina capaz de ejecutar Docker Compose con Nginx, la web, la API y PostgreSQL | Pruebas locales y recorrido manual del Bolt |
| Navegador de escritorio | Cliente HTTP contra `http://localhost:8080` | Recorrido funcional de la web hospitalaria |
| Entorno móvil | Expo para Vitalsy Life. Health Connect cuando el caso de dispositivos lo exige | Suite Jest y comprobación de la app |
| Runner de integración | Node 24 y PHP 8.2, según el workflow de GitHub | Job `validate` |
| Entorno de laboratorio | Imágenes de la web y de la API publicadas por `docker-compose.prod.yml` | Despliegue descrito en la guía. El plan no da por ejecutada una corrida concreta |

### 5.2. Software

| Software | Versión o referencia del proyecto | Propósito en las pruebas |
| --- | --- | --- |
| Docker Compose | `docker-compose.yml` de desarrollo y `docker-compose.prod.yml` de laboratorio | Entorno integrado de la web, la API y PostgreSQL |
| Nginx | `nginx:1.27-alpine`, puertos 8080 y 8443 en desarrollo | Mismo origen para la cookie de sesión |
| Node.js | 24 en GitHub Actions; imagen `node:22-alpine` de la web | Vitest, build y, cuando el plan lo incorpora, la suite del teléfono |
| React y Vite | React 19 y Vite en `frontend/web` | Aplicación hospitalaria bajo prueba de componente |
| React Native y Expo | Expo SDK 57 y React Native 0.86 en `services/movil` | Aplicación ciudadana |
| PHP y Laravel | PHP 8.2 y Laravel 12 | API bajo prueba |
| Laravel Sanctum | 4.3, sesión por cookie | Autenticación de los casos de API y de navegador |
| PostgreSQL | 16 en Compose | Base de la aplicación en desarrollo y en el laboratorio |
| SQLite | Archivo de pruebas declarado en `phpunit.xml` | Base de PHPUnit, independiente del PostgreSQL de Docker |
| PHPUnit | 11, mediante `php artisan test` | Unidad clínica y característica de API |
| Vitest y Testing Library | Vitest 3, jsdom, cobertura LCOV | Componentes y dominio de la web |
| Jest y jest-expo | Script `npm test` en `services/movil` | Dominio y componentes de Vitalsy Life |
| Laravel Pint | `vendor/bin/pint --test` en el job | Estilo PHP. No sustituye una prueba de comportamiento |
| ESLint | Scripts de la web | Revisión local de la web. No es un paso del workflow de GitHub |
| GitHub Actions | `.github/workflows/ci.yml` | Regresión de web, build, API y Pint |
| Cypress | Lo incorpora este plan para los recorridos de navegador | No hay configuración Cypress en el árbol. El caso queda especificado aquí |
| fast-check | Lo incorpora este plan como dependencia de desarrollo de la web | Propiedades de `inputRules` y, si el cálculo está duplicado en la web, de NEWS2 |
| SonarQube, Trivy y Gitleaks | Nombrados en la guía del laboratorio y en `project.yml` | Compuerta externa. No están definidos como jobs del workflow de GitHub |
| Asistente de código del entorno | Cursor, con las reglas del repositorio | Borradores de prueba. No es un servicio de ejecución |

### 5.3. Datos de prueba

- Cuentas de demostración del seeder: una cuenta activa `{rol}@vitalsy.local` por cada clave de `RoleCatalog`, cuando existe `DEMO_PASSWORD`. El catálogo comprende admisión, celador, enfermera de piso, auxiliar de enfermería, médico residente, médico tratante, enfermera supervisora, equipo de respuesta rápida, trabajo social, altas y caja, gestión de camas, servicios generales, jefatura de enfermería y recursos humanos.
- Las pruebas de API construyen sus usuarios en SQLite. No dependen de la contraseña de la máquina de quien desarrolla.
- Los recorridos de navegador que el plan especifica crean o siembran un usuario en el entorno que levantan. No leen un `.env` privado.
- Constantes fisiológicas verosímiles para NEWS2, incluidos el paciente estable con puntaje cero y el parámetro único de tres puntos que marca urgencia. Los valores imposibles deben ser rechazados por la valoración.
- Ítems de Morse y de Braden dentro del dominio de cada subescala, y un ítem fuera de rango para el rechazo.
- Documento y teléfono formados solo por dígitos, y las mismas cadenas con letras para el error de validación.
- Encuentros en pasos distintos del ingreso para el censo, incluida la búsqueda por nombre, documento o código de brazalete, y la exclusión de quien ya egresó.
- Alertas abiertas y cerradas, con plazo de acuse y seguimiento de quince minutos, para la bandeja y la campana.
- Prescripción con ítems y conciliación con medicación habitual y sin ella, para el plan basal del e-MAR.
- En el teléfono: lecturas locales, cola sin red, código de vinculación con el intercambio cerrado y un cuerpo de plan solo cuando la respuesta del cliente es correcta. Un HTTP fallido no se trata como sincronización lograda.
- No se copian contraseñas reales a archivos versionados. En la integración, la contraseña de prueba vive solo en el workflow.

### 5.4. Configuración del entorno

- Desarrollo: `docker compose up` publica Nginx en el puerto 8080, la API en el puerto 8000 y PostgreSQL en el puerto 5432. El entrypoint de la API espera la base, instala dependencias, migra, siembra y arranca `artisan serve`.
- El navegador llama a `/api` en el puerto 8080. Nginx reenvía `/api`, `/sanctum` y `/up` a la API. La cookie de sesión permanece en el mismo sitio.
- PHPUnit usa las suites `tests/Unit` y `tests/Feature`, con SQLite en archivo. En el workflow se copia `.env.example`, se genera `APP_KEY` y se crea `database/testing.sqlite` antes de `php artisan test`.
- Vitest se lanza con `vitest run` y cobertura LCOV, después de `npm ci` a partir del lockfile.
- Jest usa el preset `jest-expo`. El comando local es `npm test` en `services/movil`. El plan establece que ese comando entre al workflow.
- Laboratorio: `docker-compose.prod.yml` publica la web en el puerto 4200 y la API en el puerto 3000, con `APP_ENV=production` y sin montar el código. El plan distingue ese perfil del entorno de desarrollo y no lo trata como si ya se hubiera certificado una corrida.
- Navegador automatizado: el plan fija Cypress en `frontend/web`, con URL base `http://localhost:8080` cuando el Compose de desarrollo está arriba, o la vía única de preview que quede escrita en la configuración el día en que se añada. Hasta que ese job exista, el recorrido de navegador no forma parte de la integración automática.
- El comando `alerts:process-slas` forma parte de los casos de alerta y de cumplimiento. No hay un contenedor dedicado que lo programe. La prueba de característica invoca el comportamiento que ese comando cubre, sin exigir un scheduler que el Compose no define.

---

## 6. Recursos

### 6.1. Equipo de trabajo: roles y responsabilidades

El catálogo clínico no incluye un rol de aseguramiento de calidad. La responsabilidad de la prueba recae en quien orquesta el Bolt.

| Rol en el proceso de pruebas | Responsabilidad | Participación |
| --- | --- | --- |
| Persona que orquesta el Bolt | Contrasta el plan de la unidad con el requisito, acepta o rechaza la prueba y el código, ejecuta la suite del paquete tocado y no integra con la suite en rojo | Todas las fases |
| La misma persona, en el momento de revisión del caso | Lee el oráculo, el rol y la ruta. Separa ese momento de la aceptación automática de un borrador | Construction y Operations |
| Responsable del requisito | Acepta el Bolt cuando la prueba del criterio está en verde y el recorrido crítico se ha visto en la aplicación | Cierre de cada Bolt |
| Pipeline de GitHub | Repite Vitest, el build, PHPUnit y Pint en `main` y `dev` | Operations |
| Pipeline externo del laboratorio | Aplica, según la guía, las etapas de prueba, seguridad, calidad y compuerta. Esos jobs no están escritos en este repositorio | Operations, como referencia de la compuerta, no como evidencia de una corrida |

### 6.2. Herramientas de testing

| Herramienta | Tipo | Papel en el plan |
| --- | --- | --- |
| PHPUnit 11 | Unidad y característica de API | Ejecutor real del backend |
| Vitest 3 y Testing Library | Componente y dominio de la web | Ejecutor real de la web |
| Jest y jest-expo | Dominio y componente del teléfono | Ejecutor real de Vitalsy Life. El plan establece su entrada al workflow |
| Pint | Estilo PHP | Paso del job `validate`. No mide comportamiento clínico |
| GitHub Actions | Integración continua | Regresión de web y API |
| Cypress | Recorrido de navegador | Especificado por el plan para login y censo |
| Generador de propiedades en PHP y fast-check | Propiedades de reglas puras | Especificado por el plan |
| Asistente del entorno | Borrador de casos, datos y lectura de fallos | Siempre con revisión humana |
| Salida de consola y estado del job | Evidencia inmediata | No hay un tablero de defectos aparte en el repositorio |

---

## 7. Planificación y cronograma

El orden de las pruebas es el de las fases de desarrollo. No hay un calendario de una fase de pruebas al final del proyecto: la ejecución acompaña cada cambio. Por eso este apartado no asigna semanas ni fechas de un calendario que el sistema no fijó.

### 7.1. Fases de pruebas

| Fase | Actividades clave | Método | Cierre |
| --- | --- | --- | --- |
| Inception | Descomponer el intent en unidades, nombrar actor y criterio, y dejar trazado el requisito hacia el caso que Construction deberá fijar | Revisión humana del criterio antes de modificar el código | La unidad tiene criterio comprobable y el plan de esa unidad está aceptado |
| Construction | Por cada Bolt: escribir la prueba en rojo, implementar el mínimo, refactorizar con la prueba en verde, y revisar rol, validación y efecto | TDD, con borrador asistido cuando ayude | La persona acepta el diff y la suite del paquete está en verde |
| Operations | Repetir la suite en cada push y pull request, corregir el fallo en una rama `bugfix/RF-XX-*` con una prueba que lo reproduzca, y mantener el estilo PHP | Validación continua | El job que corresponde está en verde y el defecto crítico no queda sin prueba de regresión |

Dentro de Construction el orden de los Bolts es el del desarrollo del sistema:

1. Plataforma.
2. Acceso.
3. Admisión y censo.
4. Atención.
5. Alertas.
6. Egreso, camas y personal.
7. Vitalsy Life.
8. Pizarra clínica.

Operations no espera a que termine el último Bolt para empezar. Cada Bolt ya integrado vuelve a comprobarse en el job. El fallo de uso abre otro ciclo de Construction.

### 7.2. Fechas clave

Los hitos son condiciones, no fechas de calendario.

| Hito | Descripción | Condición para darlo por cumplido |
| --- | --- | --- |
| Unidad lista para construir | Inception cerró actor, acción y criterio de la unidad | El criterio puede expresarse como una prueba que falla |
| Prueba en rojo | El caso del Bolt está escrito y revisado | Falla por el comportamiento ausente, no por un error de sintaxis ajeno al criterio |
| Prueba en verde en local | El código mínimo cumple el criterio | `npm test` o `php artisan test` del paquete tocado termina sin fallos del caso |
| Integración de web y API | El cambio entra a `dev` o a `main` | El job `validate` está en verde |
| Suite del teléfono en el mismo gatillo | El plan establece el paso de Jest en el workflow | El YAML contiene `npm test` con directorio de trabajo `services/movil` y un fallo de esa suite detiene el job |
| Recorrido de navegador | Login rechazado, login de admisión y censo | Los tres casos del plan están automatizados y un job los ejecuta contra una API sembrada |
| Propiedades de las reglas puras | NEWS2, Morse, Braden y validación de documento y teléfono | Las aserciones nombran el invariante y usan semilla fija |
| Umbral de cobertura | Meta de laboratorio de 80 %, aplicada en GitHub solo tras medir | El umbral configurado no supera el porcentaje ya observado. Este plan no publica ese porcentaje |
| Corrección de un fallo de uso | El defecto vuelve a Construction | Existe la prueba que lo reproduce y la suite del módulo vuelve a verde |
| Aceptación del Bolt | El responsable del requisito cierra la unidad | Prueba del criterio en verde y recorrido crítico visto en la aplicación |

### 7.3. Hitos del Bolt

Estos hitos sustituyen un ritual de iteración temporal. Se aplican a cada Bolt de Construction y a cada corrección que Operations devuelve a Construction.

**Listo para empezar**

- El requisito nombra actor, acción y criterio.
- Los datos de ejemplo del caso están definidos y no dependen de un secreto privado.
- El entorno del paquete arranca: Compose para un recorrido integrado, SQLite para la API, jsdom para la web o Jest para el teléfono.
- Si el modelo propuso el caso, una persona ya comprobó el oráculo.

**Hecho**

- La prueba del criterio está en verde en local y en el workflow que corresponda a ese paquete.
- Si el cambio toca un recurso protegido, el rol no autorizado es rechazado.
- El formulario afectado valida antes de enviar cuando el caso es de interfaz.
- No se baja el umbral ni se desactiva la prueba para hacer pasar el cambio.
- El defecto encontrado, si lo hubo, queda reproducido por una prueba.

---

## 8. Criterios de entrada y salida

### 8.1. Condiciones para iniciar las pruebas

| Criterio de entrada | Responsable | Estado requerido |
| --- | --- | --- |
| Criterio de aceptación de la unidad escrito y aceptado por una persona | Quien orquesta el Bolt | Aceptado en Inception |
| Prueba del criterio escrita, o borrador leído y corregido | Quien revisa el caso | Lista para ejecutarse en rojo |
| Entorno del paquete disponible | Quien orquesta el Bolt | Compose, SQLite, Vitest o Jest según el Bolt |
| Datos de prueba reproducibles y sin secretos versionados | Quien orquesta el Bolt | Usuarios de la prueba creados por la propia suite o por el seeder de demostración |
| Rutas y roles contrastados con `routes/api.php` y `RoleCatalog` | Quien revisa el caso | Sin endpoints inventados |
| Para un recorrido de navegador, aplicación accesible en el origen previsto | Quien orquesta el Bolt | Puerto 8080 en desarrollo, o la URL que la configuración del recorrido deje escrita |
| Para la integración, workflow capaz de instalar dependencias y ejecutar la suite de web y API | Pipeline | Job `validate` definido |

### 8.2. Condiciones para finalizar las pruebas

Los umbrales son los que el plan exige para cerrar. No son un informe de una corrida ya hecha.

| Criterio de salida | Umbral del plan | Verificación |
| --- | --- | --- |
| Casos del criterio del Bolt | Todos en verde | PHPUnit, Vitest o Jest |
| Rol no autorizado en un recurso protegido tocado por el cambio | Rechazo con el código que el middleware devuelve y sin efecto de negocio | Prueba de característica |
| Defectos de severidad crítica abiertos | Cero, o cada uno reproducido por una prueba y devuelto a Construction | Rama `bugfix/RF-XX-*` |
| Defectos de severidad alta | Cerrados en el Bolt o con prueba de reproducción y decisión explícita de la persona responsable | Misma evidencia |
| Regresión de web y API | Job `validate` en verde para integrar a `dev` o `main` | GitHub Actions |
| Estilo PHP | Pint de acuerdo en el job | `pint --test` |
| Cobertura | Meta de laboratorio 80 %. En GitHub, umbral igual al porcentaje medido si ese porcentaje es menor, y 80 % si la medición ya lo alcanza | Se aplica cuando la medición exista. Este plan no fija el entero medido |
| Recorrido crítico del Bolt | Visto en la aplicación por quien acepta el requisito | Aceptación del Bolt |
| Oráculo asistido | Revisado antes de entrar a la suite | Lectura humana registrada en la revisión del cambio |
| Informe de la corrida | Salida del ejecutor y estado del job. El plan no exige un acta distinta mientras ese sea el registro vigente | Consola y job |

---

## 9. Inventario de pruebas por fase

El inventario sigue las fases del desarrollo. En cada Bolt se listan los casos que expresan el criterio. Cuando el caso tiene script en el repositorio, la columna de evidencia indica esa ruta. Cuando el caso lo especifica este plan, la evidencia es la especificación misma y la ruta asignada al script que deberá contenerlo.

La prioridad alta corresponde a identidad del paciente, medicación, alerta y salida. La prioridad media corresponde al resto del flujo clínico y a la validación. La prioridad baja corresponde al arranque del framework y al ajuste visual que no cambia una regla clínica.

### Resumen por fase

| Fase | Elementos a probar | Tipo de prueba | Automatización | Entregable |
| --- | --- | --- | --- | --- |
| Inception | Criterios de RF-01 a RF-100 y trazabilidad hacia el caso | Revisión del criterio | El plan deja el caso listo para el rojo de Construction | Matriz requisito–caso de esta sección |
| Construction, plataforma | Monorepo, esquema tras migrar | Característica de esquema | PHPUnit | `SchemaCoverageTest` |
| Construction, acceso | Sesión, catálogo y navegación por rol | Unidad, característica y componente | PHPUnit y Vitest | Scripts de acceso y aceptación del Bolt |
| Construction, admisión y censo | Pasos del ingreso, censo, escalas y validación | Unidad, característica, componente y propiedades | PHPUnit y Vitest. Las propiedades las especifica el plan | Scripts de admisión y casos de propiedad |
| Construction, atención | LIS, PACS, visita, evolución, CPOE, monitoreo, e-MAR, controles, cuidados y expediente | Característica y componente | PHPUnit y Vitest | Scripts del prefijo de atención |
| Construction, alertas | Bandeja, deterioro, acuse, escalamiento, campana y sirena | Característica, componente y audio | PHPUnit y Vitest | Scripts de alertas |
| Construction, egreso, camas y personal | Cadena de alta, censo de camas, limpieza y roster | Característica y componente | PHPUnit y Vitest | Scripts de los tres módulos |
| Construction, Vitalsy Life | Acceso, cola, línea de base, plan, privacidad y cliente | Unidad y componente | Jest. El plan establece su ejecución en el workflow | Scripts de `services/movil` |
| Construction, pizarra | Conducta ya fijada de los módulos 2 a 6 con el lenguaje visual común | Regresión de componente | Vitest | Suite de esos módulos en verde tras el cambio visual |
| Operations | Regresión, estilo, corrección y compuerta | Regresión y los casos que el plan añade al workflow | GitHub Actions. Cypress y el umbral quedan especificados | Estado del job y prueba de regresión del defecto |

### Trazabilidad

| Requisito | Funcionalidad | Casos | Resultado esperado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-99 a RF-100 | Sesión y catálogo de roles | CP-ACC-01 a CP-ACC-14 | El rol del catálogo entra, la sesión se consulta y se cierra, y un rol ajeno no abre la acción clínica | `AuthApiTest`, `RoleCatalogTest`, `RoleAccountsSeederTest`, `login.test.tsx`, `roles.test.ts`, `navigation.test.tsx` |
| RF-01 a RF-20 | Ingreso, censo y escalas basales | CP-ADM-01 en adelante | El paso avanza con el rol responsable, el dato inválido se rechaza y NEWS2, Morse y Braden aplican sus cortes | `HospitalAdmissionApiTest`, `AdmissionCensusApiTest` y las pruebas de componente y de dominio de admisión |
| RF-21 a RF-38 | Atención del hospitalizado | CP-ATE-01 en adelante | Laboratorio, imagen, visita, evolución, prescripción, constantes, e-MAR, controles, cuidados y expediente responden al rol previsto | Pruebas de característica `*ApiTest` de atención y los `*.test.tsx` del módulo |
| RF-39 a RF-53 | Alerta y cumplimiento | CP-ALE-01 en adelante | La alerta llega al rol, el acuse detiene la sirena y el tiempo sin respuesta escala | `ClinicalAlertsApiTest`, `MonitoringControlsAndComplianceTest` y las pruebas de campana |
| RF-54 a RF-67 | Alta y egreso | CP-EGR-01 en adelante | La cadena de entregables se respeta y la salida física la confirma la enfermera de piso | `DischargeApiTest`, `discharge.test.tsx` |
| RF-68 a RF-77 | Camas y limpieza | CP-CAM-01 en adelante | El egreso libera la cama y abre la desinfección | `BedManagementApiTest`, `bed-management.test.tsx` |
| RF-78 a RF-88 | Personal | CP-PER-01 en adelante | El rol mensual, la asignación y la entrega de turno quedan firmados por el actor previsto | `StaffRosterApiTest`, `staff-roster.test.tsx` |
| RF-89 a RF-98 | Vitalsy Life | CP-LIF-01 en adelante | La app conserva la lectura local, no presenta una sincronización inexistente como lograda y el plan se activa con un cuerpo válido | Pruebas Jest de `services/movil` |
| RNF-16 | Lenguaje visual de pizarra | CP-PIZ-01 | Los casos de atención, alertas, egreso, camas y personal siguen cumpliendo su oráculo | Regresión de esas suites |

### 9.1. Fase de Inception

**Objetivo.** Dejar cada unidad con un criterio que Construction pueda convertir en una prueba, sin modificar todavía el código de producto.

**Elementos.** El intent de plataforma hospitalaria y de línea de base ciudadana. Las unidades y los rangos RF-01 a RF-20, RF-21 a RF-38, RF-39 a RF-53, RF-54 a RF-67, RF-68 a RF-77, RF-78 a RF-88, RF-89 a RF-98 y RF-99 a RF-100. El catálogo de catorce roles como contrato entre la interfaz y la API.

| ID | Caso | Precondición | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- |
| CP-INC-01 | Cada unidad nombra actor, acción y criterio de aceptación | El texto del requisito de esa unidad está disponible | El criterio describe un efecto observable que una prueba puede fijar | Alta |
| CP-INC-02 | El catálogo de roles de la unidad coincide con las catorce claves vigentes | Se contrasta el actor del requisito con `RoleCatalog` | No se introduce una clave genérica de enfermería o de medicina, ni un administrador de accesos ausente del catálogo | Alta |
| CP-INC-03 | La trazabilidad requisito–caso queda apuntada a los identificadores de este inventario | La unidad fue aceptada por una persona | Construction parte de un caso ya identificado, con rol y efecto | Media |
| CP-INC-04 | Los datos de ejemplo no incluyen secretos ni pacientes reales | Se revisa el borrador del caso | Las cuentas son de demostración o las crea la propia prueba | Alta |

**Criterio para dar por satisfecha la fase.** La persona acepta la unidad y Construction puede escribir la prueba en rojo. **Entregable:** la matriz de trazabilidad de este capítulo y el criterio aceptado de la unidad.

### 9.2. Fase de Construction

#### Bolt de plataforma

**Objetivo.** Comprobar que el monorepo separa la web y la API, que el esquema mínimo existe después de migrar y que el arranque de la suite no se confunde con un caso clínico.

| ID | Caso | Script | Tipo | Precondición | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- | --- |
| CP-PLT-01 | Las tablas de dominio y las banderas de usuario existen tras migrar | `backend/api/tests/Feature/SchemaCoverageTest.php` (`test_core_domain_tables_and_user_flags_exist_after_migrate`) | Integración | Migraciones de prueba aplicadas sobre SQLite | El esquema mínimo del dominio está presente | Alta |
| CP-PLT-02 | La aplicación de prueba responde | `backend/api/tests/Feature/ExampleTest.php` (`test_the_application_returns_a_successful_response`) | Humo del framework | Aplicación de prueba levantada | Respuesta de arranque del framework. No es un criterio clínico | Baja |
| CP-PLT-03 | El ejemplo unitario del framework se ejecuta | `backend/api/tests/Unit/ExampleTest.php` (`test_that_true_is_true`) | Humo del framework | Suite unitaria disponible | El ejecutor PHPUnit arranca. No es un criterio clínico | Baja |
| CP-PLT-04 | La web de prueba muestra el encabezado del sistema | `frontend/web/src/App.test.tsx` | Componente | Aplicación montada en jsdom | Se reconoce el encabezado Vitalsy | Baja |

**Caso de diseño del entorno.** El plan establece que el arranque integrado se comprueba con `docker compose up` y el origen en el puerto 8080: Nginx enruta `/api`, `/sanctum` y `/up` a la API, y el resto a la web. Ese recorrido de infraestructura acompaña al primer caso de navegador de acceso. No sustituye a `SchemaCoverageTest`.

**Criterio de satisfacción.** El Bolt queda satisfecho cuando la migración de prueba crea el esquema mínimo y la suite arranca. CP-PLT-02 y CP-PLT-03 comprueban el arranque del framework y no se usan como criterio clínico. **Entregable:** resultado de PHPUnit de los casos de esquema y de humo.

#### Bolt de acceso

**Objetivo.** Fijar la sesión por cookie, el catálogo de roles y el menú que cada perfil puede abrir. Cubre RF-99 y RF-100.

| ID | Caso | Script | Tipo | Precondición | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- | --- |
| CP-ACC-01 | El login funciona sin cabecera de origen para clientes de red local | `AuthApiTest::test_login_works_without_origin_header_for_lan_clients` | Característica | Usuario de prueba | La sesión inicia | Alta |
| CP-ACC-02 | Credenciales desconocidas se rechazan en español | `AuthApiTest::test_login_rejects_unknown_credentials_in_spanish` | Característica | Credencial inexistente | Mensaje de error en español y sin sesión clínica | Alta |
| CP-ACC-03 | El login abre sesión y el logout la cierra | `AuthApiTest::test_login_starts_a_session_and_logout_ends_it` | Característica | Credencial válida | `GET /api/v1/auth/me` refleja la sesión y el logout la termina | Alta |
| CP-ACC-04 | Un rol de apoyo entra y permanece fuera de las rutas clínicas | `AuthApiTest::test_support_role_signs_in_and_stays_out_of_clinical_routes` | Seguridad | Rol de apoyo autenticado | Las rutas clínicas lo rechazan | Alta |
| CP-ACC-05 | El invitado y el rol equivocado no abren una orden de ingreso | `AuthApiTest::test_guest_and_wrong_role_cannot_open_an_admission_order` | Seguridad | Sin sesión, o con un rol ajeno | La orden no se abre | Alta |
| CP-ACC-06 | El catálogo cubre a cada actor de proceso | `RoleCatalogTest::test_catalog_covers_every_process_actor` | Unitaria | Catálogo cargado | Están las catorce claves | Alta |
| CP-ACC-07 | Cada clave tiene la etiqueta de su actor | `RoleCatalogTest::test_catalog_labels_each_role_with_its_process_actor` | Unitaria | Catálogo cargado | La etiqueta corresponde al actor del proceso | Media |
| CP-ACC-08 | Las claves legadas o desconocidas se rechazan | `RoleCatalogTest::test_catalog_rejects_legacy_and_unknown_keys` | Unitaria | Clave fuera del catálogo | El catálogo no la acepta | Alta |
| CP-ACC-09 | El seeder crea una cuenta activa por rol | `RoleAccountsSeederTest::test_seeder_creates_one_active_account_per_catalog_role` | Integración | Seeder ejecutado en la base de prueba | Una cuenta activa por clave | Alta |
| CP-ACC-10 | El seeder no conserva roles genéricos legados | `RoleAccountsSeederTest::test_seeder_does_not_keep_legacy_generic_roles` | Integración | Seeder ejecutado | No quedan claves genéricas de enfermería o de medicina | Alta |
| CP-ACC-11 | El formulario no se envía si faltan correo o contraseña | `frontend/web/src/app/login.test.tsx` | Componente | Formulario vacío | El cliente muestra el error y no llama al login | Alta |
| CP-ACC-12 | La contraseña puede mostrarse y ocultarse | `login.test.tsx` | Componente | Campo de contraseña | El control del ojo alterna la visibilidad | Baja |
| CP-ACC-13 | El error del servidor se muestra y la credencial válida entra | `login.test.tsx` | Componente | Respuesta de error y luego credencial válida | Mensaje visible y paso al ingreso | Alta |
| CP-ACC-14 | Enfermería y medicina permanecen separadas, el catálogo incluye a los actores de alertas, egreso, camas y personal, cada rol lleva su etiqueta y solo se reconocen claves válidas | `frontend/web/src/app/roles.test.ts` | Unitaria | Catálogo de la web | Misma frontera de roles que la API | Alta |
| CP-ACC-15 | El menú del tratante muestra las acciones de atención; enfermería de piso ve e-MAR y constantes; un rol de apoyo de camas no recibe el censo de admisión; los roles clínicos de alertas conservan el censo; la ruta directa del censo se bloquea sin permiso | `frontend/web/src/app/navigation.test.tsx` | Componente | Sesión del rol indicado | Cada perfil ve solo sus destinos | Alta |
| CP-ACC-16 | El inicio conserva los accesos del perfil y la cola de trabajo, y admisión no muestra métricas clínicas inventadas | `frontend/web/src/app/HomePage.test.tsx` | Componente | Sesión del perfil | La cola y los accesos coinciden con el rol | Media |
| CP-ACC-17 | La sesión se cierra a los cinco minutos sin actividad y el plazo se reinicia si hay actividad | `frontend/web/src/app/idleTimer.test.ts` | Unitaria | Temporizador de inactividad | Cierre a los cinco minutos, o reinicio ante actividad | Media |
| CP-ACC-18 | El mensaje de error destinado al usuario se conserva, el error técnico se sustituye por un texto comprensible y se usa el primer error de validación de Laravel | `frontend/web/src/app/userMessage.test.ts` | Unitaria | Cuerpo de error | Texto en español comprensible | Media |
| CP-ACC-19 | Solo se aceptan rutas internas de retorno y se componen `next` e ingreso | `frontend/web/src/shared/navigation/returnTo.test.ts` | Unitaria | Parámetro de retorno | No se redirige fuera de la aplicación | Media |
| CP-ACC-20 | El shell anuncia el título, permite saltar al contenido, cambia la navegación según el perfil, no muestra códigos de requisito y explica el acceso denegado | `frontend/web/src/app/AppShell.test.tsx` | Componente | Sesión y un acceso denegado | Navegación y mensaje acordes al perfil | Media |

**Casos de navegador que el plan especifica**

El plan establece tres especificaciones, con identificadores estables `login-email`, `login-password`, `login-submit`, `census-query` y `census-search`. El selector de la prueba es ese identificador, no una clase de presentación.

| ID | Funcionalidad | Escenario | Precondiciones | Datos de entrada | Pasos | Resultado esperado | Tipo | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CP-ACC-E01 | Login | Credencial rechazada | Aplicación servida sin sesión | Correo y contraseña que no corresponden a un usuario sembrado | Visitar la raíz. Completar los campos. Enviar | Permanece el formulario de acceso | Funcional de navegador | Alta |
| CP-ACC-E02 | Login | Credencial aceptada | Usuario `admision@vitalsy.local` sembrado en el entorno del recorrido, con la contraseña de prueba de ese entorno | Correo y contraseña de esa cuenta | Visitar la raíz. Completar los campos. Enviar | La URL deja de ser la de login y aparece el inicio del rol | Funcional de navegador | Alta |
| CP-ACC-E03 | Censo | El rol de admisión ve el listado | Sesión obtenida en CP-ACC-E02 | Ninguno adicional | Abrir `/pacientes` | El campo `census-query` está visible | Funcional de navegador | Alta |

**Criterio de satisfacción.** El Bolt de acceso queda satisfecho cuando CP-ACC-01 a CP-ACC-20 terminan sin fallos en su ejecutor. CP-ACC-E01 a CP-ACC-E03 son especificación de este plan: el recorrido de navegador queda satisfecho cuando su script forma parte del job y esos tres casos terminan sin fallos. **Entregable:** salida de PHPUnit y de Vitest del acceso, y el script de navegador que el plan incorpora al workflow.

#### Bolt de admisión y censo

**Objetivo.** Comprobar el ingreso por pasos, el censo y las escalas basales. Cubre RF-01 a RF-20.

**API de admisión** (`backend/api/tests/Feature/HospitalAdmissionApiTest.php`)

| ID | Caso | Tipo | Precondición | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- |
| CP-ADM-01 | `test_admission_order_returns_the_order_or_a_spanish_not_found` | Característica | Orden conocida o desconocida | La orden conocida se devuelve. La desconocida responde no encontrada, en español | Alta |
| CP-ADM-02 | `test_filiation_requires_name_in_spanish_and_accepts_a_valid_payload` | Validación | Filiación sin nombre y filiación válida | Error en español si falta el nombre. Alta si el payload es válido | Alta |
| CP-ADM-03 | `test_coverage_referral_wristband_record_and_consent_are_created` | Característica | Ingreso en curso | Se crean cobertura, derivación, brazalete, expediente y consentimiento | Alta |
| CP-ADM-04 | `test_referral_phone_rejects_letters` | Validación | Teléfono de derivación con letras | El servidor rechaza el teléfono | Alta |
| CP-ADM-05 | `test_transfer_and_wristband_codes_are_independent_per_patient` | Característica | Dos pacientes | El código de traslado y el de brazalete no se comparten | Alta |
| CP-ADM-06 | `test_transfer_identity_reception_and_relocation` | Característica | Traslado emitido | Identidad, recepción y reubicación avanzan para el paciente en curso | Alta |
| CP-ADM-07 | `test_nursing_vitals_calculate_news2_and_reject_impossible_values` | Funcional | Constantes válidas e imposibles | NEWS2 se calcula. El valor imposible se rechaza | Alta |
| CP-ADM-08 | `test_admission_vitals_with_news2_open_a_clinical_alert` | Funcional | Constantes que elevan NEWS2 | Se abre una alerta clínica | Alta |
| CP-ADM-09 | `test_reconciliation_risk_kardex_and_signature` | Funcional | Valoración previa | Conciliación, riesgo, kardex y firma quedan registrados | Alta |
| CP-ADM-10 | `test_tratante_can_sign_medical_orders` | Seguridad | Sesión de médico tratante | Las indicaciones se firman | Alta |
| CP-ADM-11 | `test_medical_orders_default_template_without_prior_payload` | Funcional | Sin payload previo de plantilla | Se ofrece la plantilla por defecto | Media |
| CP-ADM-12 | `test_signing_orders_creates_basal_emar_plan_from_bpmh` | Funcional | Conciliación con medicación habitual | La firma crea el plan basal del e-MAR | Alta |
| CP-ADM-13 | `test_signing_without_home_medications_does_not_create_a_plan` | Funcional | Paciente sin medicación habitual | No se crea un plan | Alta |

**API de censo** (`backend/api/tests/Feature/AdmissionCensusApiTest.php`)

| ID | Caso | Tipo | Precondición | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- |
| CP-ADM-14 | `test_census_lists_the_three_review_patients_at_different_stages` | Característica | Tres ingresos de revisión en pasos distintos | El censo los lista | Alta |
| CP-ADM-15 | `test_census_ignores_patients_who_already_left_the_hospital` | Característica | Un ingreso ya egresado | El egresado no aparece en el censo de pacientes | Alta |
| CP-ADM-16 | `test_census_filters_by_patient_name_or_document` | Característica | Nombre o documento de búsqueda | El filtro devuelve al paciente correspondiente | Alta |
| CP-ADM-17 | `test_census_paginates_ten_per_page` | Característica | Más de diez ingresos | Cada página contiene diez | Media |
| CP-ADM-18 | `test_file_shows_deliverables_and_unknown_encounter_is_spanish_not_found` | Característica | Ficha conocida y encuentro desconocido | La ficha muestra entregables. El desconocido responde en español | Media |
| CP-ADM-19 | `test_only_the_responsible_role_can_advance_the_current_step` | Seguridad | Rol responsable y rol ajeno | Solo el responsable avanza el paso en curso | Alta |
| CP-ADM-20 | `test_approving_coverage_continues_to_wristband_instead_of_referral` | Funcional | Cobertura aprobada | El siguiente paso es el brazalete | Alta |
| CP-ADM-21 | `test_pending_patient_stays_independent_from_a_waiting_referral` | Funcional | Un ingreso pendiente y una derivación en espera | Cada caso conserva su estado | Media |
| CP-ADM-22 | `test_encounter_file_exposes_registered_coverage_referral` | Funcional | Derivación registrada | La ficha muestra esa derivación | Media |
| CP-ADM-23 | `test_closing_the_admission_removes_it_from_the_physician_queue` | Funcional | Ingreso que se cierra | Sale de la cola del médico | Media |
| CP-ADM-24 | `test_tratante_can_advance_indicaciones_step` | Seguridad | Sesión de médico tratante en indicaciones | Puede avanzar ese paso | Alta |
| CP-ADM-25 | `test_rejected_coverage_does_not_open_the_wristband_step` | Funcional | Cobertura rechazada | El brazalete no se abre | Alta |
| CP-ADM-26 | `test_opening_a_known_order_reuses_the_encounter_and_unknown_order_is_not_found` | Funcional | Orden conocida y orden desconocida | La conocida reutiliza el encuentro. La desconocida no se encuentra | Alta |
| CP-ADM-27 | `test_manual_and_external_intake_create_independent_encounters` | Funcional | Un ingreso manual y uno externo | Cada uno crea su encuentro | Media |

**Reglas de dominio**

| ID | Caso | Script | Tipo | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- |
| CP-ADM-28 | Paciente estable: puntaje 0, riesgo bajo y verde | `News2CalculatorTest::test_stable_patient_scores_zero_low_and_green` | Unitaria | NEWS2 estable en cero | Alta |
| CP-ADM-29 | Un parámetro de tres puntos marca urgencia aunque el agregado sea bajo-medio | `News2CalculatorTest::test_single_parameter_of_three_is_urgent_low_medium` | Unitaria | Urgencia por parámetro único | Alta |
| CP-ADM-30 | La escala 2 puntúa distinto el oxígeno y el aire | `News2CalculatorTest::test_scale_two_scores_oxygen_and_air_differently` | Unitaria | Puntajes distintos según aire u oxígeno | Alta |
| CP-ADM-31 | La confusión crónica no puntúa | `News2CalculatorTest::test_chronic_confusion_does_not_score` | Unitaria | Confusión crónica sin puntos | Alta |
| CP-ADM-32 | Morse usa los cortes de cuidado agudo | `RiskScaleTest::test_morse_uses_acute_care_cutoffs` | Unitaria | Bandas de cuidado agudo | Alta |
| CP-ADM-33 | Braden: menor puntaje, mayor riesgo, y fricción inválida rechazada | `RiskScaleTest::test_braden_lower_score_means_higher_risk_and_rejects_invalid_friction` | Unitaria | Sentido de la escala y rechazo | Alta |
| CP-ADM-34 | Braden cubre alto, moderado, leve y ninguno | `RiskScaleTest::test_braden_bands_cover_high_moderate_mild_and_none` | Unitaria | Las cuatro bandas | Media |
| CP-ADM-35 | Una subescala de Braden fuera de 1 a 4 se rechaza | `RiskScaleTest::test_braden_rejects_a_subscale_outside_one_to_four` | Unitaria | Rechazo del ítem | Alta |
| CP-ADM-36 | `digitsOnly` elimina letras y respeta el tope; el documento y el teléfono exigen dígitos; el texto obligatorio marca vacíos y el opcional en blanco no genera error propio | `frontend/web/src/shared/validation/inputRules.test.ts` | Unitaria | Validación de cliente antes de enviar | Alta |
| CP-ADM-37 | NEWS2 de la web aplica umbrales de respiración, escala de SpO2, presión, pulso, temperatura, consciencia y oxígeno suplementario, y clasifica 5–6 como medio y 7 o más como alto | `frontend/web/src/modules/nursing-assessment/domain/news2.test.ts` | Unitaria | Misma regla clínica en el cliente | Alta |
| CP-ADM-38 | Morse suma ítems hasta 125, usa cortes 0–24, 25–44 y 45 o más, y la recomendación no depende solo del nombre de un color. Braden suma seis subescalas, usa sus cortes y rechaza fricción fuera de 1 a 3 | `frontend/web/src/modules/risk-assessment/domain/scales.test.ts` | Unitaria | Escalas de la web alineadas con el dominio | Alta |
| CP-ADM-39 | Un conjunto fisiológico plausible se acepta y un valor imposible se rechaza, con todas las mediciones exigidas | `frontend/web/src/modules/nursing-assessment/domain/vitalSigns.test.ts` | Unitaria | Límites de constantes | Alta |
| CP-ADM-40 | El tratante puede firmar indicaciones basales y no actúa en pasos de enfermería que no le corresponden | `frontend/web/src/modules/admission-census/domain/steps.test.ts` | Unitaria | Paso habilitado solo para su rol | Alta |
| CP-ADM-41 | El stepper permite volver a pasos del rol ya alcanzados, bloquea el resto y no ofrece enlaces de admisión al camillero | `AdmissionStepper.test.tsx` | Componente | Progreso y rol | Alta |

**Interfaz de admisión, censo y pasos clínicos del ingreso**

| ID | Caso | Script | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- |
| CP-ADM-42 | Muestra la orden y un error accesible si no existe; traduce un fallo de conexión al español; no envía la filiación incompleta; solo acepta dígitos en el documento; muestra cobertura aprobada, pendiente o rechazada y valida el teléfono; genera el brazalete, abre el expediente y exige el consentimiento; al volver a un paso registrado restaura los datos y no permite reenviar; muestra vigencia y tope de cobertura | `frontend/web/src/modules/admission/admission.test.tsx` | El formulario valida antes de enviar y cada paso deja su evidencia en pantalla | Alta |
| CP-ADM-43 | Lista pacientes y continúa solo el paso del perfil; busca y pagina de diez en diez; usa títulos genéricos de listado; busca por brazalete al escanear; abre la ficha con el estado de cada entregable; el siguiente paso se indica en la ficha; muestra la derivación registrada; registra la cobertura y avanza; no salta el paso de aprobar cuando el caso está en derivación | `frontend/web/src/modules/admission-census/census.test.tsx` | Censo y ficha coherentes con el rol y con el paso | Alta |
| CP-ADM-44 | Pide abrir un paciente si no hay ingreso; consulta el traslado y confirma el paso; rechaza un brazalete que no coincide; valida el brazalete al escanearlo; enfermería confirma la recepción y notifica la reubicación | `frontend/web/src/modules/patient-transfer/transfer.test.tsx` | Identidad del traslado ligada al paciente en curso | Alta |
| CP-ADM-45 | Exige la anamnesis; bloquea constantes imposibles y muestra NEWS2 con texto; avisa si las constantes abren alerta; muestra unidades; separa alergias del campo de alta; muestra en español el rechazo de la diastólica | `frontend/web/src/modules/nursing-assessment/nursing.test.tsx` | Valoración y constantes con oráculo visible | Alta |
| CP-ADM-46 | Muestra dosis, vía y alerta de alergia, distingue el estado, y permite avanzar si no hay medicación habitual | `reconciliation.test.tsx` | Conciliación fiel al estado del paciente | Alta |
| CP-ADM-47 | Calcula Morse y Braden y muestra el nivel con una recomendación escrita | `risk.test.tsx` | Nivel y recomendación, no solo un color | Alta |
| CP-ADM-48 | Resume valoración, medicamentos, alergias, constantes y riesgos | `kardex.test.tsx` | Kardex de ingreso legible | Media |
| CP-ADM-49 | Permite registrar ítems y exige confirmación para firmar; el tratante abre y firma las indicaciones | `orders.test.tsx` | Firma de indicaciones basales | Alta |
| CP-ADM-50 | Muestra un código de barras para el valor emitido | `Barcode.test.tsx` | El brazalete puede representarse | Media |
| CP-ADM-51 | El estado de cobertura se anuncia con rol de estado | `StatusStamp.test.tsx` | El estado no depende solo del color | Baja |
| CP-ADM-52 | Crea un iframe de impresión con el título del documento | `printDocument.test.ts` | Impresión del documento de ingreso | Baja |

**Propiedades que el plan especifica**

El plan establece propiedades además de los ejemplos. El generador queda acotado a rangos clínicos verosímiles, con semilla fija. En la web se usa `fast-check`. En la API, un generador determinista dentro de la prueba, sin un paquete PHP nuevo. Si una propiedad falla porque el código vigente no la cumple, se ajusta la propiedad al contrato real o se abre un defecto con un ejemplo que lo reproduzca. No se cambia la regla clínica para acomodar el generador.

| ID | Funcionalidad | Escenario | Precondiciones | Datos de entrada | Pasos | Resultado esperado | Tipo | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CP-ADM-P01 | NEWS2 | Invariante de puntaje | `News2Calculator` disponible | Al menos cincuenta combinaciones válidas de parámetros, semilla fija | Invocar el cálculo con cada combinación | El puntaje es un entero mayor o igual que cero | Propiedad | Alta |
| CP-ADM-P02 | Morse y Braden | Invariante de nivel | Escalas disponibles | Puntuaciones dentro del dominio de cada ítem | Invocar cada escala | El nivel pertenece al conjunto que la clase ya define | Propiedad | Alta |
| CP-ADM-P03 | Documento y teléfono | Invariante de dígitos | Reglas de `inputRules.ts` | Cadenas con letras, espacios y dígitos | Aplicar `digitsOnly`, `documentNumberError` y `phoneNumberError` | `digitsOnly` no conserva letras ni espacios. Las funciones de error devuelven error cuando hay un carácter que no es dígito. No exigen un campo que el módulo trata como opcional | Propiedad | Alta |

**Criterio de satisfacción.** El Bolt queda satisfecho cuando los casos que tienen script terminan sin fallos en PHPUnit y Vitest. CP-ADM-P01, CP-ADM-P02 y CP-ADM-P03 quedan satisfechos cuando existen sus scripts y las aserciones del invariante se cumplen. Hasta ese momento el informe los cita como especificación del plan, sin un resultado de corrida. **Entregable:** suite de admisión y censo, y los archivos `News2CalculatorPropertyTest`, `RiskScalePropertyTest` e `inputRules.property.test.ts` en las rutas que el plan les asigna.

#### Bolt de atención

**Objetivo.** Comprobar laboratorio, imágenes, visita, evolución, prescripción, monitoreo, e-MAR, controles, cuidados y expediente. Cubre RF-21 a RF-38.

| ID | Caso | Script | Tipo | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- |
| CP-ATE-01 | La sincronización integra resultados LIS del encuentro | `LabResultsIntegrationApiTest::test_system_sync_integrates_lis_lab_results_for_an_encounter` | Integración | Los resultados quedan asociados al encuentro | Alta |
| CP-ATE-02 | La misma sincronización LIS es idempotente | `test_sync_is_idempotent_for_the_same_lis_external_ids` | Integración | No se duplican los identificadores externos | Alta |
| CP-ATE-03 | El clínico lista los resultados integrados | `test_clinicians_can_list_integrated_lab_results` | Funcional | El rol clínico ve el listado | Media |
| CP-ATE-04 | Un encuentro desconocido responde no encontrado, en español | `test_unknown_encounter_returns_spanish_not_found` | Validación | Mensaje en español | Media |
| CP-ATE-05 | Admisión no sincroniza laboratorio | `test_admission_role_cannot_sync_lab_results` | Seguridad | Rechazo sin efecto | Alta |
| CP-ATE-06 | La sincronización integra informes PACS | `ImagingReportsIntegrationApiTest::test_system_sync_integrates_pacs_imaging_reports_for_an_encounter` | Integración | Informes asociados al encuentro | Alta |
| CP-ATE-07 | La misma sincronización PACS es idempotente | `test_sync_is_idempotent_for_the_same_pacs_external_ids` | Integración | Sin duplicados | Alta |
| CP-ATE-08 | El clínico lista los informes | `test_clinicians_can_list_integrated_imaging_reports` | Funcional | Listado visible para el rol clínico | Media |
| CP-ATE-09 | Encuentro de imagen desconocido, en español | `test_unknown_encounter_returns_spanish_not_found` | Validación | No encontrado en español | Media |
| CP-ATE-10 | Admisión no sincroniza imagen | `test_admission_role_cannot_sync_imaging_reports` | Seguridad | Rechazo sin efecto | Alta |
| CP-ATE-11 | La visita reúne laboratorio, imagen y notas de enfermería del día | `ClinicalVisitConsolidationApiTest::test_visit_board_consolidates_labs_imaging_and_nursing_notes_of_the_day` | Funcional | Tablero consolidado del día | Alta |
| CP-ATE-12 | El residente abre la visita | `test_resident_can_open_clinical_visit_board` | Seguridad | Acceso concedido | Alta |
| CP-ATE-13 | Enfermería no abre el tablero de visita médica | `test_nurse_cannot_open_clinical_visit_board` | Seguridad | Rechazo | Alta |
| CP-ATE-14 | El residente registra y firma la evolución | `MedicalEvolutionNoteApiTest::test_resident_can_register_and_sign_a_medical_evolution_note` | Funcional | Nota firmada | Alta |
| CP-ATE-15 | El texto de la evolución es obligatorio, en español | `test_body_is_required_in_spanish` | Validación | Error si falta el texto | Alta |
| CP-ATE-16 | El tratante registra la evolución | `test_tratante_can_register_evolution_note` | Funcional | Nota registrada | Alta |
| CP-ATE-17 | El residente lista las evoluciones | `test_resident_can_list_evolution_notes` | Funcional | Listado del encuentro | Media |
| CP-ATE-18 | El tratante crea la prescripción y refresca el kardex | `CpoePrescriptionApiTest::test_tratante_can_create_cpoe_prescription_and_refresh_kardex` | Funcional | Plan creado y kardex actualizado | Alta |
| CP-ATE-19 | El tratante edita, elimina y agrega ítems | `test_tratante_can_edit_delete_and_add_items_individually` | Funcional | Cada ítem se gestiona por separado | Alta |
| CP-ATE-20 | Continuar el plan conserva los ítems previos cuando se pide | `test_continue_plan_keeps_previous_items_when_requested` | Funcional | Los ítems anteriores permanecen | Alta |
| CP-ATE-21 | El residente no administra la prescripción | `test_resident_cannot_manage_cpoe` | Seguridad | Rechazo sin alta de plan | Alta |
| CP-ATE-22 | Los ítems de la prescripción son obligatorios, en español | `test_items_are_required_in_spanish` | Validación | Error si no hay ítems | Alta |
| CP-ATE-23 | Constantes manuales con NEWS2 cero programan el siguiente control a las doce horas | `VitalSignsMonitoringApiTest::test_manual_vitals_with_news2_zero_schedules_next_control_in_12_hours` | Funcional | Próximo control a las 12 horas | Alta |
| CP-ATE-24 | NEWS2 de uno o más activa el proceso de alerta | `test_vitals_with_news2_at_least_one_activate_alert_process` | Funcional | Se abre el proceso de alerta | Alta |
| CP-ATE-25 | La telemetría aplica Butterworth y guarda la lectura filtrada | `test_telemetry_applies_butterworth_and_stores_filtered_reading` | Integración | Lectura filtrada persistida | Media |
| CP-ATE-26 | El gráfico devuelve la serie evolutiva | `test_chart_returns_evolutionary_series` | Funcional | Serie del encuentro | Media |
| CP-ATE-27 | El filtro de Butterworth atenúa el ruido de alta frecuencia | `ButterworthFilterTest::test_zero_phase_fourth_order_attenuates_high_frequency_noise` | Unitaria | Atenuación de orden cuatro y fase cero | Media |
| CP-ATE-28 | Enfermería lista las dosis del turno | `EmarAndCareApiTest::test_nurse_can_list_emar_doses_for_current_shift` | Funcional | Dosis del turno visible | Alta |
| CP-ATE-29 | Los cinco correctos bloquean un código que no coincide y permiten la administración firmada | `test_five_rights_block_on_mismatch_and_allow_signed_admin` | Funcional | Bloqueo ante discrepancia y administración si coincide | Alta |
| CP-ATE-30 | Enfermería registra una nota de evolución | `test_nurse_can_register_evolution_note` | Funcional | Nota de enfermería registrada | Media |
| CP-ATE-31 | Enfermera de piso y auxiliar usan notas y actividades | `test_nurse_and_auxiliar_can_use_notes_and_care_activities` | Seguridad | Ambos roles registran | Alta |
| CP-ATE-32 | Una prescripción nueva programa dosis aunque ya existan dosis previas | `test_new_cpoe_schedules_doses_even_when_prior_doses_exist` | Funcional | Nuevas dosis en el e-MAR | Alta |
| CP-ATE-33 | El auxiliar completa una actividad de cuidado | `test_auxiliar_can_complete_care_activity` | Funcional | Actividad completada con trazabilidad | Media |
| CP-ATE-34 | Enfermería lista y completa un control vencible | `MonitoringControlsAndComplianceTest::test_nurse_lists_and_completes_a_due_monitoring_control` | Funcional | Control completado y siguiente programación | Alta |
| CP-ATE-35 | Un control vencido abre alerta de cumplimiento para la enfermera de piso | `test_overdue_control_opens_a_compliance_alert_for_the_floor_nurse` | Funcional | Alerta de cumplimiento | Alta |
| CP-ATE-36 | Una dosis de e-MAR vencida abre alerta y se cierra al administrar | `test_overdue_emar_dose_opens_compliance_alert_and_closes_when_administered` | Funcional | Apertura y cierre ligados a la administración | Alta |
| CP-ATE-37 | Los roles clínicos leen el expediente | `PatientClinicalChartApiTest::test_clinical_roles_can_read_inpatient_clinical_chart` | Funcional | Expediente consolidado | Alta |
| CP-ATE-38 | Admisión no lee el expediente clínico | `test_admission_role_cannot_read_clinical_chart` | Seguridad | Rechazo | Alta |
| CP-ATE-39 | El expediente incluye actividades de cuidado y el filtro por fecha | `test_clinical_chart_includes_care_activities_and_date_filter` | Funcional | Actividades dentro del rango | Media |

**Interfaz de atención**

| ID | Caso | Script | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- |
| CP-ATE-40 | Integra resultados del LIS y los muestra en el expediente | `lab-results.test.tsx` | Resultados visibles tras la integración | Alta |
| CP-ATE-41 | Integra informes del PACS y los muestra | `imaging-reports.test.tsx` | Informes visibles | Alta |
| CP-ATE-42 | Muestra laboratorio, imágenes y notas del día en una sola pantalla | `clinical-visit.test.tsx` | Visita consolidada | Alta |
| CP-ATE-43 | Exige el texto y registra la nota firmada; el tratante abre la evolución | `medical-evolution.test.tsx` | Evolución con texto obligatorio | Alta |
| CP-ATE-44 | Crea el plan inicial sin una opción de reemplazo completo | `cpoe.test.tsx` | Alta del plan según la pantalla vigente | Alta |
| CP-ATE-45 | No precarga valores y registra constantes con gráfica | `vital-monitoring.test.tsx` | Toma manual sin valores supuestos | Alta |
| CP-ATE-46 | Lista dosis y administra tras verificar códigos, sin precarga | `emar.test.tsx` | Administración condicionada a los códigos | Alta |
| CP-ATE-47 | Lista controles y registra la toma reprogramando el siguiente | `vital-controls.test.tsx` | Control completado y nueva fecha | Alta |
| CP-ATE-48 | La enfermera navega notas y actividades y deja trazabilidad; el auxiliar registra nota y cuidado directo | `nursing-care.test.tsx` | Cuidado atribuido a quien lo completa | Alta |
| CP-ATE-49 | El expediente se recorre por pestañas sin la etiqueta de proceso 1 | `patient-chart.test.tsx` | Lectura por admisión, constantes, tratamiento, paraclínicos y evoluciones | Media |

**Caso de diseño de rechazo por rol.** El plan establece el caso CP-ATE-50: antes de cerrar un cambio que toque filiación, brazalete, prescripción, e-MAR, acuse o salida, se lee la ruta frente a las pruebas de característica. Donde esa lectura muestre que falta el rechazo, se añade un caso con un rol del catálogo que la ruta no incluye, se espera el código que `EnsureUserRole` ya devuelve y se comprueba que el efecto de negocio no ocurre. Los rechazos ya expresados en CP-ACC-05, CP-ADM-19, CP-ATE-05, CP-ATE-10, CP-ATE-13, CP-ATE-21 y CP-ATE-38 no se duplican. El plan no afirma, sin esa lectura, qué rutas concretas carecen todavía del caso.

**Detalle de un caso crítico de medicación**

| ID | Funcionalidad | Escenario | Precondiciones | Datos de entrada | Pasos | Resultado esperado | Tipo | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CP-ATE-29 | e-MAR | Discrepancia de los cinco correctos y administración válida | Enfermera de piso con sesión y una dosis del turno | Un código que no coincide con la dosis y, después, los códigos que sí coinciden | Listar las dosis del turno. Intentar administrar con el código discrepante. Repetir con los códigos correctos y la firma | La discrepancia bloquea la administración. La coincidencia permite registrarla | Funcional | Alta |

**Criterio de satisfacción.** El Bolt queda satisfecho cuando la suite de atención de API y de web termina sin fallos, incluidos los rechazos de rol ya nombrados. **Entregable:** salida de `LabResultsIntegrationApiTest`, `ImagingReportsIntegrationApiTest`, `ClinicalVisitConsolidationApiTest`, `MedicalEvolutionNoteApiTest`, `CpoePrescriptionApiTest`, `VitalSignsMonitoringApiTest`, `EmarAndCareApiTest`, `MonitoringControlsAndComplianceTest`, `PatientClinicalChartApiTest`, `ButterworthFilterTest` y de los componentes del módulo.

#### Bolt de alertas

**Objetivo.** Comprobar la bandeja, el deterioro, el acuse, el escalamiento, la campana y la señal sonora. Cubre RF-39 a RF-53, junto con el cumplimiento de controles ya ligado a la alerta en el Bolt de atención.

| ID | Caso | Script | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- |
| CP-ALE-01 | `test_monitoring_alert_is_routed_to_the_floor_nurse_with_a_deadline` | `ClinicalAlertsApiTest` | La alerta de monitoreo llega a la enfermera de piso con plazo | Alta |
| CP-ALE-02 | `test_auxiliary_registers_unexpected_deterioration_for_the_nurse` | `ClinicalAlertsApiTest` | El auxiliar registra el deterioro y la enfermera queda notificada | Alta |
| CP-ALE-03 | `test_observation_requires_a_note` | `ClinicalAlertsApiTest` | Sin nota, la observación no se acepta | Alta |
| CP-ALE-04 | `test_inbox_lists_open_alerts_for_the_role_and_hides_closed_ones` | `ClinicalAlertsApiTest` | La bandeja muestra abiertas y oculta cerradas | Alta |
| CP-ALE-05 | `test_nurse_acknowledges_the_alert_and_the_siren_stops_while_work_continues` | `ClinicalAlertsApiTest` | El acuse detiene la sirena y el caso sigue en seguimiento | Alta |
| CP-ALE-06 | `test_acknowledged_alert_without_follow_up_re_alerts_after_fifteen_minutes` | `ClinicalAlertsApiTest` | A los quince minutos sin seguimiento vuelve a alertar | Alta |
| CP-ALE-07 | `test_unacknowledged_nurse_alert_escalates_to_the_supervisor` | `ClinicalAlertsApiTest` | Sin acuse, escala a la supervisora | Alta |
| CP-ALE-08 | `test_reassessment_recalculates_news2_on_the_same_alert_without_duplicating_it` | `ClinicalAlertsApiTest` | La revaloración actualiza la misma alerta | Alta |
| CP-ALE-09 | `test_reassessment_with_persistent_alteration_auto_notifies_the_doctor` | `ClinicalAlertsApiTest` | La alteración persistente avisa al médico | Alta |
| CP-ALE-10 | `test_nurse_can_request_medical_attention_without_reassessment_for_clinical_worry` | `ClinicalAlertsApiTest` | La preocupación clínica permite pedir atención sin una toma previa | Alta |
| CP-ALE-11 | `test_nurse_schedules_a_new_monitoring_frequency` | `ClinicalAlertsApiTest` | Queda programada la nueva frecuencia | Media |
| CP-ALE-12 | `test_nurse_confirms_medical_attention_and_the_doctor_is_notified_with_a_fifteen_minute_clock` | `ClinicalAlertsApiTest` | El médico recibe el aviso con reloj de quince minutos | Alta |
| CP-ALE-13 | `test_doctor_acknowledges_and_records_the_urgent_assessment` | `ClinicalAlertsApiTest` | El médico acusa y registra la valoración urgente | Alta |
| CP-ALE-14 | `test_missing_medical_response_escalates_to_supervisor_and_rapid_response_team` | `ClinicalAlertsApiTest` | Sin respuesta médica, escalan supervisora y equipo de respuesta rápida | Alta |
| CP-ALE-15 | `test_doctor_requests_the_rapid_response_team` | `ClinicalAlertsApiTest` | El médico convoca al equipo | Alta |
| CP-ALE-16 | `test_rapid_response_team_orders_icu_without_closing_the_case` | `ClinicalAlertsApiTest` | La orden de UCI no cierra el caso | Alta |
| CP-ALE-17 | `test_rapid_response_team_can_keep_the_patient_on_the_ward` | `ClinicalAlertsApiTest` | El equipo puede mantener al paciente en piso | Media |
| CP-ALE-18 | `test_timeline_consolidates_the_whole_history_in_order` | `ClinicalAlertsApiTest` | La línea de tiempo conserva el orden | Alta |
| CP-ALE-19 | `test_icu_order_requires_doctor_and_nurse_authorization_before_transfer_and_return` | `ClinicalAlertsApiTest` | Traslado y retorno exigen la autorización de médico y enfermera | Alta |
| CP-ALE-20 | `test_alert_history_cannot_be_rewritten_once_recorded` | `ClinicalAlertsApiTest` | El historial registrado no se reescribe | Alta |
| CP-ALE-21 | `test_treating_physician_sees_medical_alerts_assigned_to_the_resident_role` | `ClinicalAlertsApiTest` | El tratante ve las alertas médicas asignadas al residente | Alta |
| CP-ALE-22 | `test_administrative_roles_cannot_reach_the_alert_flow` | `ClinicalAlertsApiTest` | Los roles administrativos no entran al flujo | Alta |
| CP-ALE-23 | `test_only_the_assigned_role_can_acknowledge_the_alert` | `ClinicalAlertsApiTest` | Solo el rol asignado acusa | Alta |
| CP-ALE-24 | La bandeja lista severidad y ubicación, confirma la recepción, avisa si no hay pendientes, bloquea al perfil ajeno, exige describir el deterioro, muestra el historial, reprograma la frecuencia, permite pedir atención médica con motivo y ofrece la valoración al médico y la orden de UCI al equipo de respuesta rápida | `clinical-alerts.test.tsx` | La pantalla sigue el mismo flujo que la API | Alta |
| CP-ALE-25 | La campana muestra el número del perfil, emite aviso y señal sonora, detiene el sonido al confirmar, lo mantiene si el acuse falla, vuelve a sonar a los quince minutos, abre el detalle y no consulta ni suena para un perfil ajeno o sin pendientes | `alert-notifications.test.tsx` | La sirena para solo cuando el acuse se confirma | Alta |
| CP-ALE-26 | La sirena suena en bucle hasta detenerla, no se duplica si se arranca dos veces e informa si el navegador bloquea el audio | `alertSiren.test.ts` | Una sola señal, detenible, con aviso si no hay gesto del usuario | Media |
| CP-ALE-27 | El aviso emergente se anuncia a lectores de pantalla, no se cierra solo por tiempo, se mantiene si la confirmación falla, ejecuta la confirmación de quien lo emitió y no se apila dos veces | `toast.test.tsx` | La lectura se confirma de forma explícita | Media |

**Detalle del acuse**

| ID | Funcionalidad | Escenario | Precondiciones | Datos de entrada | Pasos | Resultado esperado | Tipo | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CP-ALE-05 | Acuse de alerta | La sirena se detiene al confirmar y el trabajo continúa | Alerta abierta asignada a la enfermera de piso y señal sonora activa | Confirmación de lectura de ese rol | Abrir la alerta. Confirmar la lectura | La sirena se detiene. El caso permanece en seguimiento. Otro rol no puede acusar esa alerta | Funcional | Alta |
| CP-ALE-06 | Escalamiento por tiempo | Quince minutos sin seguimiento | Alerta ya acusada y sin revaloración | Avance del reloj de la prueba hasta quince minutos | Dejar pasar el plazo sin registrar seguimiento | La alerta vuelve a notificarse | Funcional | Alta |

**Criterio de satisfacción.** El Bolt queda satisfecho cuando la bandeja, el acuse, el escalamiento y la campana cumplen su oráculo. La corrección de la sirena que seguía tras confirmar la lectura queda sostenida por CP-ALE-05 y CP-ALE-25. **Entregable:** `ClinicalAlertsApiTest` y las pruebas de notificación.

#### Bolt de egreso, camas y personal

**Objetivo.** Comprobar la cadena de alta, la liberación de la cama y el personal del turno. Cubre RF-54 a RF-88.

**Egreso** (`DischargeApiTest` y `discharge.test.tsx`)

| ID | Caso | Resultado esperado | Prioridad |
| --- | --- | --- | --- |
| CP-EGR-01 | `test_treating_physician_registers_discharge_order` | El tratante registra la orden de alta | Alta |
| CP-EGR-02 | `test_order_notifies_social_work_on_the_board` | Trabajo social ve el caso en el tablero | Alta |
| CP-EGR-03 | `test_cannot_write_epicrisis_before_discharge_order` | La epicrisis no se escribe antes de la orden | Alta |
| CP-EGR-04 | `test_parallel_social_and_nursing_then_exit_pass_and_physical_exit` | Trabajo social y enfermería avanzan en paralelo; después vienen el pase y la salida física | Alta |
| CP-EGR-05 | `test_cannot_issue_exit_pass_when_account_is_pending` | Con la cuenta pendiente no se emite el pase | Alta |
| CP-EGR-06 | `test_only_the_floor_nurse_can_confirm_the_exit` | Solo la enfermera de piso confirma la salida | Alta |
| CP-EGR-07 | `test_cashier_cannot_open_medical_order` | Altas y caja no abren la orden médica | Alta |
| CP-EGR-08 | `test_board_lists_open_discharge_cases_for_nursing` | Enfermería ve los egresos abiertos | Media |
| CP-EGR-09 | Trabajo social lista pendientes; el escaneo del brazalete abre la ficha del hospitalizado; el tratante registra la orden; un perfil ajeno queda bloqueado | `discharge.test.tsx` cumple el mismo recorrido en la interfaz | Alta |

**Detalle de la salida**

| ID | Funcionalidad | Escenario | Precondiciones | Datos de entrada | Pasos | Resultado esperado | Tipo | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CP-EGR-06 | Salida física | Solo la enfermera de piso confirma | Orden de alta, entregables previos completos y cuenta que ya permite el pase | Sesión de `enfermera_piso` y, en un segundo intento, sesión de otro rol del catálogo | Confirmar la salida con la enfermera de piso. Repetir con el otro rol | La confirmación de la enfermera registra la salida y libera la cama. El otro rol no registra la salida | Funcional | Alta |
| CP-EGR-05 | Pase de salida | Cuenta pendiente | Egreso en curso con cuenta pendiente | Intento de emitir el pase | Solicitar el pase | El pase no se emite | Funcional | Alta |

**Camas** (`BedManagementApiTest` y `bed-management.test.tsx`)

| ID | Caso | Resultado esperado | Prioridad |
| --- | --- | --- | --- |
| CP-CAM-01 | `test_census_shows_beds_by_ward` | El censo agrupa las camas por sala | Alta |
| CP-CAM-02 | `test_request_without_availability_goes_to_prioritized_waitlist` | Sin cama, la solicitud entra a la lista de espera | Alta |
| CP-CAM-03 | `test_suggests_isolation_room_and_assigns_it` | Se sugiere y se asigna la habitación de aislamiento | Alta |
| CP-CAM-04 | `test_exit_dispatches_cleaning_then_unit_becomes_available` | La salida abre la limpieza y, al completarla, la cama vuelve a estar disponible | Alta |
| CP-CAM-05 | `test_supervisor_registers_discharge_projection` | La supervisora registra la proyección de alta | Media |
| CP-CAM-06 | `test_floor_nurse_lists_available_beds` | La enfermera de piso lista las camas disponibles | Media |
| CP-CAM-07 | `test_admission_cannot_list_available_beds` | Admisión no lista esas camas | Alta |
| CP-CAM-08 | `test_unrelated_role_cannot_see_census` | Un rol ajeno no ve el censo de camas | Alta |
| CP-CAM-09 | `test_waitlist_orders_critical_first` | La espera ordena primero lo crítico | Alta |
| CP-CAM-10 | La interfaz muestra el censo, permite registrar una solicitud y permite a limpieza completar la desinfección | `bed-management.test.tsx` | Alta |

**Personal** (`StaffRosterApiTest` y `staff-roster.test.tsx`)

| ID | Caso | Resultado esperado | Prioridad |
| --- | --- | --- | --- |
| CP-PER-01 | `test_leadership_publishes_monthly_shift_plan` | Jefatura publica el rol mensual | Alta |
| CP-PER-02 | `test_suggests_fewer_patients_for_high_news2_and_approves_assignment` | Un NEWS2 alto reparte menos pacientes y la asignación se aprueba | Alta |
| CP-PER-03 | `test_handover_consolidates_vitals_emar_and_alerts_then_signs` | La entrega reúne constantes, e-MAR y alertas, y se firma | Alta |
| CP-PER-04 | `test_absence_in_critical_sector_opens_coverage_request` | La ausencia en un sector crítico abre el pedido de cobertura | Alta |
| CP-PER-05 | `test_alert_is_assigned_to_the_nurse_of_the_day` | La alerta queda en la enfermera asignada ese día | Alta |
| CP-PER-06 | La jefatura publica el rol en la pantalla y la supervisora sugiere y aprueba la asignación | `staff-roster.test.tsx` | Alta |

**Criterio de satisfacción.** El Bolt queda satisfecho cuando la salida registrada por la enfermera de piso libera la cama y abre la limpieza, y cuando el rol que la ruta no incluye no confirma la salida ni ve el censo de camas. **Entregable:** `DischargeApiTest`, `BedManagementApiTest`, `StaffRosterApiTest` y las tres pruebas de interfaz.

#### Bolt de Vitalsy Life

**Objetivo.** Comprobar la aplicación ciudadana: acceso, cola local, línea de base, avisos, plan, privacidad, perfil y el cliente que habla con la API cuando hay respuesta. Cubre RF-89 a RF-98. Estos casos comprueban el teléfono. Una respuesta simulada del cliente no demuestra que Laravel haya declarado la ruta.

| ID | Caso | Script | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- |
| CP-LIF-01 | Exige correo y contraseña; registra al ciudadano y rechaza una contraseña incorrecta; no simula un correo de recuperación enviado | `modules/auth/domain/auth.test.ts` | Acceso local honesto | Alta |
| CP-LIF-02 | Muestra las alertas de campo antes de intentar entrar; alterna la visibilidad de la contraseña; explica que la recuperación no envía un correo | `AuthForm.test.tsx` | Validación visible previa al envío | Alta |
| CP-LIF-03 | Abre la sesión tras el registro y la cierra al salir; niega el código de vinculación hasta que el intercambio está activo y luego lo revoca; conserva lecturas pendientes sin servidor; no activa un plan desde un código opaco sin cuerpo; activa, confirma y pospone una dosis desde un payload de QR | `lifeApp.test.ts` | Sesión, privacidad y plan coherentes con lo que el dispositivo sabe | Alta |
| CP-LIF-04 | Parte cerrado y sin código; emite el código solo con el intercambio activo; revoca código e instituciones; no vincula una institución con el intercambio apagado | `privacy/domain/consent.test.ts` | El código existe solo con consentimiento | Alta |
| CP-LIF-05 | El contacto exige nombre y teléfono de dígitos, y el teléfono conserva solo dígitos | `profile/domain/contact.test.ts` | Misma regla de teléfono que en la web | Media |
| CP-LIF-06 | Mantiene las muestras pendientes sin red; no presenta una sincronización en la nube si no hay API; envía pendientes solo en línea y con API configurada; no etiqueta como sincronizada una cola solo local; ignora un encolado duplicado | `syncQueue.test.ts` | La cola no miente sobre el estado de envío | Alta |
| CP-LIF-07 | Interpola los percentiles 10 y 90; la línea sigue en construcción hasta siete días útiles; marca el rango personal; señala tres lecturas consecutivas fuera de rango; no trata los pasos bajos como desviación clínica; prefiere una desviación sostenida | `baseline.test.ts` | Línea de base con las reglas del dominio | Alta |
| CP-LIF-08 | Mapea frecuencia cardíaca, oxígeno, pasos y sueño; devuelve vacío si Health Connect no tiene registros; conserva la temperatura solo si el registro existe | `mapHealthRecords.test.ts` | Lecturas del dispositivo traducidas sin inventar temperatura | Alta |
| CP-LIF-09 | Hoy está vacío sin lecturas; rechaza un pulso manual fuera de rango; muestra la toma manual mientras la línea se construye | `today/domain/today.test.ts` | Sin constantes de muestra | Alta |
| CP-LIF-10 | Muestra el estado vacío en lugar de constantes de ejemplo y un aviso de sin conexión sin ocultar la lectura local | `TodayBody.test.tsx` | La interfaz no rellena datos | Alta |
| CP-LIF-11 | Avisa de forma visible si se niega el permiso de Health Connect | `DevicesBody.test.tsx` | Permiso denegado explicado | Media |
| CP-LIF-12 | Activa el plan desde un QR autónomo; rechaza un código opaco sin plan en el servidor; usa el cuerpo del servidor cuando el código es opaco; confirma una dosis y pospone otra; cambia el recordatorio sin perder el medicamento | `plan/domain/plan.test.ts` | El plan sigue el cuerpo recibido | Alta |
| CP-LIF-13 | Sugiere hidratación con el rango estable; eleva un aviso preventivo ante desviación sostenida de la frecuencia; sugiere caminar si los pasos caen; permanece en silencio mientras la línea se forma; arma un mensaje no diagnóstico para el contacto de emergencia | `nudges.test.ts` | Avisos preventivos, no un diagnóstico | Alta |
| CP-LIF-14 | Un snapshot cifrado con AES-256-GCM se recupera | `seal.test.ts` | Ida y vuelta del cifrado | Alta |
| CP-LIF-15 | `fetchDischargeBody` devuelve el cuerpo solo si la respuesta es correcta y nulo en caso contrario; `postLifeBatch` no trata un HTTP fallido como éxito | `lifeClient.test.ts` | El cliente distingue respuesta correcta y fallo. No prueba el controlador de Laravel | Alta |

**Criterio de satisfacción.** El Bolt queda satisfecho cuando `npm test` en `services/movil` termina sin fallos. El plan establece, en Operations, que ese mismo comando forme parte del job de integración. **Entregable:** salida de Jest de los quince scripts.

#### Bolt de pizarra

**Objetivo.** Comprobar que el lenguaje visual compartido de atención, alertas, egreso, camas y personal conserva el comportamiento ya fijado. El stepper de admisión permanece como está. Este Bolt no añade una regla clínica nueva.

| ID | Caso | Script | Tipo | Precondición | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- | --- |
| CP-PIZ-01 | Regresión de los módulos cuya interfaz se alineó | Suites de atención, alertas, egreso, camas y personal ya inventariadas | Regresión | Diff limitado al lenguaje visual | Los oráculos de esos casos siguen cumpliéndose | Alta |
| CP-PIZ-02 | El stepper de admisión no cambia de regla | `AdmissionStepper.test.tsx` y `steps.test.ts` | Regresión | Cambio visual fuera de admisión | Un paso sigue siendo accionable solo cuando el rol ya lo alcanzó | Alta |
| CP-PIZ-03 | La pieza visual muestra métrica, fila de cola, pastilla de estado, cama con habitación y aislamiento, y panel clínico, y el color de marca no se usa como único indicador de riesgo | `clinical-layout.test.tsx` | Componente | Componentes de pizarra montados | La información clínica sigue expresada con texto | Media |
| CP-PIZ-04 | El botón respeta deshabilitado y pendiente, el enlace usa estilo de botón y existe la variante quieta | `Button.test.tsx` | Componente | Botón de la interfaz compartida | La acción no se dispara si está deshabilitada | Baja |
| CP-PIZ-05 | El estado vacío conserva la ruta pedida en `next` | `EmptyEncounter.test.tsx` | Componente | Pantalla sin ingreso abierto | El destino de retorno se mantiene | Media |
| CP-PIZ-06 | Las acciones del formulario se agrupan y el llamado principal puede centrarse | `FormActions.test.tsx` | Componente | Fila de acciones | La acción principal permanece disponible | Baja |
| CP-PIZ-07 | El rango de fechas agrupa por día local y filtra por el intervalo resuelto | `shared/datetime/range.test.ts` | Unitaria | Fechas de un expediente o de una entrega | El filtro no desplaza el día | Media |

**Criterio de satisfacción.** El Bolt queda satisfecho cuando CP-PIZ-01 y CP-PIZ-02 terminan sin fallos. El plan no exige una prueba de captura de píxeles. **Entregable:** regresión de componente de los módulos tocados por el cambio visual.

### 9.3. Fase de Operations

**Objetivo.** Volver a comprobar lo construido en cada integración, corregir el fallo que aparece en el uso y sostener las compuertas que el plan define.

| ID | Caso | Dónde se expresa | Tipo | Precondición | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- | --- |
| CP-OPS-01 | Regresión de la web | Job `validate`: `npm test` en `frontend/web` | Regresión | Push o pull request a `main` o `dev` | Vitest termina sin fallos | Alta |
| CP-OPS-02 | La web compila | `npm run build` en el mismo job | Regresión | Dependencias instaladas con `npm ci` | El build termina sin error | Alta |
| CP-OPS-03 | Regresión de la API | `php artisan test` sobre SQLite | Regresión | `APP_KEY` generada y `database/testing.sqlite` creado | PHPUnit termina sin fallos | Alta |
| CP-OPS-04 | Estilo PHP | `pint --test` | Estilo | Código PHP del cambio | Pint está de acuerdo. Un desacuerdo no se interpreta como fallo clínico, y tampoco se integra | Media |
| CP-OPS-05 | La suite del teléfono entra al mismo gatillo | El plan asigna un paso del workflow con directorio `services/movil` y comando `npm test` | Regresión | Lockfile del paquete disponible para `npm ci` | Un fallo de Jest detiene el job. No se oculta el fallo con una condición que siempre tenga éxito | Alta |
| CP-OPS-06 | Recorrido de navegador en la integración | El plan asigna un job que levanta PostgreSQL, migra, siembra con una contraseña solo de integración, sirve la API y ejecuta los casos CP-ACC-E01, CP-ACC-E02 y CP-ACC-E03 | Funcional | Job `validate` previamente en verde, o en paralelo si no comparten caché | Los tres recorridos terminan sin fallos | Alta |
| CP-OPS-07 | Umbral de cobertura | El plan establece medirlo primero en Vitest (líneas) y en el informe Clover del backend | Gobernanza | Una medición real ya obtenida | El umbral de cada paquete es el mínimo entre 80 y el entero ya alcanzado. Si la medición ya llega a 80, el umbral queda en 80. Este plan no escribe ese entero | Media |
| CP-OPS-08 | Corrección de la sirena que seguía tras el acuse | Rama `bugfix/RF-94-sirena-sigue-tras-confirmar`, casos CP-ALE-05 y CP-ALE-25 | Regresión | Alerta acusada | La señal se detiene al confirmar la lectura y permanece si el acuse falla | Alta |
| CP-OPS-09 | Corrección de estilo y de la versión de Node que detenían el workflow | Ramas `bugfix/RF-02-*` | Regresión | Job de integración | Pint y la versión de Node del workflow permiten que la suite se ejecute | Media |
| CP-OPS-10 | Compuerta del laboratorio | `.gitlab-ci.yml` incluye el pipeline externo descrito en la guía: prueba, seguridad, calidad y compuerta, con cobertura mínima de 80 %, duplicación máxima de 5 % y cero vulnerabilidades críticas | Gobernanza | Empuje de `main` en ese GitLab, según la guía | El plan reconoce esos umbrales como los de la guía. No afirma que hayan corrido sobre un commit concreto de esta revisión | Media |
| CP-OPS-11 | Priorización de la regresión cuando la suite crezca | Procedimiento del plan | Regresión | La duración del job obliga a elegir | Se ejecutan primero los módulos tocados por el diff y los flujos de identidad, medicación, alerta y egreso. Mientras la duración lo permita, el job sigue ejecutando la suite completa de web y de API | Alta |
| CP-OPS-12 | Pruebas inestables | Procedimiento posterior del plan | Mantenimiento | Hay varias ejecuciones del mismo caso en el job y una suite de navegador pequeña con identificadores estables | Se identifican los casos que fallan sin un cambio de lógica y se corrigen o se aíslan. La reparación automática de selectores no se activa antes de esa condición | Media |

**Ejecución en el puesto.** Quien toca un paquete ejecuta su suite. Puede pedir un borrador, lo lee, lo ajusta y lo corre hasta ver el rojo esperado y después el verde. En la web, la cobertura queda en `frontend/web/coverage`.

**Ejecución en GitHub.** El fallo del job es el log. El workflow no publica un comentario con la clasificación de defectos. Un fallo es una aserción rota, un error de compilación o Pint en desacuerdo.

**Papel de la asistencia en Operations.** Puede proponer el caso que reproduce el fallo y sugerir el diff mínimo. No marca el job como verde, no desactiva una prueba y no despliega.

**Criterio de satisfacción.** La fase queda satisfecha cuando el incremento integrado tiene el job que le corresponde sin fallos y todo defecto crítico queda reproducido por una prueba. **Entregable:** estado del job `validate`, salida de la suite del paquete corregido y, en los casos que el plan incorpora al workflow, el paso de Jest, el job de navegador y el umbral de cobertura.

---

## 10. Gestión de defectos

### 10.1. Proceso de reporte de errores

1. Se observa el fallo en la suite, en el job o en el uso de la aplicación.
2. Se clasifica la severidad con la tabla de este capítulo.
3. Se abre una rama `bugfix/RF-XX-*` desde `dev`, con el identificador del requisito afectado.
4. Se escribe primero la prueba que reproduce el fallo. Esa prueba debe fallar por el defecto y no por un entorno mal preparado.
5. Se corrige el mínimo código que la pone en verde.
6. Se vuelve a ejecutar la suite del módulo y la del job que corresponda.
7. La integración a `dev` sigue el mismo criterio que cualquier Bolt: suite en verde y rol no autorizado rechazado si el cambio toca un recurso protegido.

No se debilita la aserción para recuperar el verde. No se comenta el caso.

### 10.2. Herramienta utilizada

El registro vigente del defecto es la rama de corrección y la prueba que impide la regresión. La evidencia inmediata es la salida de PHPUnit, Vitest o Jest y el estado del job de GitHub. El repositorio no tiene un tablero de defectos con severidad y ciclo de vida. El plan mantiene ese registro en la rama y en la prueba. Si más adelante se usa el registro de incidencias del alojamiento Git, el identificador de la incidencia se añade a la descripción del cambio sin sustituir la prueba.

El asistente puede redactar el borrador de la prueba de reproducción y resumir el log. La clasificación de severidad la confirma una persona.

### 10.3. Priorización y seguimiento

| Severidad | Criterio | Ejemplos en Vitalsy | Tratamiento |
| --- | --- | --- | --- |
| Crítica | El fallo puede identificar al paciente equivocado, administrar una medicación que no corresponde, perder una alerta o registrar una salida que las compuertas no permiten | Brazalete de otro paciente aceptado; cinco correctos que no bloquean; acuse que no detiene una señal que sigue tratándose como no leída; salida confirmada por un rol que no es la enfermera de piso; sesión ajena que ejecuta la acción | Detiene la integración. Se reproduce con prueba antes de cualquier otro cambio del mismo flujo |
| Alta | El fallo altera una regla clínica o un rechazo de rol sin llegar al daño inmediato del escenario crítico | NEWS2, Morse o Braden fuera de su corte; cobertura rechazada que abre el brazalete; residente que firma una prescripción reservada al tratante; censo que muestra a quien ya egresó | Se corrige en el Bolt en curso o en la rama de corrección antes de dar por aceptado el requisito |
| Media | El fallo rompe una validación, un mensaje o un filtro, y la regla clínica principal sigue intacta | Teléfono con letras aceptado por el cliente; mensaje técnico en inglés; página del censo distinta de diez | Se corrige en el mismo Bolt si el caso ya existe. Si aparece después, entra como corrección con prueba |
| Baja | El fallo es de presentación y el efecto clínico no cambia | Alineación visual, variante de botón, texto que no altera el criterio | Se corrige sin relajar los casos de prioridad alta |

La prioridad de ejecución, distinta de la severidad del defecto, ordena así el trabajo cuando hay que elegir: identidad, medicación, alerta y egreso; después el resto del ingreso y de la atención; después el ajuste visual.

El seguimiento se cierra cuando la prueba de reproducción está en verde en local y en el job, y la persona responsable del requisito acepta la corrección. Un defecto crítico no se cierra con una explicación verbal.

---

## 11. Riesgos y mitigación

### 11.1. Identificación de riesgos

| ID | Riesgo | Descripción |
| --- | --- | --- |
| RP-01 | Oráculo generado sin lectura | Un borrador afirma un comportamiento que el requisito no pide, o llama a una ruta que no existe |
| RP-02 | Selectores de presentación | Una prueba de interfaz atada a una clase visual se rompe cuando la pizarra cambia el estilo, aunque la conducta siga siendo la misma |
| RP-03 | Suite del teléfono fuera del job | Un cambio de Vitalsy Life se integra a `dev` mientras Jest no forma parte del workflow |
| RP-04 | Contrato del cliente Life | `lifeClient` llama a `/api/life/sync` y `/api/life/discharge-plans/{code}`, y la API de Laravel no declara esas rutas. Una prueba verde del cliente puede leerse como si el servidor ya respondiera |
| RP-05 | Cobertura sin umbral en GitHub | La guía del laboratorio nombra 80 %. El workflow de GitHub no falla por debajo de un número. Una bajada de cobertura puede integrarse |
| RP-06 | Rechazo de rol incompleto | No todas las rutas protegidas tienen, por el solo hecho de existir el middleware, un caso negativo ya escrito. Afirmar lo contrario sin leer la ruta produciría una falsa sensación de cobertura |
| RP-07 | Pruebas inestables | Un caso falla sin cambio de lógica y se vuelve a ejecutar hasta que pase, ocultando el fallo |
| RP-08 | Datos de demostración privados | Una prueba de navegador lee la contraseña de la máquina o un `.env` versionado |
| RP-09 | Confundir Pint o el build con la prueba clínica | El estilo y la compilación pasan, y un criterio de medicación o de alerta queda sin caso |
| RP-10 | Pipeline de laboratorio tomado como evidencia local | La guía describe SonarQube, Trivy y Gitleaks en un pipeline incluido. Ese archivo no define los jobs en este repositorio |
| RP-11 | Propiedades con un oráculo automático | Un generador comprueba solo que la función no lance una excepción y da por válida una regla clínica incorrecta |
| RP-12 | Priorización aprendida sin historial | Un clasificador sin caídas etiquetadas desvía la suite lejos de identidad, medicación, alerta y salida |

### 11.2. Impacto y probabilidad

La probabilidad se estima como alta, media o baja según lo que el repositorio ya muestra. No es una frecuencia medida.

| ID | Impacto | Probabilidad | Motivo de la estimación |
| --- | --- | --- | --- |
| RP-01 | Alto | Media | El ciclo usa un asistente para proponer casos y exige lectura humana. El riesgo aparece si esa lectura se omite |
| RP-02 | Medio | Alta | La interfaz se prueba por texto, identificador o rol, y no hay una convención única de `data-testid` |
| RP-03 | Alto | Alta | La suite Jest existe y el workflow de GitHub no la ejecuta |
| RP-04 | Alto | Alta | El cliente y las rutas de Laravel están en ese estado en el código |
| RP-05 | Medio | Alta | El workflow genera cobertura de la web y puede medir el backend, y no compara un umbral |
| RP-06 | Alto | Media | Hay rechazos escritos en acceso, admisión, atención, alertas, egreso y camas. El plan no da por cerrada la lectura de todas las rutas |
| RP-07 | Medio | Baja | No hay un detector. Tampoco hay todavía una suite de navegador larga donde el problema suela concentrarse |
| RP-08 | Alto | Baja | PHPUnit crea sus usuarios. El riesgo crece al añadir el recorrido de navegador |
| RP-09 | Medio | Media | Pint ya es un paso del job y no mide comportamiento |
| RP-10 | Medio | Media | La guía y el workflow de GitHub describen compuertas distintas |
| RP-11 | Alto | Baja | Las propiedades todavía no están en la suite. El riesgo nace al incorporarlas |
| RP-12 | Alto | Baja | El plan deja esa técnica para cuando exista historial |

### 11.3. Planes de contingencia

| ID | Contingencia |
| --- | --- |
| RP-01 | Se elimina el caso que no coincide con el requisito o con la ruta. El Bolt no se acepta con ese oráculo |
| RP-02 | Los recorridos automáticos usan los identificadores estables del plan. Si la pantalla cambia, se actualizan el identificador y la aserción en el mismo Bolt |
| RP-03 | Se añade `npm test` de `services/movil` al workflow, sin alterar las pruebas y sin silenciar el fallo |
| RP-04 | Los informes de prueba del teléfono nombran el caso como prueba del cliente. No se redacta un caso de API contra una ruta inexistente. Un contrato de servidor, si se implementa, nacerá con su propia prueba de característica y con el cliente actualizado en el mismo cambio |
| RP-05 | Se mide la cobertura y se configura el umbral en el entero ya alcanzado, con 80 % como techo de la guía. No se publica un porcentaje antes de medirlo |
| RP-06 | Se aplica CP-ATE-50: lectura de la ruta y alta solo de los casos ausentes, empezando por identidad, medicación, alerta y salida |
| RP-07 | El caso que falla sin cambio de lógica se aísla o se corrige. No se reintenta en silencio para obtener un verde |
| RP-08 | El usuario del recorrido de navegador se siembra en el job. La contraseña de integración no se escribe en el repositorio |
| RP-09 | El cierre del Bolt exige la prueba del criterio clínico además de Pint y del build |
| RP-10 | Los umbrales del laboratorio se citan como los de la guía. La evidencia de una corrida es el job que realmente se ejecutó |
| RP-11 | Cada propiedad nombra el invariante. La semilla queda fija para poder repetir el fallo |
| RP-12 | Hasta que exista historial de caídas, el orden lo marca el criterio clínico. No se entrena un modelo para este plan |

---

## 12. Métricas y reportes

### 12.1. Indicadores de calidad

Ningún valor de esta tabla es un resultado obtenido. El umbral es el criterio con el que se interpretará la medición cuando exista.

| Indicador | Fórmula | Finalidad | Criterio de interpretación |
| --- | --- | --- | --- |
| Casos ejecutados | Casos ejecutados / casos previstos del Bolt × 100 | Saber si el Bolt corrió el conjunto que le correspondía | 100 % de los casos del criterio antes de integrar |
| Casos aprobados | Casos en verde / casos ejecutados × 100 | Saber cuántos oráculos se cumplieron | 100 % de los casos del criterio. Un caso no ejecutado no cuenta como aprobado |
| Casos fallidos | Casos en rojo / casos ejecutados × 100 | Detectar el fallo antes de integrar | Cero en el job que autoriza la integración |
| Cobertura de código | Líneas cubiertas / líneas del informe del ejecutor × 100 | Evitar que el cambio reduzca la red de seguridad ya alcanzada | Meta de laboratorio: 80 %. En GitHub, el umbral es el mínimo entre 80 y el entero medido. No se usa un porcentaje escrito a priori |
| Densidad de defectos | Defectos confirmados en el Bolt / número de requisitos del Bolt | Comparar unidades sin inventar un tamaño en líneas | Se lee junto con la severidad. Una densidad baja con un defecto crítico no autoriza el cierre |
| Defectos por severidad | Conteo de defectos abiertos en crítica, alta, media y baja | Ordenar la corrección | Cero críticos abiertos al aceptar el Bolt |
| Tasa de resolución | Defectos cerrados con prueba en verde / defectos abiertos en el Bolt × 100 | Ver si la corrección vuelve a Construction y sale de ella | Cada crítico y cada alto cerrado tienen prueba de reproducción en verde |
| Porcentaje de automatización | Casos con script automático / casos del inventario del Bolt × 100 | Ver cuánto del inventario puede repetirse sin un recorrido manual | El plan busca que los casos de API, componente y los tres recorridos de navegador tengan script. Los casos de Inception permanecen como revisión humana y no penalizan este indicador |
| Éxito de la automatización | Casos automáticos en verde / casos automáticos ejecutados en el job × 100 | Ver la estabilidad del job | 100 % para integrar |
| Tiempo de ejecución | Duración del job `validate` | Decidir si más adelante hace falta priorizar por impacto | Mientras la duración permita la suite completa de web y API, se ejecuta completa. La priorización por diff es el paso siguiente, no el comportamiento vigente del workflow |
| Cobertura de regresión | Módulos tocados por el cambio cuya suite se reejecutó / módulos tocados × 100 | Evitar integrar un módulo sin su red de pruebas | 100 % de los módulos tocados, dentro de la suite que el job ya ejecuta |

La cobertura de requisitos se lee en la matriz de la sección 9: cada rango RF de una unidad construida apunta a sus casos. Un requisito de RF-101 a RF-104 no entra en ese cálculo mientras permanezca fuera de alcance.

### 12.2. Informes de avance

El informe de un Bolt contiene:

- la unidad y el identificador de requisito;
- los casos previstos y los ejecutados;
- el resultado del ejecutor local;
- el estado del job, cuando el cambio se integra;
- los defectos abiertos, con severidad, y la rama de corrección;
- la decisión de la persona: aceptado o devuelto a Construction.

No se añade un porcentaje de cobertura que la corrida no haya impreso. Si el ejecutor imprime la cobertura, el informe cita esa salida y conserva el informe LCOV o Clover como evidencia.

### 12.3. Reporte final de pruebas

Al cerrar un incremento que se promueve hacia `main`, el reporte reúne:

- la matriz de trazabilidad de las unidades incluidas;
- el estado del job `validate` del cambio promovido;
- los defectos críticos y altos, cerrados con su prueba;
- los casos que este plan especifica y cuyo script aún no está en el repositorio, citados como especificación, sin resultado de corrida;
- la aceptación de quien responde por el requisito.

El reporte no incluye un acta de pentesting, un resultado de SonarQube ni una corrida del pipeline de laboratorio salvo que esa corrida haya ocurrido y su evidencia esté conservada. La guía del laboratorio sigue siendo la referencia de la compuerta externa.

---

## 13. Aprobaciones

### 13.1. Responsables de validación

| Responsable | Qué valida | Criterio |
| --- | --- | --- |
| Persona que orquesta el Bolt | Que la prueba expresa el criterio, que el rol y la ruta son reales y que la suite del paquete está en verde | No integra con la suite en rojo ni con un oráculo sin leer |
| Responsable del requisito | Que el recorrido crítico del Bolt se ha visto en la aplicación y que el efecto coincide con el requisito | Acepta o devuelve el Bolt |
| Pipeline de integración | Que la regresión automática definida para ese paquete termina sin fallos | El job en rojo detiene la integración |

La misma persona puede ejercer los dos primeros papeles en momentos distintos del Bolt. La aceptación del caso no consiste en confirmar un borrador sin leerlo.

### 13.2. Firmas y aceptación del plan

Este plan queda aceptado cuando las personas responsables confirman que las fases, las unidades y los criterios coinciden con el sistema descrito. La firma no certifica un resultado de ejecución.

| Papel | Nombre | Fecha | Firma |
| --- | --- | --- | --- |
| Persona que orquesta el Bolt |  |  |  |
| Responsable del requisito |  |  |  |
