#!/bin/sh
# RNF-05: verifica que un host sirve solo HTTPS con TLS 1.3 y HSTS.
# Uso: scripts/check-tls.sh <host> [puerto-https]
# Requiere curl y openssl. Sale con codigo != 0 si algun chequeo falla.
set -u

HOST="${1:-}"
PORT="${2:-443}"
if [ -z "$HOST" ]; then
  echo "Uso: $0 <host> [puerto-https]" >&2
  exit 2
fi

FAIL=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAIL=1; }

# 1. HTTP plano debe redirigir (301) a https.
HTTP_HEAD=$(curl -sI --max-time 10 "http://$HOST/" 2>/dev/null || true)
HTTP_CODE=$(printf '%s\n' "$HTTP_HEAD" | sed -n '1s/^HTTP\/[0-9.]* \([0-9]*\).*/\1/p')
HTTP_LOC=$(printf '%s\n' "$HTTP_HEAD" | tr -d '\r' | sed -n 's/^[Ll]ocation: *//p' | head -n 1)
case "$HTTP_CODE:$HTTP_LOC" in
  301:https://*) pass "HTTP 80 responde 301 hacia $HTTP_LOC" ;;
  *) fail "HTTP 80 debe responder 301 a https:// (codigo='$HTTP_CODE', location='$HTTP_LOC')" ;;
esac

# 2. TLS 1.3 debe negociar (PASS solo con handshake completado en TLSv1.3).
OUT13=$(echo | openssl s_client -tls1_3 -connect "$HOST:$PORT" -servername "$HOST" 2>&1 || true)
if printf '%s
' "$OUT13" | grep -q 'Protocol *: *TLSv1.3'; then
  pass "TLS 1.3 aceptado"
else
  fail "TLS 1.3 no se pudo negociar (host inalcanzable o sin soporte)"
fi

# 3. TLS 1.2 debe ser rechazado: PASS solo si hay alerta/fallo de handshake explicito.
#    Un host inalcanzable NO cuenta como rechazo.
OUT12=$(echo | openssl s_client -tls1_2 -connect "$HOST:$PORT" -servername "$HOST" 2>&1 || true)
if printf '%s
' "$OUT12" | grep -q 'Protocol *: *TLSv1.2'; then
  fail "TLS 1.2 fue aceptado (debe rechazarse)"
elif printf '%s
' "$OUT12" | grep -qiE 'alert protocol version|no protocols available|handshake failure|tlsv1 alert|wrong version number|unsupported protocol'; then
  pass "TLS 1.2 rechazado"
else
  fail "No se pudo confirmar el rechazo de TLS 1.2 (host inalcanzable o salida inesperada)"
fi

# 4. HSTS presente en la respuesta HTTPS.
HTTPS_HEAD=$(curl -sI --max-time 10 "https://$HOST:$PORT/" 2>/dev/null || true)
if printf '%s\n' "$HTTPS_HEAD" | grep -qi '^strict-transport-security:.*max-age='; then
  pass "Cabecera Strict-Transport-Security presente"
else
  fail "Falta Strict-Transport-Security"
fi

echo "----"
if [ "$FAIL" -eq 0 ]; then
  echo "RESULTADO: PASS (todos los chequeos RNF-05 superados)"
else
  echo "RESULTADO: FAIL (revise los chequeos anteriores)"
fi
exit "$FAIL"
