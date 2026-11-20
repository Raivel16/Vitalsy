# HTTPS en produccion: solo TLS 1.3 (RNF-05)

RNF-05: el 100% de las comunicaciones cliente web <-> servidor usan HTTPS/TLS 1.3, sin HTTP sin cifrar.
El desarrollo en LAN esta en `https-dev-lan.md` (admite TLS 1.2+1.3 por compatibilidad); esto aplica a `docker-compose.prod.yml`.

## Arquitectura

- Servicio `proxy` (nginx, `docker/nginx/prod.conf`): unico que publica puertos (80 y 443).
- 80: solo `301` a `https://` (y el reto ACME `/.well-known/acme-challenge/`).
- 443: `ssl_protocols TLSv1.3;`, `ssl_session_tickets off`, HSTS `max-age=31536000; includeSubDomains`, `nosniff`, `X-Frame-Options DENY`, `frame-ancestors 'none'`, `Referrer-Policy`.
- Rutas: `/` frontend, `/api/` y `/sanctum/` backend, `/app/` Reverb (WebSocket, `wss://<dominio>/app`).
- `frontend`, `backend` y `reverb` ya no publican puertos al host.

## Cabeceras reenviadas y Host

- `server_name ${PUBLIC_DOMAIN}` (plantilla `/etc/nginx/templates`, solo esa variable se sustituye): el 301 apunta siempre al dominio configurado; cualquier otro Host recibe `444` (default_server).
- `docker/nginx/proxy-headers.conf` se incluye en cada `location` (nginx no hereda `proxy_set_header` si la location define el suyo) y fija `Host`, `X-Forwarded-For`, `X-Forwarded-Proto https`, `X-Forwarded-Host $host`, `X-Forwarded-Port 443`.
- Decision: Laravel confia solo en `X-Forwarded-For` y `-Proto` (`TrustedProxies::HEADERS`); `X-Forwarded-Host/Port` se IGNORAN. Asi un cliente no puede envenenar URLs generadas ni enlaces de reinicio aunque llegue por un proxy de confianza. Cubierto por `TransportSecurityTest`.

## Laravel

- `URL::forceScheme('https')` en `AppServiceProvider` cuando `APP_ENV=production`.
- `TRUSTED_PROXIES` (por defecto rangos privados; `*` solo por decision explicita): `X-Forwarded-Proto` solo se acepta de esos proxies (`App\Support\TrustedProxies`). En compose prod el defecto es `172.16.0.0/12` (red de Docker).
- Cookie de sesion `secure` por defecto en produccion (`SESSION_SECURE_COOKIE`, el compose la fija en `true`); `SameSite=lax` y `HttpOnly` se mantienen.
- `SANCTUM_STATEFUL_DOMAINS` en produccion: solo el dominio https publico.
- Reverb: `REVERB_ALLOWED_ORIGINS` con el origen `https://`; el cliente usa `VITE_REVERB_SCHEME=https` (wss) y el puerto 443 del proxy.

## Despliegue

1. Obtener certificado y colocar `fullchain.pem` y `privkey.pem` en `./certs` (o apuntar `TLS_CERTS_DIR` a otro directorio del host). No se versionan (`/certs/` esta en `.gitignore`).
   - Let's Encrypt: certbot (`--webroot`; el proxy sirve `/var/www/acme` si se monta ese volumen) o `--standalone` antes de levantar el proxy; renovar con un cron y `docker compose exec proxy nginx -s reload`.
   - CA institucional: emitir con el CN/SAN del dominio y entregar la cadena completa.
2. Definir en `.env` (el compose los pasa explicitamente): `PUBLIC_DOMAIN` (sin esquema), `APP_URL=https://<dominio>`, `SANCTUM_STATEFUL_DOMAINS=<dominio>` (obligatorios), `APP_KEY`, `DB_PASSWORD`, `REVERB_*`, `REVERB_ALLOWED_ORIGINS=https://<dominio>`, opcional `SESSION_DOMAIN`, `TRUSTED_PROXIES`, `TLS_CERTS_DIR`. `SESSION_SECURE_COOKIE=true` va fijado en el compose.
3. `docker compose -f docker-compose.prod.yml up -d --build`.
4. Verificar (detalle del servidor real en `docs/devops/despliegue-produccion.md`):
   - `curl -sI http://<dominio>/` → `301` a `https://`
   - `curl -sI https://<dominio>/ | grep -i strict-transport-security` → HSTS presente
   - `openssl s_client -connect <dominio>:443 -tls1_3 </dev/null` acepta; con `-tls1_2` el handshake falla.

## Riesgos residuales

- `prod.conf` ya corre en el servidor de AWS (2026-11-20): `http` responde 301 a `https` y `/api/health` responde `ok`. Falta registrar la prueba de rechazo de TLS 1.2 con `openssl`.
- El trafico entre contenedores (proxy -> frontend/backend/reverb, backend -> postgres) es texto plano dentro de la red interna de Docker; mitigado por no publicar puertos, no cifrado.
- TLS 1.3 solamente excluye clientes antiguos (p. ej. Android < 10, iOS < 12.2); es el requisito literal del RNF-05.
- HSTS con `includeSubDomains`: obliga a HTTPS en todos los subdominios del dominio; verifique que ninguno depende de HTTP antes de desplegar.
- `TRUSTED_PROXIES` por defecto cubre solo rangos privados: si la red de Compose o el balanceador queda fuera (p. ej. IP publica), la deteccion de esquema falla en silencio; defina `TRUSTED_PROXIES`.
- HSTS sin `preload`: incluirlo en la lista de precarga es una decision deliberada y dificil de revertir.
- La app movil rechaza URLs `http://` fuera de `__DEV__`; en desarrollo se permite http.
- Detras de un balanceador/CDN externo, ajuste `TRUSTED_PROXIES` a sus rangos.
