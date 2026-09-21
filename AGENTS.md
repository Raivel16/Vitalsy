# AGENTS.md

## Contexto del proyecto

Este repositorio es un monorepo con:

- Frontend: React + Vite + TypeScript
- Backend: Laravel
- Base de datos: PostgreSQL
- Infraestructura: Docker
- Documentación: docs/requirements y docs/architecture

## Reglas obligatorias

Antes de implementar cualquier cambio, el agente debe seguir estas reglas:

1. Leer y respetar [docs/architecture/reglas.md](docs/architecture/reglas.md).
2. Leer y respetar [CONTRIBUTING.md](CONTRIBUTING.md).
3. Consultar [docs/requirements/requerimientos.md](docs/requirements/requerimientos.md) antes de definir funcionalidad nueva.
4. Aplicar TDD en backend y frontend: escribir pruebas primero y luego implementar la solución.
5. No asumir requisitos no documentados; si faltan detalles, buscar primero en la documentación del proyecto.
6. Mantener actualizada la documentación técnica en [docs/](docs/).
7. No cerrar un cambio sin pruebas relevantes ejecutadas y en verde.
8. Antes de cualquier implementación, el agente debe presentar un plan de trabajo claro, acotado y verificable, con alcance, pruebas a agregar, archivos afectados y riesgo estimado. Ese plan debe ser revisado y aprobado por el usuario antes de empezar a escribir o modificar código.
9. Si el usuario no autoriza el plan, el agente no debe construir ni editar archivos, ni ejecutar cambios funcionales. Solo puede responder con el plan para aprobación.
10. Una vez aprobado el plan, el agente puede continuar con la implementación mínima y verificable.
11. Organizar el frontend React aplicando Screaming Architecture, de modo que la estructura de carpetas exprese claramente los dominios y módulos funcionales del sistema.
12. Nombrar los commits con el estándar Conventional Commits e incluir el identificador del requerimiento cuando aplique: `tipo(alcance): RF-XX descripción breve`.
13. Mantener los commits atómicos: cada commit debe contener únicamente cambios completamente relacionados con un mismo objetivo, requisito o corrección; los cambios no relacionados deben quedar en commits separados.

## Flujo recomendado

- Definir el requisito o caso de uso.
- Revisar documentación y reglas del proyecto.
- Presentar un plan de implementación para aprobación.
- Esperar la autorización explícita del usuario.
- Crear la rama de trabajo desde `dev` con formato estándar `feature/RF-XX-brief-description` o `bugfix/RF-XX-brief-description`.
- Escribir la prueba antes de la implementación.
- Implementar la menor solución que haga pasar la prueba.
- Organizar las funcionalidades del frontend por dominio o módulo, manteniendo visible su propósito funcional mediante Screaming Architecture.
- Nombrar cada commit con un tipo válido (`feat`, `fix`, `test`, `docs`, `refactor` o `chore`), un alcance opcional y una descripción breve en modo imperativo, sin punto final.
- Mantener separados los cambios no relacionados para facilitar la revisión, reversión y trazabilidad de cada commit.
- Ejecutar validaciones relevantes.
- Documentar cambios si afectan arquitectura o requisitos.
- Hacer PR hacia `dev`; cuando la versión esté lista para producción, promover desde `dev` a `main`.

## Objetivo de contexto

El propósito de este archivo es reducir el consumo innecesario de tokens y evitar que los agentes vuelvan a releer todo el proyecto desde cero para cada tarea. Debe usarse como punto de referencia obligatorio para mantener coherencia con la estrategia del proyecto.
