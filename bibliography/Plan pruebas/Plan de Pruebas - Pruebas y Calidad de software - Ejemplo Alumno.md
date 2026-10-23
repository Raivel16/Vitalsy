**Área Informática** 

**_Mg. Maglioni Arana Caparachin_** 

# **Plan de pruebas de software** 

- “ Sistema Inteligente para la Automatización de Metrados y Diseño Preliminar de Viviendas mediante Drone, BIM Generativo e Inteligencia Artificial en la Empresa G&M Rubí “ 

_Fecha:_ 26/06/2026 

Pág. 1 

##### **Tabla de contenido** 

|Tabla de contenido|2|
|---|---|
|**1. INTRODUCCIÓN**|**4**|
|1.1 Propósito del Documento|4|
|1.2 Alcance|4|
|1.3 Definiciones, Acrónimos y Referencias|4|
|**2. OBJETIVOS DEL PLAN DE PRUEBAS**|**5**|
|2.1 Objetivos Generales|5|
|2.2 Resultados Esperados|5|
|**3. ALCANCE DE LAS PRUEBAS**|**6**|
|3.1 Funcionalidades a Probar|6|
|3.2 Funcionalidades Fuera de Alcance|6|
|**4. ESTRATEGIA DE PRUEBAS**|**7**|
|4.1 Enfoque General|7|
|Metodología TDD — Test-Driven Development|7|
|Framework ASITDD — AI-Symbiotic Integrity Test-Driven Development|7|
|4.2 Niveles de Prueba|7|
|4.3 Tipos de Pruebas|8|
|**5. ENTORNO DE PRUEBAS**|**8**|
|5.1 Hardware|8|
|5.2 Software|9|
|5.3 Datos de Prueba|9|
|5.4 Configuración del Entorno|9|
|**6. RECURSOS**|**10**|
|6.1 Equipo de Trabajo — Roles y Responsabilidades|10|
|6.2 Herramientas de Testing|10|
|**7. PLANIFICACIÓN Y CRONOGRAMA**|**11**|
|7.1 Fases de Pruebas|11|
|7.2 Fechas Clave|11|
|7.3 Hitos del Sprint (Scrum)|12|
|**8. CRITERIOS DE ENTRADA Y SALIDA**|**12**|
|8.1 Condiciones para Iniciar las Pruebas|12|
|8.2 Condiciones para Finalizar las Pruebas|12|
|**9. INVENTARIO COMPLETO DE PRUEBAS POR SPRINT**|**13**|
|**10. GESTIÓN DE DEFECTOS**|**49**|
|10.1 Proceso de Reporte de Errores|49|
|10.2 Herramienta Utilizada|49|
|10.3 Priorización y Seguimiento|50|
|**11. RIESGOS Y MITIGACIÓN**|**50**|
|11.1 Identificación de Riesgos|50|



Pág. 2 

|11.2 Impacto y Probabilidad|50|
|---|---|
|11.3 Planes de Contingencia|51|
|**12. MÉTRICAS Y REPORTES**|**51**|
|12.1 Indicadores (KPIs) de Calidad|51|
|12.2 Informes de Avance|52|
|12.3 Reporte Final de Pruebas|52|
|**13. APROBACIONES**|**52**|
|13.1 Responsables de Validación|52|
|13.2 Firmas / Aceptación del Plan|53|



Pág. 3 

## **<mark>1. INTRODUCCIÓN</mark>** 

#### **<mark>1.1 Propósito del Documento</mark>** 

El presente Plan de Pruebas establece la estrategia, alcance, recursos, cronograma y criterios de calidad aplicables a las pruebas del Sprint 20 del proyecto G&M Rubí. Este documento sirve como referencia oficial para el equipo de QA, los desarrolladores y los stakeholders del proyecto. 

El Sprint 20 introduce capacidades de Inteligencia Artificial Predictiva, Optimización Constructiva y un Motor Cognitivo Avanzado orientado a análisis BIM/GIS contextual. Dado el nivel de complejidad técnica y el impacto en la plataforma ConTech, la cobertura de pruebas es crítica para garantizar la estabilidad y correcta operación del sistema. 

#### **<mark>1.2 Alcance</mark>** 

- Pruebas unitarias y de característica aplicando la metodología TDD (ciclo RED → GREEN → REFACTOR). 

- Pruebas de contrato, adversariales, integración, rendimiento y gobernanza aplicando el framework ASITDD (fases BLUE-CONTRACT, SHIELD-RED, CORE-GREEN y GOLDGOVERNANCE). 

- Validación funcional de los nuevos módulos: Predictive AI Engine, Semantic BIM/GIS Engine y Optimization Engine. 

- Verificación de seguridad, rendimiento y aislamiento multi-tenant. 

#### **<mark>1.3 Definiciones, Acrónimos y Referencias</mark>** 

|**Término / Acrónimo**|**Definición**|
|---|---|
|TDD|Test-Driven Development — metodología de desarrollo guiado por pruebas.<br>Ciclo: RED → GREEN → REFACTOR.|
|ASITDD|AI-Symbiotic Integrity Test-Driven Development — framework avanzado que<br>combina IA con pruebas de integridad sistémica.|
|Scrum|Marco ágil de gestión de proyectos basado en sprints iterativos con<br>ceremonias definidas (Planning, Daily, Review, Retrospective).|
|BIM|Building Information Modeling — modelado digital de información<br>constructiva.|
|GIS|Geographic Information System — sistema de información geográfica.|
|QA|Quality Assurance — Aseguramiento de la Calidad.|
|KPI|Key Performance Indicator — indicador clave de rendimiento.|



Pág. 4 

|RBAC|Role-Based Access Control — control de acceso basado en roles.|
|---|---|
|pgvector|Extensión de PostgreSQL para almacenamiento y búsqueda de vectores de<br>embeddings.|
|Sprint|Iteración de tiempo fijo (1–4 semanas) en Scrum donde se desarrolla un<br>incremento de producto.|
|BLUE-CONTRACT|Fase ASITDD: validación de contratos de API.|
|SHIELD-RED|Fase ASITDD: pruebas adversariales y de seguridad.|
|CORE-GREEN|Fase ASITDD: pruebas unitarias y de característica del núcleo funcional.|
|GOLD-GOVERNANCE|Fase ASITDD: pruebas de rendimiento, carga y gobernanza con<br>SonarQube, OWASP ZAP y JMeter.|



## **<mark>2. OBJETIVOS DEL PLAN DE PRUEBAS</mark>** 

#### **<mark>2.1 Objetivos Generales</mark>** 

- Garantizar que todos los componentes del Sprint 20 funcionen correctamente de acuerdo a los criterios de aceptación definidos. 

- Validar la integridad y estabilidad del sistema ante cargas concurrentes y escenarios adversariales. 

- Asegurar la cobertura mínima del 80% en todos los módulos del sprint mediante TDD y ASITDD. 

- Detectar y documentar defectos de manera temprana para reducir el costo de corrección. 

- Verificar la integración correcta entre el Predictive AI Engine, el Semantic BIM/GIS Engine y el Optimization Engine. 

#### **<mark>2.2 Resultados Esperados</mark>** 

|**Resultado Esperado**|**Criterio de Éxito**|**Metodología**|
|---|---|---|
|Predicciones IA operativas|Respuesta < 10 segundos, precisión ≥<br>85%|TDD + ASITDD|
|Simulaciones constructivas<br>funcionales|Generación de escenarios sin errores|TDD + ASITDD|
|Motor de optimización activo|Reducción de costos demostrable en<br>escenarios de prueba|ASITDD|
|Análisis de riesgos calculado<br>correctamente|Cobertura 100% casos de prueba de<br>riesgo|TDD|
|Embeddings vectoriales operativos|Recuperación < 1 segundo|ASITDD|



Pág. 5 

|Semantic AI contextual activa|Respuesta semántica coherente ≥ 90%|TDD + ASITDD|
|---|---|---|
|Seguridad multi-tenant garantizada|0 fugas de datos entre tenants|ASITDD SHIELD-RED|
|Cobertura de código ≥ 80%|SonarQube reporta ≥ 80%|ASITDD GOLD-<br>GOVERNANCE|



## **<mark>3. ALCANCE DE LAS PRUEBAS</mark>** 

#### **<mark>3.1 Funcionalidades a Probar</mark>** 

