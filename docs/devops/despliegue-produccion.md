# Despliegue de producción en AWS

Producción de demostración: sirve para mostrar que la app funciona. No es el laboratorio. El GitLab del laboratorio solo cuenta para la nota de SonarQube y su guía está en `subir-al-laboratorio.md`. Los dos reciben el mismo `main` de GitHub, así que lo que se fusiona a `main` tiene que construir aquí y además no puede bajar la nota.

Los secretos (`.env`, `certs/`), la IP, la cuenta de AWS y el script de despliegue **viven solo en el servidor o en los secretos de GitHub**. No se versionan.

## Estado (2026-11-20)

| Elemento | Valor |
|---|---|
| Servidor | EC2 t3.small (2 vCPU, 2 GB de RAM y 2 GB de swap), Ubuntu Server 26.04, disco gp3 de 25 GB, región us-east-2 |
| Dominio | `vitalsy.duckdns.org` (DuckDNS) con IP elástica |
| TLS | Let's Encrypt (`certbot --standalone`), copiado con `cp -L` a `/var/www/app/certs/` |
| Código | `/var/www/app`, clon de `main` con deploy key de solo lectura |
| Servicios | `docker compose -f docker-compose.prod.yml`: `proxy`, `frontend`, `backend`, `reverb`, `scheduler`, `postgres` |
| Comprobación | `GET https://vitalsy.duckdns.org/api/health` → `{"status":"ok","db":"ok"}` |
| Respaldo | Ninguno automático: la demo no conserva datos ante fallas (`docs/operacion/recuperacion-ante-desastres.md`) |

## Despliegue automático

1. Se hace push o se fusiona un PR a `main`.
2. Corre el CI (`ci.yml`): `validate` (pruebas, build, Pint y SonarCloud) y `e2e`.
3. Si todo termina en verde, `deploy.yml` entra por SSH con la llave de despliegue y pasa el SHA validado.
4. En el servidor, `authorized_keys` obliga a que esa llave solo ejecute `/home/ubuntu/deploy-vitalsy.sh`. El script hace lo siguiente:
   1. Valida que el SHA pertenezca a `main`.
   2. Construye, levanta y migra.
   3. Comprueba la salud del sitio.
   4. Si algo falla, vuelve al commit anterior.

Si los secretos no están configurados, el job termina en verde sin desplegar.

### Secretos del repositorio en GitHub (Settings → Secrets → Actions)

| Secreto | Contenido |
|---|---|
| `DEPLOY_HOST` | IP elástica o dominio del servidor |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | Llave privada ed25519 creada solo para el despliegue (no es la `.pem` de AWS) |
| `DEPLOY_KNOWN_HOSTS` | Salida de `ssh-keyscan -t ed25519 <host>`, para no aceptar huellas desconocidas |

### Configuración única en el servidor

1. Agregar la llave pública a `~/.ssh/authorized_keys` del usuario `ubuntu`, con estas restricciones:
   ```text
   restrict,command="/home/ubuntu/deploy-vitalsy.sh" ssh-ed25519 AAAA... github-deploy
   ```
