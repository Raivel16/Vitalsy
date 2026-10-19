// RNF-03: censo/listas <= 2 s (p95) bajo carga; RNF-04: 200 usuarios concurrentes.
// Uso: k6 run -e BASE_URL=https://host -e LOAD_EMAIL=enfermera_piso@vitalsy.local \
//        -e LOAD_PASSWORD=*** scripts/load/k6-census.js
// Linea base de RNF-04: repetir con -e TARGET_VUS=10 y comparar p95 (ver docs/operacion/pruebas-de-carga.md).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, login, requireEnv, rampStages } from './lib.js';

export const options = {
  stages: rampStages(),
  thresholds: {
    'http_req_duration{name:census}': ['p(95)<2000'],
    'http_req_duration{name:encounter_list}': ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  requireEnv('LOAD_EMAIL', 'LOAD_PASSWORD');
}

export default function () {
  if (!__VU_LOGGED) {
    login(__ENV.LOAD_EMAIL, __ENV.LOAD_PASSWORD);
    __VU_LOGGED = true;
  }
  const list = http.get(`${API}/hospital-admission/encounters`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'encounter_list' },
  });
  check(list, { 'lista 200': (r) => r.status === 200 });

  // Censo de camas: requiere una cuenta con rol gestion_camas/enfermera_supervisora (CENSUS_EMAIL).
  if (__ENV.CENSUS_EMAIL) {
    const census = http.get(`${API}/beds/census`, {
      headers: { Accept: 'application/json' },
      tags: { name: 'census' },
    });
    check(census, { 'censo 200': (r) => r.status === 200 });
  }
  sleep(1 + Math.random() * 2);
}

let __VU_LOGGED = false;