|**Módulo**|**Funcionalidad**|**Tipo de Prueba**|**Metodología**|
|---|---|---|---|
|Predictive AI Engine|Predicción de costos futuros|Unit, Feature, Contract|TDD + ASITDD|
|Predictive AI Engine|Predicción de material<br>requerido|Unit, Feature|TDD|
|Predictive AI Engine|Análisis de riesgo constructivo|Unit, Adversarial|TDD + ASITDD|
|Predictive AI Engine|Estimación de tiempo<br>constructivo|Unit, Feature|TDD|
|Semantic BIM/GIS<br>Engine|Comprensión geométrica BIM|Unit, Contract|TDD + ASITDD|
|Semantic BIM/GIS<br>Engine|Razonamiento espacial GIS|Unit, Integration|ASITDD|
|Semantic BIM/GIS<br>Engine|Extracción de contexto<br>semántico|Feature, Integration|TDD + ASITDD|
|Optimization Engine|Reducción de materiales|Unit, Feature|TDD|
|Optimization Engine|Optimización de área y<br>presupuesto|Unit, Performance|TDD + ASITDD|
|Optimization Engine|Eficiencia de recursos|Feature, Performance|ASITDD|
|Simulation Engine|Simulación de escenarios de<br>costo|Feature, Integration|TDD + ASITDD|
|Simulation Engine|Simulación de layout espacial<br>BIM|Feature|TDD|
|AI Security|Aislamiento multi-tenant de IA|Adversarial, Security|ASITDD SHIELD-RED|
|AI Security|Validación de solicitudes IA|Adversarial|ASITDD SHIELD-RED|
|AI Performance|Rendimiento inferencia async|Performance, Carga|ASITDD GOLD-<br>GOVERNANCE|



Pág. 6 

|AI Performance|Caché de respuestas IA|Performance|ASITDD GOLD-|
|---|---|---|---|
||||GOVERNANCE|



#### **<mark>3.2 Funcionalidades Fuera de Alcance</mark>** 

- IA estructural certificada (requiere validación normativa externa). 

- Diseño arquitectónico autónomo total. 

- AGI (Inteligencia General Artificial) constructiva. 

- Machine learning distribuido masivo. 

- IA legal/ingeniería normativa avanzada certificada. 

- Módulos de agendamiento, pagos y facturación (cubiertos en sprints anteriores). 

## **<mark>4. ESTRATEGIA DE PRUEBAS</mark>** 

#### **<mark>4.1 Enfoque General</mark>** 

###### **Metodología TDD — Test-Driven Development** 

- RED: Escribir la prueba antes que el código. La prueba falla. 

- GREEN: Implementar el mínimo código necesario para que la prueba pase. 

- REFACTOR: Optimizar el código sin romper la prueba. 

El inventario TDD comprende 84 pruebas (52 Unit + 32 Feature) distribuidas en 18 módulos a lo largo de los 20 sprints, sin duplicación con el inventario ASITDD. 

###### **Framework ASITDD — AI-Symbiotic Integrity Test-Driven Development** 

|**Fase**|**Descripción**|**Tipos de Prueba**|
|---|---|---|
|BLUE-CONTRACT|Validación de contratos de API y contratos de<br>integración entre servicios.|Contract|
|SHIELD-RED|Pruebas adversariales, de seguridad y resistencia<br>ante ataques.|Adversarial,<br>Security|
|CORE-GREEN|Pruebas funcionales del núcleo: lógica de negocio,<br>flujos y reglas.|Unit, Feature,<br>Integration|
|GOLD-|Pruebas de rendimiento, carga, stress y gobernanza|Performance,|
|GOVERNANCE|con SonarQube, OWASP ZAP y JMeter.|Carga|



Pág. 7 

#### **<mark>4.2 Niveles de Prueba</mark>** 

|**Nivel**|**Descripción**|**Metodología**|**Responsable**|
|---|---|---|---|
|Unitarias|Pruebas de componentes<br>individuales: servicios, modelos,<br>funciones.|TDD (Unit) + ASITDD<br>CORE-GREEN|Desarrolladores|
|Integración|Verificación de la comunicación entre<br>módulos y APIs externas.|ASITDD Integration|QA Engineer|
|Sistema|Validación del sistema completo bajo<br>escenarios funcionales completos.|ASITDD Feature +<br>CORE-GREEN|QA Engineer|
|Aceptación|Confirmación de que el sistema<br>cumple los criterios de aceptación del<br>Sprint.|Scrum Review + ASITDD|Product Owner<br>+ QA|



#### **<mark>4.3 Tipos de Pruebas</mark>** 

|**Tipo**|**Descripción**|**Herramienta**|**Metodología**|
|---|---|---|---|
|Funcionales|Verifican que las funcionalidades se<br>comportan según los requisitos.|PHPUnit / pytest|TDD + ASITDD<br>CORE-GREEN|
|Rendimiento|Evalúan tiempos de respuesta y<br>capacidad bajo carga.|Apache JMeter|ASITDD GOLD-<br>GOVERNANCE|
|Seguridad|Detectan vulnerabilidades y brechas<br>de seguridad.|OWASP ZAP|ASITDD SHIELD-<br>RED|
|Adversariales|Simulan ataques con payloads<br>maliciosos.|OWASP ZAP + Custom|ASITDD SHIELD-<br>RED|
|Contrato|Validan la estabilidad de contratos<br>de API entre consumidores y<br>proveedores.|Pact / Custom|ASITDD BLUE-<br>CONTRACT|
|Regresión|Aseguran que nuevas<br>funcionalidades no rompen las<br>existentes.|CI/CD automatizado|TDD + ASITDD|
|Exploratoria|Sesiones no guionadas para<br>detectar comportamientos<br>inesperados.|Manual|QA Engineer|



Pág. 8 

## **<mark>5. ENTORNO DE PRUEBAS</mark>** 

#### **<mark>5.1 Hardware</mark>** 

|**Componente**|**Especificación Mínima**|**Uso**|
|---|---|---|
|Servidor de Aplicaciones|CPU 8 vCPU, RAM 32 GB, SSD 500 GB|Backend API + IA Engine|
|Servidor de Base de Datos|CPU 4 vCPU, RAM 16 GB, SSD 1 TB|PostgreSQL + pgvector +<br>PostGIS|
|Servidor de Storage|CPU 2 vCPU, RAM 8 GB, HDD 2 TB|MinIO Object Storage|
|Estaciones de QA|CPU 4 núcleos, RAM 16 GB|Ejecución de pruebas y<br>análisis|
|Infraestructura Cloud|Kubernetes cluster (3 nodos mínimo)|Pruebas de escalabilidad|



#### **<mark>5.2 Software</mark>** 

|**Software**|**Versión**|**Propósito**|
|---|---|---|
|Docker + Docker Compose|≥ 24.x|Contenerización del entorno de pruebas|
|Kubernetes|≥ 1.28|Orquestación para pruebas de carga|
|FastAPI|≥ 0.110|Framework backend bajo prueba|
|PostgreSQL + pgvector|≥ 15 + 0.5|Base de datos con extensión vectorial|
|PostGIS|≥ 3.4|Extensión geoespacial para pruebas GIS|
|MinIO|≥ RELEASE.2024|Storage de objetos|
|PHPUnit / pytest|≥ 10 / ≥ 7|Ejecución de pruebas unitarias y de integración|
|SonarQube|≥ 10.x|Análisis estático de calidad de código (GOLD-<br>GOVERNANCE)|
|OWASP ZAP|≥ 2.14|Pruebas de seguridad automatizadas (SHIELD-RED)|
|Apache JMeter|≥ 5.6|Pruebas de carga y rendimiento (GOLD-<br>GOVERNANCE)|
|GitHub Actions / GitLab CI|Actual|Pipeline CI/CD de ejecución de pruebas|



#### **<mark>5.3 Datos de Prueba</mark>** 

• Proyectos BIM/GIS de muestra con modelos IFC y capas geoespaciales en formato 

Pág. 9 

GeoJSON. 

- Datasets históricos de costos constructivos (anonimizados) para entrenar y validar modelos predictivos. 

- Usuarios de prueba con diferentes roles RBAC (admin, gestor de proyecto, analista GIS, usuario IA). 

- Embeddings vectoriales pre-generados para validación de búsqueda semántica. 

- Payloads adversariales para pruebas SHIELD-RED (SQL injection, XSS, IDOR, prompt injection). 

#### **<mark>5.4 Configuración del Entorno</mark>** 

- Entorno de Staging separado del entorno de Producción, con datos de prueba no sensibles. 

- Variables de entorno configuradas mediante archivos .env específicos para QA. 

- Contenedores Docker inicializados con scripts de seed para datos de prueba reproducibles. 

- Acceso al entorno controlado por VPN con credenciales específicas del equipo QA. 

- Monitorización activa con métricas de respuesta durante las pruebas de rendimiento. 

## **<mark>6. RECURSOS</mark>** 

#### **<mark>6.1 Equipo de Trabajo — Roles y Responsabilidades</mark>** 

