# Subir Vitalsy al laboratorio PaaS

Guía del día en que el proyecto se publica en el GitLab del laboratorio para que el pipeline lo despliegue. El código ya está adaptado: no hay que rehacer la estructura.

El remoto `origin` apunta a GitHub. El laboratorio es otro servidor. Lo que se sube al GitLab del laboratorio es una copia de `main` de GitHub. Ese mismo `main` es el que se despliega en AWS (`despliegue-produccion.md`). Por eso todo lo que entra a `main` tiene que funcionar en AWS y no puede bajar la nota de SonarQube del laboratorio.

## Qué debe quedar listo antes de salir

- Red del laboratorio o VPN institucional. Sin eso no se abre `gitlabcontinental.com` ni `192.168.0.200`.
- Cuenta en ese GitLab con el correo institucional y una llave SSH ya agregada en el perfil.
- `project.yml` con el nombre `vitalsy`. Con ese nombre la dirección queda `http://vitalsy.devops.local`.
- `.gitlab-ci.yml` intacto: solo incluye `root/laboratorio-devops`. No agregues jobs.
- Módulos en `frontend/web` y `backend/api`, cada uno con `package.json` o `composer.json`, `Dockerfile` y `.env.example`.
- `database/init.sql` y `database/seeds.sql` en la raíz.
- El archivo `.env` de tu PC no se sube. Ahí está `DEMO_PASSWORD=Vitalsy.2026` para Docker local. En el laboratorio la plantilla versionada usa `password_ejemplo`.

## 1. Comprobar el código en tu PC

Desde la raíz del repositorio, en Git Bash:

```bash
(cd frontend/web && npm ci && npm test && npm run build)
(cd backend/api && php artisan test && ./vendor/bin/pint --test)
```

Las dos líneas tienen que terminar en verde. Es lo mismo que comprueba el CI de GitHub en cada PR. El frontend deja `frontend/web/coverage/lcov.info`. Si PHP local no tiene PCOV, el backend igual corre los tests y el aviso de cobertura es esperado: el CI del laboratorio es el que mide SonarQube.

Revisa que no vayas a subir secretos:

```bash
git status
```

No debe aparecer `.env`. Sí pueden aparecer `.env.example`, `.gitlab-ci.yml`, `project.yml`, `database/` y `frontend/web` / `backend/api`.

## 2. Crear el proyecto vacío en el GitLab del laboratorio

1. Entra a `http://gitlabcontinental.com` o `http://192.168.0.200`.
2. Crea un proyecto nuevo, vacío, sin README, sin `.gitignore` y sin licencia.
3. No descargues ni clones `laboratorio-template` encima de este repo. Esta copia ya tiene el include del pipeline.
4. Copia la URL SSH del proyecto nuevo, por ejemplo `git@gitlabcontinental.com:usuario/vitalsy.git`.

## 3. Enviar el código a `main` de ese GitLab

El pipeline del laboratorio arranca con un push a `main` de su repositorio. Tu rama actual puede seguir llamándose como está. Este comando publica el commit en el que estás hacia el `main` del laboratorio y no toca GitHub:

```bash
git remote add laboratorio git@gitlabcontinental.com:USUARIO/vitalsy.git
git push -u laboratorio HEAD:main
```

Cambia la URL por la de tu proyecto. Si el remoto `laboratorio` ya existe, no lo vuelvas a agregar: usa solo el `git push`.

## 4. Seguir el pipeline

En el proyecto del laboratorio: **CI/CD → Pipelines**. El orden es Detect, Database, Variables de entorno, Deploy backend, Deploy Python, Deploy frontend, Proxy, Test, Security, Quality, Gate, y el cierre con el reporte.

- Python puede decir «No Python modules found». Este proyecto no tiene módulo Python.
- Si un stage falla, abre su consola. Un job en verde igual merece leerse completo.
- El reporte final y `quality-report.html` están en los artifacts unas horas. SonarQube está en `http://192.168.0.201:9000`.

La app de pruebas queda en `http://vitalsy.devops.local` cuando el proxy termina, aunque el Gate todavía no la pase a producción. Producción solo llega si los 8 criterios salen bien a la vez: tests en verde, cero secretos, cero vulnerabilidades CRITICAL, confiabilidad A, seguridad A, mantenibilidad A, cobertura de al menos 80 % y duplicación de como máximo 5 %.

## 5. Entrar a la app desplegada

Correo: `{rol}@vitalsy.local`, por ejemplo `admision@vitalsy.local`.

Contraseña en el laboratorio: `password_ejemplo`. Esa es la de `DEMO_PASSWORD` en `backend/api/.env.example`, que sí viaja en Git. `Vitalsy.2026` se queda en tu máquina.

`database/seeds.sql` carga salas y camas. Las cuentas de usuario las crea el seeder de Laravel cuando existe `DEMO_PASSWORD`. La imagen del laboratorio arranca con `php artisan serve` y no ejecuta ese seeder. Si el sitio abre y el login dice que el correo o la contraseña no son correctos, las tablas están, pero las cuentas demo no se sembraron en ese servidor.

## Si el Gate no aprueba

Corrige lo que diga el reporte y vuelve a hacer push a `main` del remoto `laboratorio`. Cada push lanza el pipeline de nuevo. La app puede seguir en Staging mientras tanto.

| Lo que ves | Qué revisar |
|---|---|
| Falla Detect | Indentación de `project.yml` y los 3 archivos de cada módulo. |
| Falla Database | `database/init.sql` y `database/seeds.sql`. |
| El healthcheck no responde | La app debe leer `PORT` y escuchar en `0.0.0.0`. |
| El frontend no llama a la API | Las peticiones van a `/api/...`. |
| Gitleaks | Hay una contraseña en algún commit, también en el historial. Borrarla en un commit nuevo no alcanza. |
| Cobertura | Menos del 80 %. Hay que cubrir la lógica que SonarQube marque. |
| Trivy CRITICAL | Imagen base o dependencia con fallo grave. |
