# HTTPS local (cámara / escáner en el teléfono)

El escáner de brazalete usa la cámara del navegador. Chrome en el móvil solo la permite en **HTTPS** (o `localhost`), no en `http://IP:8080`.

## Arranque

Desde la raíz del monorepo:

```bash
bash docker/nginx/generate-dev-certs.sh
docker compose up -d --force-recreate nginx backend
```

Si tu IP LAN cambió:

```bash
LAN_IP=192.168.x.x bash docker/nginx/generate-dev-certs.sh
docker compose up -d --force-recreate nginx
```

## URLs

| Uso | URL |
|-----|-----|
| PC (habitual) | `http://localhost:8080` |
| Teléfono + cámara | `https://<IP-LAN>:8443` (ej. `https://192.168.1.34:8443`) |

Los certificados viven en `docker/nginx/certs/` (no se versionan).

## Aviso del certificado en el teléfono

Es un certificado de desarrollo. En Chrome Android:

1. Abrir `https://<IP>:8443`
2. **Avanzado** → **Continuar al sitio** (o equivalente)
3. Entrar, ir a verificar identidad y pulsar **Escanear brazalete** → **Permitir** cámara

Opcional: instalar `docker/nginx/certs/dev-ca.crt` como autoridad de confianza en el teléfono para evitar el aviso.