|**Rol**|**Responsabilidad Principal**|**Participación en**<br>**Sprint**|
|---|---|---|
|QA Lead / Test Manager|Coordinar el plan de pruebas, revisar criterios de<br>aceptación, aprobar releases.|100%|
|QA Engineer Senior|Diseñar y ejecutar casos de prueba ASITDD (todas las<br>fases), revisar resultados.|100%|
|QA Engineer Junior|Ejecutar pruebas TDD (Unit y Feature), documentar<br>resultados.|100%|
|Desarrollador Backend IA|Implementar pruebas TDD del ciclo<br>RED→GREEN→REFACTOR para módulos IA.|30% QA|
|Desarrollador Frontend|Validar componentes React (PredictiveDashboard,<br>OptimizationCenter).|20% QA|
|DevOps Engineer|Configurar entorno de pruebas, pipeline CI/CD,<br>herramientas GOLD-GOVERNANCE.|50%|
|Product Owner (Scrum)|Validar criterios de aceptación en Sprint Review, aprobar<br>resultados.|20%|



Pág. 10 

Scrum Master 

Facilitar ceremonias, remover impedimentos del equipo 15% QA. 

#### **<mark>6.2 Herramientas de Testing</mark>** 

|**Herramienta**|**Tipo**|**Fase ASITDD / TDD**|
|---|---|---|
|pytest / PHPUnit|Pruebas unitarias y de integración|TDD + CORE-GREEN|
|Pact (Contract Testing)|Pruebas de contrato API|BLUE-CONTRACT|
|OWASP ZAP|Pruebas de seguridad y adversariales|SHIELD-RED|
|Apache JMeter|Pruebas de carga y rendimiento|GOLD-GOVERNANCE|
|SonarQube|Calidad estática de código y cobertura|GOLD-GOVERNANCE|
|Postman / Insomnia|Pruebas manuales de API REST|BLUE-CONTRACT + CORE-<br>GREEN|
|GitHub Actions|Ejecución automatizada en CI/CD|Todas las fases|
|Allure Reports|Generación de reportes de pruebas|Reportes y métricas|



## **<mark>7. PLANIFICACIÓN Y CRONOGRAMA</mark>** 

#### **<mark>7.1 Fases de Pruebas</mark>** 

|**Fase**|**Actividades Clave**|**Metodología**|**Semana**|
|---|---|---|---|
|Sprint Planning (QA)|Definición de casos de prueba, asignación de<br>responsabilidades, revisión de criterios de<br>aceptación.|Scrum|Semana 1|
|BLUE-CONTRACT|Validación de contratos de API de los nuevos<br>endpoints IA (Prediction, Optimization,<br>Simulation).|ASITDD|Semana 1–<br>2|
|TDD RED Phase|Escritura de pruebas unitarias y de característica<br>antes del desarrollo.|TDD|Semana 1–<br>2|
|SHIELD-RED|Ejecución de pruebas adversariales y de<br>seguridad sobre los endpoints IA.|ASITDD|Semana 2–<br>3|
|TDD GREEN Phase|Implementación de código y validación de<br>pruebas verdes.|TDD|Semana 2–<br>4|



Pág. 11 

|CORE-GREEN|Pruebas funcionales del Predictive AI Engine,<br>Semantic BIM/GIS Engine y Optimization<br>Engine.|ASITDD|Semana 3–<br>5|
|---|---|---|---|
|TDD REFACTOR Phase|Optimización y refactoring con pruebas estables.|TDD|Semana 4–<br>5|
|GOLD-GOVERNANCE|Pruebas de carga (JMeter), seguridad (OWASP<br>ZAP), calidad estática (SonarQube).|ASITDD|Semana 5–<br>6|
|Pruebas de Regresión|Validación de que el Sprint 20 no rompe<br>funcionalidades de sprints anteriores.|TDD + ASITDD|Semana 6|
|Sprint Review (QA)|Presentación de resultados, defectos y cobertura<br>al Product Owner.|Scrum|Semana 6–<br>7|
|Sprint Retrospective|Análisis de mejoras en el proceso de pruebas<br>para el Sprint 21.|Scrum|Semana 7|



#### **<mark>7.2 Fechas Clave</mark>** 

|**Hito**|**Descripción**|**Semana Estimada**|
|---|---|---|
|Inicio Sprint 20|Kick-off del sprint y Sprint Planning con equipo QA.|Semana 1|
|Contratos API listos|Todos los contratos BLUE-CONTRACT validados y<br>aprobados.|Semana 2|
|Pruebas TDD completas|84 pruebas TDD ejecutadas con cobertura ≥ 80%.|Semana 5|
|Pruebas ASITDD completas|120 casos ASITDD ejecutados (todas las fases).|Semana 6|
|GOLD-GOVERNANCE aprobado|SonarQube ≥ 80% cobertura, 0 vulnerabilidades<br>críticas OWASP.|Semana 6|
|Informe de Pruebas Final|Reporte consolidado entregado al Product Owner.|Semana 7|
|Sprint Review|Demo y validación de criterios de aceptación con<br>stakeholders.|Semana 7|



#### **<mark>7.3 Hitos del Sprint (Scrum)</mark>** 

- Definition of Ready (DoR): Casos de prueba definidos, entorno de staging listo, datos de prueba disponibles. 

- Definition of Done (DoD): Cobertura ≥ 80%, 0 bugs críticos abiertos, GOLD-GOVERNANCE aprobado, criterios de aceptación validados por PO. 

- Daily Scrum QA: Reporte diario de estado de pruebas en el Daily Standup. 

Pág. 12 

## **<mark>8. CRITERIOS DE ENTRADA Y SALIDA</mark>** 

#### **<mark>8.1 Condiciones para Iniciar las Pruebas</mark>** 

|**Criterio de Entrada**|**Responsable**|**Estado Requerido**|
|---|---|---|
|Entorno de Staging desplegado y funcional|DevOps Engineer|Verificado|
|Datos de prueba cargados y disponibles en<br>entorno QA|QA Lead|Verificado|
|Casos de prueba TDD (84 pruebas)<br>documentados y revisados|QA Engineer|Aprobados|
|Casos de prueba ASITDD (120 casos)<br>documentados y revisados|QA Engineer Senior|Aprobados|
|APIs del Predictive AI Engine disponibles con<br>endpoints funcionales|Backend Dev|Desplegado|
|Pipeline CI/CD configurado con herramientas<br>GOLD-GOVERNANCE|DevOps Engineer|Configurado|
|Contratos de API del Sprint 20 definidos y<br>publicados|Backend Dev|Publicados|
|Criterios de aceptación aprobados por el<br>Product Owner|Product Owner|Firmados|
|Herramientas de gestión de defectos<br>configuradas (Jira/Linear)|QA Lead|Listo|



#### **<mark>8.2 Condiciones para Finalizar las Pruebas</mark>** 

|**Criterio de Salida**|**Umbral Aceptable**|**Herramienta de Verificación**|
|---|---|---|
|Cobertura de código total|≥ 80%|SonarQube (GOLD-GOVERNANCE)|
|Pruebas TDD ejecutadas y aprobadas|84/84 (100%)|pytest / PHPUnit|
|Pruebas ASITDD ejecutadas|120/120 (100%)|Framework ASITDD|
|Bugs críticos (Severity 1) abiertos|0|Sistema de gestión de defectos|
|Bugs de alta prioridad (Severity 2)<br>abiertos|≤ 2 (con plan de mitigación)|Sistema de gestión de defectos|
|Vulnerabilidades críticas OWASP ZAP|0|OWASP ZAP (SHIELD-RED)|
|Tiempo de respuesta IA bajo carga|< 10 segundos (p95)|Apache JMeter|
|Tiempo de recuperación de embeddings|< 1 segundo (p95)|Apache JMeter|



Pág. 13 

|Criterios de aceptación validados por PO|100% aprobados|Sprint Review|
|---|---|---|
|Informe de pruebas final entregado|Entregado y firmado|QA Lead|



Pág. 14 

## **<mark>9. INVENTARIO DE PRUEBAS POR SPRINT</mark>** 

El presente inventario detalla todas las pruebas TDD y ASITDD ejecutadas en cada uno de los 20 sprints del proyecto G&M Rubí. Las pruebas TDD se presentan por módulo con su ciclo RED → GREEN → REFACTOR. Las pruebas ASITDD muestran las seis fases (BLUE-CONTRACT, SHIELD-RED, COREGREEN ×3, GOLD-GOVERNANCE) para cada sprint. 

|**Metodología**|**Tipo**|**Total**|**Cobertura Objetivo**|
|---|---|---|---|
|TDD|Unit|52|≥ 80%|
|TDD|Feature|32|≥ 80%|
|ASITDD|Contract — BLUE-CONTRACT|20|100%|
|ASITDD|Adversarial / Security — SHIELD-<br>RED|20|100%|
|ASITDD|Unit + Feature — CORE-GREEN|40|≥ 80%|
|ASITDD|Integration — CORE-GREEN|20|100%|
|ASITDD|Performance / Carga — GOLD-<br>GOVERNANCE|20|100%|
|TOTAL|—|204|≥ 80% global|