2. Crear `/home/ubuntu/deploy-vitalsy.sh` con permisos `chmod 700` y este contenido:
   ```bash
   #!/usr/bin/env bash
   # Despliegue de Vitalsy. Lo invoca GitHub Actions; vive fuera del repositorio.
   set -euo pipefail
   APP=/var/www/app
   SHA="${SSH_ORIGINAL_COMMAND:-${1:-}}"
   [[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "SHA invalido" >&2; exit 2; }

   exec 9>/tmp/deploy-vitalsy.lock
   flock -n 9 || { echo "Ya hay un despliegue en curso" >&2; exit 3; }

   cd "$APP"
   C=(docker compose -f docker-compose.prod.yml)
   DOMAIN=$(grep -E '^PUBLIC_DOMAIN=' .env | cut -d= -f2)
   PREV=$(git rev-parse HEAD)

   git fetch --quiet origin main
   git merge-base --is-ancestor "$SHA" origin/main || { echo "El commit no esta en main" >&2; exit 4; }

   desplegar() {
     git reset --quiet --hard "$1"
     "${C[@]}" build
     "${C[@]}" up -d --remove-orphans
     "${C[@]}" exec -T backend php artisan migrate --force
   }

   sano() {
     for _ in $(seq 1 36); do
       if curl -fsS "https://$DOMAIN/api/health" | grep -q '"db":"ok"' \
          && curl -fsS -o /dev/null "https://$DOMAIN/"; then
         return 0
       fi
       sleep 5
     done
     return 1
   }

   if desplegar "$SHA" && sano; then
     docker image prune -f >/dev/null
     echo "Desplegado $SHA"
   else
     echo "Fallo el despliegue de $SHA; vuelvo a $PREV" >&2
     desplegar "$PREV" || true
     exit 1
   fi
   ```
3. Probarlo a mano: `~/deploy-vitalsy.sh $(git -C /var/www/app rev-parse origin/main)`.

## Datos demo

Se cargan una sola vez. Los datos se conservan entre despliegues porque el volumen `postgres_data` persiste; perderlos no es un problema.

1. Agregar `DEMO_PASSWORD=<contraseña>` al `.env` del servidor.
2. Ejecutar `docker compose -f docker-compose.prod.yml up -d backend` para que tome la variable.
3. Ejecutar `docker compose -f docker-compose.prod.yml exec -T backend php artisan db:seed --force`.

Con eso existen las cuentas `{rol}@vitalsy.local` de los 15 roles, el catálogo de salas y camas, y los pacientes e ingresos de demostración.

Para empezar de cero, ejecutar `migrate:fresh --seed --force`. Borra toda la base.

## Instalación desde cero (resumen)

1. Instalar Docker: `sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 docker-buildx certbot git`. Agregar `ubuntu` al grupo `docker` y crear un swap de 2 GB, porque el build no cabe en 2 GB de RAM.
2. Crear una deploy key de solo lectura en GitHub y ejecutar `git clone git@github.com:<usuario>/Vitalsy.git /var/www/app`.
3. Pedir el certificado con `certbot certonly --standalone -d <dominio>` y copiarlo con `cp -L` a `certs/` (`fullchain.pem` y `privkey.pem`).
4. Crear `.env` con permisos `600`. Debe tener las variables que exige `docker-compose.prod.yml`: `PUBLIC_DOMAIN`, `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, `APP_KEY`, `POSTGRES_*`, `DB_*`, `REVERB_*`, `VITE_REVERB_*`, `TLS_CERTS_DIR` y `DEMO_PASSWORD`. Los valores se generan con `openssl rand`. **Respaldar el `.env` fuera del servidor:** sin el mismo `APP_KEY`, los datos cifrados no se pueden recuperar.
5. Levantar y migrar: `docker compose -f docker-compose.prod.yml up -d --build`, luego `exec -T backend php artisan migrate --force`, y después cargar los datos demo.

## Operación

```bash
cd /var/www/app; C="docker compose -f docker-compose.prod.yml"
$C ps                               # estado
$C logs -f --tail 100 backend       # registros
$C down                             # apagar (o detener la instancia en EC2)
```

- **Certificado:** dura 90 días. Para renovarlo, `certbot renew` con `--pre-hook "$C stop proxy"` y `--post-hook "$C start proxy"`, y volver a copiar los `.pem` a `certs/`.
- **Puerto 22:** tiene que seguir abierto mientras despliegue GitHub Actions, porque las IP de sus runners cambian. El acceso es solo con llave.
- **Cierre:** al terminar la demo, terminar la instancia, liberar la IP elástica (una IP sin usar sigue cobrando) y borrar el subdominio y la deploy key.
