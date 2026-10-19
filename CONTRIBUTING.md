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
7. Organiza el frontend React aplicando Screaming Architecture, de modo que las carpetas y módulos reflejen claramente el dominio y la funcionalidad implementada.
8. Nombra los commits usando Conventional Commits con el formato `tipo(alcance): RF-XX descripción breve` cuando exista un requisito asociado.
   - Tipos permitidos: `feat`, `fix`, `test`, `docs`, `refactor` y `chore`.
   - Usa minúsculas, verbos en modo imperativo y no agregues punto final.
   - Cada commit debe contener únicamente cambios completamente relacionados con un mismo objetivo, requisito o corrección. No mezcles cambios no relacionados.
   - Ejemplo: `feat(admision): RF-01 consultar orden de internamiento`.
9. Todas las ramas de feature deben partir de `dev` y seguir el formato estándar:
   - `feature/RF-XX-brief-description`
   - `bugfix/RF-XX-brief-description`
   - `hotfix/RF-XX-brief-description`
10. El identificador del requerimiento (por ejemplo `RF-47`, `RF-87`, `RNF-05`) debe incluirse en el nombre de la rama para identificar exactamente qué cambio se está implementando.

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

## Pruebas del backend en paralelo

`php artisan test` usa SQLite (`backend/api/database/testing.sqlite`). Si varias ejecuciones corren a la vez (varios agentes o terminales) compiten por ese archivo. Defina `VITALSY_TEST_SQLITE` con la ruta de un archivo temporal propio para aislar la base de pruebas:

```bash
VITALSY_TEST_SQLITE=/tmp/vitalsy-test-a.sqlite php artisan test
```

En PowerShell: `$env:VITALSY_TEST_SQLITE = "$env:TEMP\vitalsy-test-a.sqlite"; php artisan test`. Es opcional; sin la variable se usa el archivo por defecto.