### **<mark>SPRINT 1</mark> —  Arquitectura Base y Setup** 

_<mark>Objetivo: Implementar y validar la infraestructura base: servicios, Docker, PostgreSQL y setup inicial del sistema.</mark>_ **TDD: TDD-001 a TDD-004   ASITDD: ASITDD-001 a ASITDD-006** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Core/Config** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**001**|test_valida_estructura_configuracion_<br>core|backend/tests/Unit/Core<br>Config/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**002**|test_persistencia_correcta_datos_mo<br>dulo|backend/tests/Unit/Core<br>Config/|Unit|Datos<br>válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**003**|test_respuesta_valida_integracion_se<br>rvicio|backend/tests/Unit/Core<br>Config/|Unit|API<br>conectada|Respuesta<br>consistente|



Pág. 15 

|**TDD-**<br>**004**|test_manejo_correcto_estado_limite|backend/tests/Unit/Core<br>Config/|Unit|Sistema<br>operativo|Estado<br>controlado|
|---|---|---|---|---|---|



- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**001**|tests/Contract|valida_contrato_api_esta<br>ble|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato<br>JSON|Contrato<br>estable y<br>respuesta<br>200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITD**<br>**D-002**|tests/Adversarial/S<br>ecurity|rechaza_payload_mal<br>icioso|Usuario<br>autenticado<br>con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctame<br>nte|**Segurid**<br>**ad**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITD**<br>**D-003**|tests/Unit|procesa_regla_negocio_corr<br>ectamente|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal<br>del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**|**Tipo**|
|---|---|---|---|---|---|
|||||**Esperado**||



Pág. 16 

|**ASITD**|tests/Feature|flujo_funcional_compl|Infraestructur|Ejecutar|Flujo finaliza|**Feature**|
|---|---|---|---|---|---|---|
|**D-004**||eto|a docker|flujo|sin||
||||operativa|completo|inconsistenci||
|||||del sprint|as||



Pág. 17 

###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITD**<br>**D-005**|tests/Integrat<br>ion|integracion_servicios_e<br>xternos|APIs<br>externas<br>accesibles|Consumir<br>integració<br>n externa|Integración<br>sincronizad<br>a<br>correctame<br>nte|**Integración**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITD**<br>**D-006**|tests/Performa<br>nce|stress_controlado_mo<br>dulo|Métricas<br>habilitadas|Simular<br>concurrenci<br>a y carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 2</mark> —  Autenticación y Seguridad** 

_<mark>Objetivo: Implementar y validar autenticación JWT, control de acceso y seguridad base del sistema.</mark>_ **TDD: TDD-005 a TDD-008   ASITDD: ASITDD-007 a ASITDD-012** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Auth/Security** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultad**<br>**o**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD**<br>**-005**|test_valida_estructura_configuracion<br>_core|backend/tests/Feature/AuthSe<br>curity/|Feature|Servicios<br>inicializados|Resultado<br>válido|
|**TDD**<br>**-006**|test_persistencia_correcta_datos_m<br>odulo|backend/tests/Feature/AuthSe<br>curity/|Feature|Datos válidos<br>existentes|Persistenc<br>ia correcta|
|**TDD**<br>**-007**|test_respuesta_valida_integracion_s<br>ervicio|backend/tests/Feature/AuthSe<br>curity/|Feature|API<br>conectada|Respuest<br>a<br>consistent<br>e|
|**TDD**<br>**-008**|test_manejo_correcto_estado_limite|backend/tests/Feature/AuthSe<br>curity/|Feature|Sistema<br>operativo|Estado<br>controlado|



Pág. 18 

###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**007**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**008**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**009**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**010**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|



Pág. 19 

|**ASITDD-**|tests/Integration|integracion_servicios_externo|APIs externas|Consumir|Integración|**Integració**|
|---|---|---|---|---|---|---|
|**011**||s|accesibles|integración<br>externa|sincronizada<br>correctamente|**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**012**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 3</mark> —  RBAC y Panel Administrativo** 

_<mark>Objetivo: Validar el sistema de roles y permisos (RBAC) y el panel de administración multi-tenant.</mark>_ **TDD: TDD-009 a TDD-012   ASITDD: ASITDD-013 a ASITDD-018** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Projects** 



<!-- Start of picture text -->
ID  Nombre de la Prueba  Archivo / Ruta  Tipo  Precondició Resultado<br>n  Esperado<br>TDD- test_valida_estructura_configuracion_core  backend/tests/Unit/Projects/  Unit  Servicios  Resultado<br>009  inicializados  válido<br>TDD- test_persistencia_correcta_datos_modulo  backend/tests/Unit/Projects/  Unit  Datos válidos  Persistencia<br>010  existentes  correcta<br>TDD- test_respuesta_valida_integracion_servicio  backend/tests/Unit/Projects/  Unit  API conectada  Respuesta<br>011  consistente<br>TDD- test_manejo_correcto_estado_limite  backend/tests/Unit/Projects/  Unit  Sistema  Estado<br>012  operativo  controlado<br><!-- End of picture text -->



<!-- Start of picture text -->
🔵   INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-<br>GOVERNANCE<br>BLUE-CONTRACT — Validación de Contrato API<br>ID  Carpeta  Nombre de la Prueba  Precondición  Acción  Resultado  Tipo<br>Esperado<br><!-- End of picture text -->

Pág. 20 

|**ASITDD-**|tests/Contract|valida_contrato_api_estable|Servicios|Consumir|Contrato|**Contract**|
|---|---|---|---|---|---|---|
|**013**|||inicializados<br>correctamente|endpoint y<br>validar<br>contrato JSON|estable y<br>respuesta 200||



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**014**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**015**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**016**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**017**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**<br>**Carpeta**<br>**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|



Pág. 21 

|**ASITDD-**|tests/Performance|stress_controlado_modulo|Métricas|Simular|Sistema|**Carga**|
|---|---|---|---|---|---|---|
|**018**|||habilitadas|concurrencia y|mantiene<br>||
|||||carga|estabilidad||



### **<mark>SPRINT 4</mark> —  Gestión de Proyectos** 

_<mark>Objetivo: Implementar y validar la gestión completa del ciclo de vida de proyectos BIM/GIS.</mark>_ **TDD: TDD-009 a TDD-012   ASITDD: ASITDD-019 a ASITDD-024** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

|**Módu**<br>|**lo: Projects**<br>|||||
|---|---|---|---|---|---|
|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|**TDD-**<br>**009**|test_valida_estructura_configuracion_core|backend/tests/Unit/Projects/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**010**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/Projects/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**011**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/Projects/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**012**|test_manejo_correcto_estado_limite|backend/tests/Unit/Projects/|Unit|Sistema<br>operativo|Estado<br>controlado|



|🔵**INVE**<br>**GOVERN**|**NTARIO ASITDD — Fases: BLUE-CO**<br>**ANCE**|**NTRACT · SHIE**|**LD-RED · C**|**ORE-GREEN**|**· GOLD-**|
|---|---|---|---|---|---|
|**BL**|**UE-CONTRACT — Validación de Con**|**trato API**||||
|**ID**|**Carpeta**<br>**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|**ASITDD-**<br>**019**|tests/Contract<br>valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|



Pág. 22 

|**ASITDD-**|tests/Adversarial/Securi|rechaza_payload_malicioso|Usuario|Enviar|Solicitud|**Segurida**|
|---|---|---|---|---|---|---|
|**020**|ty||autenticado con<br>|payload<br>|bloqueada|**d**|
||||permisos|inválido o|correctamente||
||||válidos|malicioso|||



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**021**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**022**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**023**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**024**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 5</mark> —  Gestión GIS** 

_<mark>Objetivo: Validar el procesamiento y gestión de datos geoespaciales GIS con PostGIS.</mark>_ **TDD: TDD-013 a TDD-020   ASITDD: ASITDD-025 a ASITDD-030** 

Pág. 23 

###### 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: GIS** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**013**|test_valida_estructura_configuracion_core|backend/tests/Unit/GIS/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**014**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/GIS/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**015**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/GIS/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**016**|test_manejo_correcto_estado_limite|backend/tests/Unit/GIS/|Unit|Sistema<br>operativo|Estado<br>controlado|
|**TDD-**<br>**017**|test_serializacion_datos_geoespaciales|backend/tests/Unit/GIS/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**018**|test_renderizado_correcto_modelo_bim|backend/tests/Unit/GIS/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**019**|test_generacion_consistente_resultado_ia|backend/tests/Unit/GIS/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**020**|test_exportacion_correcta_documento|backend/tests/Unit/GIS/|Unit|Sistema<br>operativo|Estado<br>controlado|



###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**025**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**026**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



Pág. 24 

