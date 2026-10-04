# Git Flow del Proyecto Vitalsy

## Objetivo

Mantener un flujo claro y reproducible para desarrollo, validación y despliegue:

- `main`: producción
- `dev`: integración del desarrollo
- `feature/*`, `bugfix/*`, `hotfix/*`: trabajo de tareas específicas

## 1. Antes de empezar una feature

Siempre partir desde la última versión de `dev`.

```bash
git checkout dev
git pull origin dev
```

Si el repositorio remoto aún no tiene `dev`, crearla desde `main`:

```bash
git checkout main
git pull origin main
git checkout -b dev
```

Luego crear la rama de la feature con el identificador del requerimiento:

```bash
git checkout -b feature/RF-XX-brief-description
git push -u origin feature/RF-XX-brief-description
```

Ejemplos:

```bash
git checkout -b feature/RF-42-admision
git checkout -b bugfix/RF-06-consentimiento
git checkout -b hotfix/RF-81-cobertura-extraordinaria
```

## 2. Durante el desarrollo

Cuando haya cambios nuevos en remoto, sincronizar antes de seguir trabajando:

```bash
git fetch origin
git pull --rebase origin feature/RF-XX-brief-description
```

Cuando se quiera actualizar con la última versión de `dev`:

```bash
git checkout feature/RF-XX-brief-description
git fetch origin
git rebase origin/dev
```

## 3. Confirmar cambios

```bash
git status
git add .
git commit -m "feat(admision): RF-XX describir el cambio"
```

Los commits deben seguir Conventional Commits con el formato `tipo(alcance): RF-XX descripción breve` cuando estén asociados a un requisito. Los tipos permitidos son `feat`, `fix`, `test`, `docs`, `refactor` y `chore`; deben escribirse en minúsculas, con un verbo en modo imperativo y sin punto final. Para cambios sin requisito asociado se omite `RF-XX`. Cada commit debe ser atómico y contener únicamente cambios completamente relacionados con un mismo objetivo, requisito o corrección; los cambios no relacionados deben registrarse en commits separados.

Subir la rama:

```bash
git push origin feature/RF-XX-brief-description
```

## 4. Crear Pull Request hacia dev

Desde GitHub:

1. Ir a la rama `feature/RF-XX-brief-description`
2. Click en `Compare & pull request`
3. Base: `dev`
4. Head: `feature/RF-XX-brief-description`
5. Completar título y descripción
6. Solicitar revisión
7. Merge cuando esté validado

Comandos equivalentes:

```bash
git checkout feature/RF-XX-brief-description
git push origin feature/RF-XX-brief-description
```

Luego desde la interfaz de GitHub crear el PR.

## 5. Merge de dev a main

Cuando `dev` esté lista para producción:

```bash
git checkout dev
git pull origin dev
git checkout main
git pull origin main
git merge --no-ff dev
```

Luego publicar:

```bash
git push origin main
```

Desde GitHub, opcionalmente abrir un PR desde `dev` hacia `main` si prefieres hacerlo vía interfaz.

## 6. Reglas de trabajo

- No trabajar directamente en `main`.
- Todas las features parten desde `dev`.
- El nombre de la rama debe incluir el identificador del requisito.
- Cada cambio debe tener pruebas relevantes antes de merge.
- Todo PR hacia `dev` debe indicar claramente: alcance, pruebas y riesgo.
- Todo merge a `main` requiere validación y evidencia de pruebas.
