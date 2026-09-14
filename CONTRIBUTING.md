# Contribución

Este proyecto exige metodología TDD en frontend y backend.

## Flujo de ramas y entornos

- La rama base de desarrollo es `dev`.
- La rama de producción es `main`.
- Toda feature nueva o requisito a implementar debe crearse desde `dev`.
- Una vez que una feature está validada y lista para producción, se hace merge hacia `main` desde una rama de release o mediante PR aprobado.
- El flujo debe mantenerse como: `feature/* -> dev -> main`.

## Reglas obligatorias

1. Escribe la prueba antes de la implementación.
2. Para backend, usa PHPUnit o Pest para validar endpoints, servicios y modelos.
3. Para frontend, usa Vitest + Testing Library y valida formularios con mensajes de error y alertas visuales.
4. No se aprueba un PR ni un commit si no hay pruebas verdes.
5. Mantén la documentación técnica actualizada en `docs/`.
6. Consulta `docs/requirements/requerimientos.md` antes de implementar nuevas funcionalidades.
7. Todas las ramas de feature deben partir de `dev` y seguir el formato estándar:
   - `feature/RF-XX-brief-description`
   - `bugfix/RF-XX-brief-description`
   - `hotfix/RF-XX-brief-description`
8. El identificador del requerimiento (por ejemplo `RF-42`, `RF-81`, `RNF-05`) debe incluirse en el nombre de la rama para identificar exactamente qué cambio se está implementando.

## Flujo recomendado

1. Crear rama desde `dev` usando el formato estándar.
2. Implementar la prueba correspondiente.
3. Ejecutar la prueba y confirmar que falla antes de la implementación.
4. Desarrollar la solución mínima.
5. Ejecutar pruebas relevantes y validar el cambio.
6. Abrir Pull Request hacia `dev` con evidencia de verificación.
7. Cuando el cambio esté validado, hacer merge a `dev` y luego, si corresponde, preparar el paso a `main`.

## Checklist previo al merge

- [ ] La rama se originó desde `dev`
- [ ] El nombre incluye el identificador del requisito (`RF-XX` o `RNF-XX`)
- [ ] Pruebas relevantes ejecutadas y en verde
- [ ] Validaciones de formularios/UX implementadas
- [ ] Documentación actualizada
- [ ] Requerimientos revisados
- [ ] PR con descripción clara y evidencia de pruebas