###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**027**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**028**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**029**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**030**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 6</mark> —  Carga Drone RTK** 

_<mark>Objetivo: Implementar y validar la carga, procesamiento y almacenamiento de datos de vuelo Drone RTK.</mark>_ **TDD: TDD-021 a TDD-024   ASITDD: ASITDD-031 a ASITDD-036** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

**Módulo: Drone RTK** 

Pág. 25 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultad**<br>**o**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD**<br>**-021**|test_valida_estructura_configuracion_core|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|Servicios<br>inicializados|Resultado<br>válido|
|**TDD**<br>**-022**|test_persistencia_correcta_datos_modulo|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|Datos válidos<br>existentes|Persistenci<br>a correcta|
|**TDD**<br>**-023**|test_respuesta_valida_integracion_servicio|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|API conectada|Respuesta<br>consistente|
|**TDD**<br>**-024**|test_manejo_correcto_estado_limite|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|Sistema<br>operativo|Estado<br>controlado|



###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**031**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**032**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**033**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

Pág. 26 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**034**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**035**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**036**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 7</mark> —  Procesamiento Fotogramétrico** 

_<mark>Objetivo: Validar el procesamiento fotogramétrico y generación de modelos 3D a partir de datos drone.</mark>_ **TDD: TDD-021 a TDD-024   ASITDD: ASITDD-037 a ASITDD-042** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Drone RTK** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultad**<br>**o**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD**<br>**-021**|test_valida_estructura_configuracion_core|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|Servicios<br>inicializados|Resultado<br>válido|
|**TDD**<br>**-022**|test_persistencia_correcta_datos_modulo|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|Datos válidos<br>existentes|Persistenci<br>a correcta|
|**TDD**<br>**-023**|test_respuesta_valida_integracion_servicio|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|API conectada|Respuesta<br>consistente|
|**TDD**<br>**-024**|test_manejo_correcto_estado_limite|backend/tests/Feature/DroneRTK<br>/|Featur<br>e|Sistema<br>operativo|Estado<br>controlado|



Pág. 27 

###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**037**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



|**SH**|**IELD-RED — Prue**|**ba Adversarial / Seguri**|**dad**||||
|---|---|---|---|---|---|---|
|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|**ASITDD-**<br>**038**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**039**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**040**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|



Pág. 28 

|**ASITDD-**|tests/Integration|integracion_servicios_externo|APIs externas|Consumir|Integración|**Integració**|
|---|---|---|---|---|---|---|
|**041**||s|accesibles|integración<br>externa|sincronizada<br>correctamente|**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**042**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 8</mark> —  Integración PostGIS** 

_<mark>Objetivo: Validar la integración completa con PostGIS: consultas geoespaciales, índices y rendimiento espacial.</mark>_ **TDD: TDD-025 a TDD-028   ASITDD: ASITDD-043 a ASITDD-048** 

- 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: PostGIS** 



<!-- Start of picture text -->
ID  Nombre de la Prueba  Archivo / Ruta  Tipo  Precondició Resultado<br>n  Esperado<br>TDD- test_valida_estructura_configuracion_core  backend/tests/Unit/PostGIS/  Unit  Servicios  Resultado<br>025  inicializados  válido<br>TDD- test_persistencia_correcta_datos_modulo  backend/tests/Unit/PostGIS/  Unit  Datos válidos  Persistencia<br>026  existentes  correcta<br>TDD- test_respuesta_valida_integracion_servicio  backend/tests/Unit/PostGIS/  Unit  API conectada  Respuesta<br>027  consistente<br>TDD- test_manejo_correcto_estado_limite  backend/tests/Unit/PostGIS/  Unit  Sistema  Estado<br>028  operativo  controlado<br><!-- End of picture text -->

|🔵**INVENTARIO ASITDD**<br>**GOVERNANCE**|**— Fases: BLUE-CO**|**NTRACT · SHIE**|**LD-RED ·**|**CORE-GREEN**|**· GOLD-**|
|---|---|---|---|---|---|
|**BLUE-CONTRACT**|**— Validación de Con**|**trato API**||||
|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|



Pág. 29 

|**ASITDD-**|tests/Contract|valida_contrato_api_estable|Servicios|Consumir|Contrato|**Contract**|
|---|---|---|---|---|---|---|
|**043**|||inicializados<br>correctamente|endpoint y<br>validar|estable y<br>respuesta 200||
|||||contrato JSON|||



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**044**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**045**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**046**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**047**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**<br>**Carpeta**<br>**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|



Pág. 30 

|**ASITDD-**|tests/Performance|stress_controlado_modulo|Métricas|Simular|Sistema|**Carga**|
|---|---|---|---|---|---|---|
|**048**|||habilitadas|concurrencia y|mantiene<br>||
|||||carga|estabilidad||



### **<mark>SPRINT 9</mark> —  Integración Architectures API** 

_<mark>Objetivo: Validar la integración con APIs externas de arquitectura y exportación de datos estructurados.</mark>_ **TDD: TDD-009 a TDD-012   ASITDD: ASITDD-049 a ASITDD-054** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Projects** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**009**|test_valida_estructura_configuracion_core|backend/tests/Unit/Projects/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**010**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/Projects/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**011**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/Projects/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**012**|test_manejo_correcto_estado_limite|backend/tests/Unit/Projects/|Unit|Sistema<br>operativo|Estado<br>controlado|



🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

|🔵|**BLUE-CONT**|**RACT — Validación de C**|**ontrato API**||||
|---|---|---|---|---|---|---|
|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|**ASITDD-**<br>**049**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|



Pág. 31 

|**ASITDD-**|tests/Adversarial/Securi|rechaza_payload_malicioso|Usuario|Enviar|Solicitud|**Segurida**|
|---|---|---|---|---|---|---|
|**050**|ty||autenticado con<br>|payload<br>|bloqueada|**d**|
||||permisos|inválido o|correctamente||
||||válidos|malicioso|||



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**051**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**052**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**053**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**054**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 10</mark> —  Visualización 3D Three.js** 

_<mark>Objetivo: Implementar y validar la renderización 3D interactiva de modelos BIM con Three.js.</mark>_ **TDD: TDD-037 a TDD-040   ASITDD: ASITDD-055 a ASITDD-060** 

Pág. 32 

###### 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Three.js** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD**<br>**-037**|test_valida_estructura_configuracion_core|backend/tests/Feature/ThreeJS/|Feature|Servicios<br>inicializados|Resultado<br>válido|
|**TDD**<br>**-038**|test_persistencia_correcta_datos_modulo|backend/tests/Feature/ThreeJS/|Feature|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD**<br>**-039**|test_respuesta_valida_integracion_servicio|backend/tests/Feature/ThreeJS/|Feature|API conectada|Respuesta<br>consistente|
|**TDD**<br>**-040**|test_manejo_correcto_estado_limite|backend/tests/Feature/ThreeJS/|Feature|Sistema<br>operativo|Estado<br>controlado|



###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**055**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**056**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**057**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



Pág. 33 

###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**058**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**059**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**060**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 11</mark> —  Storage MinIO** 

_<mark>Objetivo: Validar el almacenamiento y recuperación de archivos BIM/GIS con MinIO Object Storage.</mark>_ **TDD: TDD-041 a TDD-044   ASITDD: ASITDD-061 a ASITDD-066** 

###### 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Storage MinIO** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**041**|test_valida_estructura_configuracion_core|backend/tests/Unit/StorageMinIO/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**042**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/StorageMinIO/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**043**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/StorageMinIO/|Unit|API conectada|Respuesta<br>consistente|



Pág. 34 

|**TDD-**|test_manejo_correcto_estado_limite|backend/tests/Unit/StorageMinIO/|Unit|Sistema|Estado|
|---|---|---|---|---|---|
|**044**||||operativo|controlado|



- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**061**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**062**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**063**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**064**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

Pág. 35 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**065**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**066**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 12</mark> —  Procesamiento IA Base** 

_<mark>Objetivo: Implementar y validar el motor de IA base con Claude: análisis semántico e inferencia contextual.</mark>_ **TDD: TDD-045 a TDD-048   ASITDD: ASITDD-067 a ASITDD-072** 

- 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: IA Base** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**045**|test_valida_estructura_configuracion_core|backend/tests/Unit/IABase/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**046**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/IABase/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**047**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/IABase/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**048**|test_manejo_correcto_estado_limite|backend/tests/Unit/IABase/|Unit|Sistema<br>operativo|Estado<br>controlado|



- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 

🔵 **BLUE-CONTRACT — Validación de Contrato API** 

Pág. 36 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**067**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**068**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**069**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**070**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**071**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

Pág. 37 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**072**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



**<mark>SPRINT 13</mark> —  Metrados Inteligentes** _<mark>Objetivo: Validar la generación automática de metrados constructivos mediante IA con precisión ≥ 85%.</mark>_ **TDD: TDD-049 a TDD-052   ASITDD: ASITDD-073 a ASITDD-078** 



