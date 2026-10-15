// Utilidades compartidas por los escenarios k6 (RNF-03 / RNF-04).
// Sin secretos: BASE_URL y credenciales llegan por variables de entorno (-e).
import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || '').replace(/\/$/, '');
export const API = `${BASE_URL}/api/v1`;

export function requireEnv(...names) {
  const missing = names.filter((n) => !__ENV[n]);
  if (!BASE_URL) missing.unshift('BASE_URL');
  if (missing.length) fail(`faltan variables de entorno: ${missing.join(', ')}`);
}

// Sesion por cookie (Sanctum SPA): el cookie jar de k6 es por VU.
export function login(email, password) {
  const res = http.post(`${API}/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { name: 'login' },
  });
  check(res, { 'login 200': (r) => r.status === 200 });
  return res;
}

export const jsonHeaders = { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } };

// Rampa a TARGET_VUS (200 por defecto, RNF-04). Para la linea base use TARGET_VUS=10.
export function rampStages() {
  const target = Number(__ENV.TARGET_VUS || 200);
  return [
    { duration: '1m', target },
    { duration: __ENV.HOLD || '5m', target },
    { duration: '30s', target: 0 },
  ];
}
