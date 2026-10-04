#!/usr/bin/env bash
# Genera CA + certificado TLS de desarrollo para nginx (HTTPS LAN / cámara).
# Uso:
#   bash docker/nginx/generate-dev-certs.sh
#   LAN_IP=192.168.1.34 bash docker/nginx/generate-dev-certs.sh
set -euo pipefail

export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

ROOT="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="${ROOT}/certs"
mkdir -p "${CERT_DIR}"
cd "${CERT_DIR}"

IPS_FILE="ips.tmp"
CA_CFG="ca.cnf"
SERVER_CFG="server.cnf"
trap 'rm -f "${IPS_FILE}" "${CA_CFG}" "${SERVER_CFG}"' EXIT

{
  echo "127.0.0.1"
  if [[ -n "${LAN_IP:-}" ]]; then
    echo "${LAN_IP}"
  fi
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command \
      "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.IPAddress -notlike '127.*' -and \$_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress" \
      2>/dev/null | tr -d '\r' || true
  fi
  echo "192.168.1.34"
} | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | sort -u > "${IPS_FILE}"

cat > "${CA_CFG}" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[dn]
O = Vitalsy
CN = Vitalsy Dev CA

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
EOF

cat > "${SERVER_CFG}" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
O = Vitalsy
CN = Vitalsy Dev

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = ::1
EOF

idx=2
while IFS= read -r ip; do
  echo "IP.${idx} = ${ip}" >> "${SERVER_CFG}"
  idx=$((idx + 1))
done < "${IPS_FILE}"

echo "Generando CA de desarrollo..."
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout dev-ca.key \
  -out dev-ca.crt \
  -days 825 \
  -config "${CA_CFG}"

echo "Generando certificado de servidor..."
openssl req -newkey rsa:2048 -nodes \
  -keyout dev.key \
  -out dev.csr \
  -config "${SERVER_CFG}"

openssl x509 -req \
  -in dev.csr \
  -CA dev-ca.crt \
  -CAkey dev-ca.key \
  -CAcreateserial \
  -out dev.crt \
  -days 825 \
  -extensions v3_req \
  -extfile "${SERVER_CFG}"

rm -f dev.csr dev-ca.srl dev-ca.key

echo
echo "Listo en ${CERT_DIR}"
echo "  - dev.crt / dev.key  (nginx)"
echo "  - dev-ca.crt         (opcional: instalar en el teléfono)"
echo -n "IPs en el certificado: "
tr '\n' ' ' < "${IPS_FILE}"
echo
echo
echo "Siguiente:"
echo "  docker compose up -d --force-recreate nginx backend"
echo "Teléfono (escáner): https://192.168.1.34:8443"
echo "  (si Chrome avisa del certificado: Avanzado → continuar)"