<!-- Start of picture text -->
🔴   INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR<br>  Módulo: Metrados<br><!-- End of picture text -->



<!-- Start of picture text -->
ID  Nombre de la Prueba  Archivo / Ruta  Tipo  Precondició Resultado<br>n  Esperado<br>TDD- test_valida_estructura_configuracion_core  backend/tests/Unit/Metrados/  Unit  Servicios  Resultado<br>049  inicializados  válido<br>TDD- test_persistencia_correcta_datos_modulo  backend/tests/Unit/Metrados/  Unit  Datos válidos  Persistencia<br>050  existentes  correcta<br>TDD- test_respuesta_valida_integracion_servicio  backend/tests/Unit/Metrados/  Unit  API conectada  Respuesta<br>051  consistente<br>TDD- test_manejo_correcto_estado_limite  backend/tests/Unit/Metrados/  Unit  Sistema  Estado<br>052  operativo  controlado<br><!-- End of picture text -->

- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 



<!-- Start of picture text -->
🔵  BLUE-CONTRACT — Validación de Contrato API<br>ID  Carpeta  Nombre de la Prueba  Precondición  Acción  Resultado  Tipo<br>Esperado<br>ASITDD- tests/Contract  valida_contrato_api_estable  Servicios  Consumir  Contrato  Contract<br>073  inicializados  endpoint y  estable y<br>correctamente  validar  respuesta 200<br>contrato JSON<br>SHIELD-RED — Prueba Adversarial / Seguridad<br><!-- End of picture text -->

Pág. 38 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**074**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**075**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**076**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**077**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**078**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 14</mark> —  Presupuestos** 

Pág. 39 

_<mark>Objetivo: Implementar y validar la generación de presupuestos APU a partir de metrados validados por IA.</mark>_ **TDD: TDD-053 a TDD-056   ASITDD: ASITDD-079 a ASITDD-084** 

###### 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Presupuestos** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultad**<br>**o**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD**<br>**-053**|test_valida_estructura_configuracion_core|backend/tests/Feature/Presupuestos<br>/|Featur<br>e|Servicios<br>inicializados|Resultado<br>válido|
|**TDD**<br>**-054**|test_persistencia_correcta_datos_modulo|backend/tests/Feature/Presupuestos<br>/|Featur<br>e|Datos válidos<br>existentes|Persistenci<br>a correcta|
|**TDD**<br>**-055**|test_respuesta_valida_integracion_servicio|backend/tests/Feature/Presupuestos<br>/|Featur<br>e|API conectada|Respuesta<br>consistente|
|**TDD**<br>**-056**|test_manejo_correcto_estado_limite|backend/tests/Feature/Presupuestos<br>/|Featur<br>e|Sistema<br>operativo|Estado<br>controlado|



###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**079**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**080**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**|**Tipo**|
|---|---|---|---|---|---|
|||||**Esperado**||



Pág. 40 

|**ASITDD-**|tests/Unit|procesa_regla_negocio_correctamen|Datos válidos|Ejecutar<br>|Reglas de|**Unit**|
|---|---|---|---|---|---|---|
|**081**||te|registrados|lógica<br>|negocio<br>||
|||||principal del<br>módulo|cumplidas||



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**082**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**083**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**084**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 15</mark> —  Motor RAG + pgvector** 

_<mark>Objetivo: Validar el motor de búsqueda semántica RAG con pgvector: embeddings, recuperación < 1s.</mark>_ **TDD: TDD-057 a TDD-060   ASITDD: ASITDD-085 a ASITDD-090** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: RAG/pgvector** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**|**Resultado**|
|---|---|---|---|---|---|
|||||**n**|**Esperado**|
|**TDD-**<br>**057**|test_valida_estructura_configuracion_core|backend/tests/Unit/RAGpgvector/|Unit|Servicios<br>inicializados|Resultado<br>válido|



Pág. 41 

|**TDD-**<br>**058**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/RAGpgvector/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|---|---|---|---|---|---|
|**TDD-**<br>**059**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/RAGpgvector/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**060**|test_manejo_correcto_estado_limite|backend/tests/Unit/RAGpgvector/|Unit|Sistema<br>operativo|Estado<br>controlado|



- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**085**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**086**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**087**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**088**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



Pág. 42 

###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**089**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**090**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 16</mark> —  Exportación PDF y Excel** 

_<mark>Objetivo: Implementar y validar la exportación de reportes, presupuestos y metrados en PDF y Excel.</mark>_ **TDD: TDD-061 a TDD-064   ASITDD: ASITDD-091 a ASITDD-096** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Exports** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**061**|test_valida_estructura_configuracion_core|backend/tests/Feature/Exports/|Feature|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**062**|test_persistencia_correcta_datos_modulo|backend/tests/Feature/Exports/|Feature|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**063**|test_respuesta_valida_integracion_servicio|backend/tests/Feature/Exports/|Feature|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**064**|test_manejo_correcto_estado_limite|backend/tests/Feature/Exports/|Feature|Sistema<br>operativo|Estado<br>controlado|



- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 

Pág. 43 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**091**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**092**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**093**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**094**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**095**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

Pág. 44 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**096**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



**<mark>SPRINT 17</mark> —  Dashboard Analítico** _<mark>Objetivo: Validar el dashboard analítico: KPIs de proyecto, métricas BIM/GIS y reportes en tiempo real.</mark>_ **TDD: TDD-065 a TDD-068   ASITDD: ASITDD-097 a ASITDD-102** 

###### 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Dashboard** 



<!-- Start of picture text -->
ID  Nombre de la Prueba  Archivo / Ruta  Tipo  Precondició Resultad<br>n  o<br>Esperado<br>TDD test_valida_estructura_configuracion_core  backend/tests/Feature/Dashboard Featur Servicios  Resultado<br>-065  /  e  inicializados  válido<br>TDD test_persistencia_correcta_datos_modulo  backend/tests/Feature/Dashboard Featur Datos válidos  Persistenci<br>-066  /  e  existentes  a correcta<br>TDD test_respuesta_valida_integracion_servicio  backend/tests/Feature/Dashboard Featur API conectada  Respuesta<br>-067  /  e  consistente<br>TDD test_manejo_correcto_estado_limite  backend/tests/Feature/Dashboard Featur Sistema  Estado<br>-068  /  e  operativo  controlado<br><!-- End of picture text -->

- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 



<!-- Start of picture text -->
ID  Carpeta  Nombre de la Prueba  Precondición  Acción  Resultado  Tipo<br>Esperado<br>ASITDD- tests/Contract  valida_contrato_api_estable  Servicios  Consumir  Contrato  Contract<br>097  inicializados  endpoint y  estable y<br>correctamente  validar  respuesta 200<br>contrato JSON<br><!-- End of picture text -->

###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

Pág. 45 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**098**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**099**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**100**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**101**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**102**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 18</mark> —  Integración Completa BIM/GIS/IA** 

Pág. 46 

_<mark>Objetivo: Validar la integración end-to-end de BIM, GIS e IA: flujo completo desde plano hasta presupuesto.</mark>_ **TDD: TDD-069 a TDD-072   ASITDD: ASITDD-103 a ASITDD-108** 

###### 🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Integración Full** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultad**<br>**o**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD**<br>**-069**|test_valida_estructura_configuracion_core|backend/tests/Feature/IntegracionFull<br>/|Featur<br>e|Servicios<br>inicializados|Resultado<br>válido|
|**TDD**<br>**-070**|test_persistencia_correcta_datos_modulo|backend/tests/Feature/IntegracionFull<br>/|Featur<br>e|Datos válidos<br>existentes|Persistenci<br>a correcta|
|**TDD**<br>**-071**|test_respuesta_valida_integracion_servicio|backend/tests/Feature/IntegracionFull<br>/|Featur<br>e|API conectada|Respuesta<br>consistente|
|**TDD**<br>**-072**|test_manejo_correcto_estado_limite|backend/tests/Feature/IntegracionFull<br>/|Featur<br>e|Sistema<br>operativo|Estado<br>controlado|



###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**103**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**104**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**<br>**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**|**Tipo**|
|---|---|---|---|---|---|
|||||**Esperado**||



Pág. 47 

|**ASITDD-**|tests/Unit|procesa_regla_negocio_correctamen|Datos válidos|Ejecutar<br>|Reglas de|**Unit**|
|---|---|---|---|---|---|---|
|**105**||te|registrados|lógica<br>|negocio<br>||
|||||principal del<br>módulo|cumplidas||



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**106**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**107**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**108**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 19</mark> —  Optimización y Rendimiento** 

_<mark>Objetivo: Validar la optimización del sistema: caching, workers async, rendimiento < 10s en operaciones IA.</mark>_ **TDD: TDD-073 a TDD-080   ASITDD: ASITDD-109 a ASITDD-114** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

###### **Módulo: Optimización** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**|**Resultado**|
|---|---|---|---|---|---|
|||||**n**|**Esperado**|
|**TDD-**<br>**073**|test_valida_estructura_configuracion_core|backend/tests/Unit/Optimizacion/|Unit|Servicios<br>inicializados|Resultado<br>válido|



Pág. 48 

|**TDD-**<br>**074**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/Optimizacion/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|---|---|---|---|---|---|
|**TDD-**<br>**075**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/Optimizacion/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**076**|test_manejo_correcto_estado_limite|backend/tests/Unit/Optimizacion/|Unit|Sistema<br>operativo|Estado<br>controlado|



###### **<mark>Módulo: Observabilidad</mark>** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultad**<br>**o**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD**<br>**-077**|test_valida_estructura_configuracion_core|backend/tests/Feature/Observabilidad<br>/|Featur<br>e|Servicios<br>inicializados|Resultado<br>válido|
|**TDD**<br>**-078**|test_persistencia_correcta_datos_modulo|backend/tests/Feature/Observabilidad<br>/|Featur<br>e|Datos válidos<br>existentes|Persistenci<br>a correcta|
|**TDD**<br>**-079**|test_respuesta_valida_integracion_servicio|backend/tests/Feature/Observabilidad<br>/|Featur<br>e|API conectada|Respuesta<br>consistente|
|**TDD**<br>**-080**|test_manejo_correcto_estado_limite|backend/tests/Feature/Observabilidad<br>/|Featur<br>e|Sistema<br>operativo|Estado<br>controlado|



###### 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLDGOVERNANCE** 

###### 🔵 **BLUE-CONTRACT — Validación de Contrato API** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**109**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**110**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

Pág. 49 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**111**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**112**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**113**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**114**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



### **<mark>SPRINT 20</mark> —  Gobernanza ASITDD Final + IA Predictiva** 

_<mark>Objetivo: Ejecutar la certificación GOLD-GOVERNANCE completa, validar IA predictiva y Motor Cognitivo Avanzado del Sprint 20.</mark>_ 

**TDD: TDD-045 a TDD-060 / TDD-073 a TDD-076   ASITDD: ASITDD-115 a ASITDD-120** 

🔴 **INVENTARIO TDD — Ciclo RED → GREEN → REFACTOR** 

**Módulo: IA Base** 

|**ID**<br>**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**|**Resultado**|
|---|---|---|---|---|
||||**n**|**Esperado**|



Pág. 50 

|**TDD-**<br>**045**|test_valida_estructura_configuracion_core|backend/tests/Unit/IABase/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|---|---|---|---|---|---|
|**TDD-**<br>**046**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/IABase/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**047**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/IABase/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**048**|test_manejo_correcto_estado_limite|backend/tests/Unit/IABase/|Unit|Sistema<br>operativo|Estado<br>controlado|



###### **<mark>Módulo: BIM</mark>** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**029**|test_valida_estructura_configuracion_core|backend/tests/Unit/BIM/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**030**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/BIM/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**031**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/BIM/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**032**|test_manejo_correcto_estado_limite|backend/tests/Unit/BIM/|Unit|Sistema<br>operativo|Estado<br>controlado|
|**TDD-**<br>**033**|test_serializacion_datos_geoespaciales|backend/tests/Unit/BIM/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**034**|test_renderizado_correcto_modelo_bim|backend/tests/Unit/BIM/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**035**|test_generacion_consistente_resultado_ia|backend/tests/Unit/BIM/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**036**|test_exportacion_correcta_documento|backend/tests/Unit/BIM/|Unit|Sistema<br>operativo|Estado<br>controlado|



###### **<mark>Módulo: GIS</mark>** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**013**|test_valida_estructura_configuracion_core|backend/tests/Unit/GIS/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**014**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/GIS/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**015**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/GIS/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**016**|test_manejo_correcto_estado_limite|backend/tests/Unit/GIS/|Unit|Sistema<br>operativo|Estado<br>controlado|



Pág. 51 

|**TDD-**<br>**017**|test_serializacion_datos_geoespaciales|backend/tests/Unit/GIS/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|---|---|---|---|---|---|
|**TDD-**<br>**018**|test_renderizado_correcto_modelo_bim|backend/tests/Unit/GIS/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**019**|test_generacion_consistente_resultado_ia|backend/tests/Unit/GIS/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**020**|test_exportacion_correcta_documento|backend/tests/Unit/GIS/|Unit|Sistema<br>operativo|Estado<br>controlado|



###### **<mark>Módulo: RAG/pgvector</mark>** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**057**|test_valida_estructura_configuracion_core|backend/tests/Unit/RAGpgvector/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**058**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/RAGpgvector/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**059**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/RAGpgvector/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**060**|test_manejo_correcto_estado_limite|backend/tests/Unit/RAGpgvector/|Unit|Sistema<br>operativo|Estado<br>controlado|



###### **<mark>Módulo: Optimización</mark>** 

|**ID**|**Nombre de la Prueba**|**Archivo / Ruta**|**Tipo**|**Precondició**<br>**n**|**Resultado**<br>**Esperado**|
|---|---|---|---|---|---|
|**TDD-**<br>**073**|test_valida_estructura_configuracion_core|backend/tests/Unit/Optimizacion/|Unit|Servicios<br>inicializados|Resultado<br>válido|
|**TDD-**<br>**074**|test_persistencia_correcta_datos_modulo|backend/tests/Unit/Optimizacion/|Unit|Datos válidos<br>existentes|Persistencia<br>correcta|
|**TDD-**<br>**075**|test_respuesta_valida_integracion_servicio|backend/tests/Unit/Optimizacion/|Unit|API conectada|Respuesta<br>consistente|
|**TDD-**<br>**076**|test_manejo_correcto_estado_limite|backend/tests/Unit/Optimizacion/|Unit|Sistema<br>operativo|Estado<br>controlado|



- 🔵 **INVENTARIO ASITDD — Fases: BLUE-CONTRACT · SHIELD-RED · CORE-GREEN · GOLD-** 

- **GOVERNANCE** 

🔵 **BLUE-CONTRACT — Validación de Contrato API** 

Pág. 52 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**115**|tests/Contract|valida_contrato_api_estable|Servicios<br>inicializados<br>correctamente|Consumir<br>endpoint y<br>validar<br>contrato JSON|Contrato<br>estable y<br>respuesta 200|**Contract**|



###### **<mark>SHIELD-RED — Prueba Adversarial / Seguridad</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**116**|tests/Adversarial/Securi<br>ty|rechaza_payload_malicioso|Usuario<br>autenticado con<br>permisos<br>válidos|Enviar<br>payload<br>inválido o<br>malicioso|Solicitud<br>bloqueada<br>correctamente|**Segurida**<br>**d**|



###### **<mark>CORE-GREEN — Prueba Unitaria</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**117**|tests/Unit|procesa_regla_negocio_correctamen<br>te|Datos válidos<br>registrados|Ejecutar<br>lógica<br>principal del<br>módulo|Reglas de<br>negocio<br>cumplidas|**Unit**|



###### **<mark>CORE-GREEN — Prueba de Feature / Funcional</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**118**|tests/Feature|flujo_funcional_completo|Infraestructura<br>docker operativa|Ejecutar flujo<br>completo del<br>sprint|Flujo finaliza sin<br>inconsistencias|**Feature**|



###### **<mark>CORE-GREEN — Prueba de Integración</mark>** 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**119**|tests/Integration|integracion_servicios_externo<br>s|APIs externas<br>accesibles|Consumir<br>integración<br>externa|Integración<br>sincronizada<br>correctamente|**Integració**<br>**n**|



###### **<mark>GOLD-GOVERNANCE — Prueba de Rendimiento / Carga</mark>** 

Pág. 53 

|**ID**|**Carpeta**|**Nombre de la Prueba**|**Precondición**|**Acción**|**Resultado**<br>**Esperado**|**Tipo**|
|---|---|---|---|---|---|---|
|**ASITDD-**<br>**120**|tests/Performance|stress_controlado_modulo|Métricas<br>habilitadas|Simular<br>concurrencia y<br>carga|Sistema<br>mantiene<br>estabilidad|**Carga**|



## **<mark>10. GESTIÓN DE DEFECTOS</mark>** 

#### **<mark>10.1 Proceso de Reporte de Errores</mark>** 

|**Paso**|**Actividad**|**Responsable**|
|---|---|---|
|1|Identificación del defecto durante la ejecución de la prueba.|QA Engineer|
|2|Documentación del defecto: ID, descripción, pasos para reproducir,<br>resultado obtenido vs. esperado, severidad, prioridad, evidencia<br>(logs/screenshots).|QA Engineer|
|3|Registro en el sistema de gestión de defectos (Jira/Linear) con<br>asignación al desarrollador responsable.|QA Lead|
|4|Análisis y corrección del defecto por el desarrollador.|Desarrollador|
|5|Re-ejecución de la prueba fallida + regresión de pruebas relacionadas.|QA Engineer|
|6|Verificación y cierre del defecto si la prueba pasa correctamente.|QA Lead|
|7|Actualización del informe de defectos y métricas del sprint.|QA Lead|



#### **<mark>10.2 Herramienta Utilizada</mark>** 

- Sistema de Gestión de Defectos: Jira / Linear (según configuración del equipo). 

- Control de versiones: Git — cada defecto corregido debe estar asociado a un commit con referencia al ID del defecto. 

- Comunicación: Slack — canal #gmrubi-qa para notificaciones de defectos críticos. 

#### **<mark>10.3 Priorización y Seguimiento</mark>** 

|**Severidad**|**Descripción**|**SLA de Resolución**|**Impacto**|
|---|---|---|---|
|Critical (S1)|El sistema no puede continuar operando.<br>Bloquea el sprint.|24 horas|Bloqueo total|



Pág. 54 

|High (S2)|Funcionalidad principal afectada sin<br>workaround.|48 horas|Alto impacto<br>negocio|
|---|---|---|---|
|Medium (S3)|Funcionalidad afectada con workaround<br>disponible.|5 días hábiles|Impacto<br>moderado|
|Low (S4)|Defecto menor, cosmético o de rendimiento no<br>crítico.|Siguiente sprint|Impacto bajo|



## **<mark>11. RIESGOS Y MITIGACIÓN</mark>** 

#### **<mark>11.1 Identificación de Riesgos</mark>** 

|**ID Riesgo**|**Descripción del Riesgo**|**Área**|**Origen**|
|---|---|---|---|
|R-001|Predicciones IA con baja precisión (< 85%) en datos de<br>producción.|IA Predictiva|Modelo ML|
|R-002|Tiempos de inferencia superiores a 10 segundos bajo<br>carga concurrente.|Rendimiento|Arquitectura IA|
|R-003|Fuga de datos entre tenants en el modelo de<br>aislamiento multi-tenant de IA.|Seguridad|Arquitectura<br>SaaS|
|R-004|Sobreajuste (overfitting) de modelos predictivos en<br>datos de entrenamiento.|IA|ML Engineering|
|R-005|Costo de tokens API IA superior al presupuesto del<br>sprint.|Costos|Consumo IA|
|R-006|Indisponibilidad del entorno de Staging durante las<br>pruebas de carga.|Infraestructura|DevOps|
|R-007|Cambios de requisitos tardíos que invaliden casos de<br>prueba diseñados.|Gestión|Scrum|
|R-008|Resultados inconsistentes de embeddings vectoriales<br>entre ejecuciones.|IA Semántica|pgvector|



#### **<mark>11.2 Impacto y Probabilidad</mark>** 

|**ID Riesgo**|**Probabilidad**|**Impacto**||**Nivel de Riesgo**|
|---|---|---|---|---|
|R-001|Media|Alto|Alto||
|R-002|Alta|Alto|Crítico||
|R-003|Baja|Crítico|Alto||



Pág. 55 

|R-004|Media|Medio|Medio|
|---|---|---|---|
|R-005|Alta|Medio|Medio|
|R-006|Baja|Alto|Medio|
|R-007|Media|Medio|Medio|
|R-008|Baja|Medio|Bajo|



#### **<mark>11.3 Planes de Contingencia</mark>** 

|**ID Riesgo**|**Plan de Mitigación**|**Responsable**|
|---|---|---|
|R-001|Implementar validación cruzada de modelos ML antes de producción.<br>Establecer umbral mínimo de precisión en criterios de aceptación.|QA Lead + ML Engineer|
|R-002|Configurar workers asíncronos y caché de predicciones. Límite de<br>concurrencia ajustable. Pruebas de carga progresivas.|DevOps + Backend Dev|
|R-003|Pruebas ASITDD SHIELD-RED específicas de aislamiento de tenant.<br>Revisión de código de isolación por arquitecto.|QA Senior + Arquitecto|
|R-004|Aplicar técnicas de regularización y validación con datos externos. Fine-<br>tuning controlado con datasets de validación.|ML Engineer|
|R-005|Implementar caché agresivo de respuestas IA. Monitoreo de costos en<br>tiempo real con alertas.|DevOps + PO|
|R-006|Mantener entorno de backup. Ejecutar pruebas de carga en horarios de<br>menor actividad.|DevOps|
|R-007|Congelamiento de requisitos al inicio del sprint (Sprint Planning).<br>Change freeze durante semanas 4–6.|Scrum Master + PO|
|R-008|Seed determinístico para generación de embeddings en entorno QA.<br>Fixtures de datos fijos para pruebas.|QA Engineer|



## **<mark>12. MÉTRICAS Y REPORTES</mark>** 

#### **<mark>12.1 Indicadores (KPIs) de Calidad</mark>** 

|**KPI**|**Descripción**|**Objetivo**|**Herramienta**|
|---|---|---|---|
|Cobertura de Código|Porcentaje de líneas de código<br>cubiertas por pruebas.|≥ 80%|SonarQube|
|Tasa de Éxito de Pruebas|Porcentaje de casos de prueba que<br>pasan en primera ejecución.|≥ 90%|pytest / PHPUnit|



Pág. 56 

|Densidad de Defectos|Número de bugs por cada 100 casos<br>de prueba ejecutados.|< 5|Jira / Linear|
|---|---|---|---|
|Tiempo Medio de Resolución<br>(MTTR)|Tiempo promedio para corregir un<br>defecto desde su reporte.|< 48h (S1/S2)|Jira / Linear|
|Cobertura de Requisitos|Porcentaje de requisitos del sprint<br>cubiertos por al menos un caso de<br>prueba.|100%|Matriz de trazabilidad|
|Tiempo de Respuesta IA (p95)|Percentil 95 de tiempo de respuesta del<br>Predictive AI Engine.|< 10 segundos|Apache JMeter|
|Tiempo de Recuperación<br>Embeddings (p95)|Percentil 95 de recuperación vectorial.|< 1 segundo|Apache JMeter|
|Vulnerabilidades Críticas|Número de vulnerabilidades OWASP<br>críticas detectadas.|0|OWASP ZAP|
|Deuda Técnica (SonarQube)|Tiempo estimado para resolver deuda<br>técnica detectada.|< 5 días|SonarQube|
|Pruebas Automatizadas (%)|Porcentaje de casos de prueba<br>automatizados vs. manuales.|≥ 85%|CI/CD Pipeline|



#### **<mark>12.2 Informes de Avance</mark>** 

- Daily QA Report: Reporte diario en el Daily Scrum sobre estado de pruebas (ejecutadas, fallidas, bloqueadas). 

- Weekly Test Summary: Resumen semanal con KPIs actualizados enviado al QA Lead y Product Owner. 

- Sprint Mid-Point Review: Revisión a mitad de sprint con métricas y ajustes de prioridad si se detectan riesgos. 

#### **<mark>12.3 Reporte Final de Pruebas</mark>** 

- Resumen ejecutivo de resultados (TDD + ASITDD). 

- Métricas finales de cobertura, defectos y rendimiento. 

- Lista de defectos abiertos con plan de resolución. 

- Evidencias de GOLD-GOVERNANCE (reportes SonarQube, OWASP ZAP, JMeter). 

- Recomendaciones para el Sprint 21. 

- Firma de aprobación del QA Lead y el Product Owner. 

## **<mark>13. APROBACIONES</mark>** 

Pág. 57 

#### **<mark>13.1 Responsables de Validación</mark>** 

|**Rol**|**Responsabilidad en el Plan**|**Estado**|
|---|---|---|
|QA Lead / Test Manager|Elaboración y revisión técnica del plan completo.||
|QA Engineer Senior|Validación de estrategia ASITDD y casos de prueba.||
|Backend Lead (IA)|Revisión de criterios técnicos de pruebas IA.||
|DevOps Engineer|Validación de entorno, herramientas y pipeline CI/CD.||
|Scrum Master|Alineación del plan con ceremonias y sprint Scrum.||
|Product Owner|Aprobación de criterios de aceptación y resultados<br>esperados.||



#### **<mark>13.2 Firmas / Aceptación del Plan</mark>** 

|**Nombre y Apellido**|**Rol**|**Firma**|**Fecha**|
|---|---|---|---|
|Quintana Cristhian|QA Lead / Test Manager|||
|Barrera Gina|QA Engineer Senior|||
||Backend Lead IA|||
||DevOps Engineer|||
||Scrum Master|||
||Product Owner|||



Pág. 58 

