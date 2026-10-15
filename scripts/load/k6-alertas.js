// RNF-04: 200 usuarios virtuales sobre bandeja de alertas y registro de signos vitales.
// Uso: k6 run -e BASE_URL=https://host -e LOAD_EMAIL=enfermera_piso@vitalsy.local \
//        -e LOAD_PASSWORD=*** -e ENCOUNTER_ID=<id de un ingreso de prueba> scripts/load/k6-alertas.js
// Escribe signos vitales: ejecutar solo contra un entorno de pruebas (nunca produccion).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, login, requireEnv, rampStages, jsonHeaders } from './lib.js';

export const options = {
  stages: rampStages(),
  thresholds: {
    'http_req_duration{name:alert_inbox}': ['p(95)<2000'],
    'http_req_duration{name:vital_signs}': ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  requireEnv('LOAD_EMAIL', 'LOAD_PASSWORD', 'ENCOUNTER_ID');
}

let logged = false;

export default function () {
  if (!logged) {
    login(__ENV.LOAD_EMAIL, __ENV.LOAD_PASSWORD);
    logged = true;
  }
  const inbox = http.get(`${API}/clinical-alerts/inbox`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'alert_inbox' },
  });
  check(inbox, { 'bandeja 200': (r) => r.status === 200 });

  const body = JSON.stringify({
    respiratoryRate: 16,
    oxygenSaturation: 97,
    systolicBloodPressure: 120,
    diastolicBloodPressure: 80,
    pulse: 75,
    temperature: 36.7,
    consciousness: 'alert',
  });
  const vitals = http.post(
    `${API}/clinical-alerts/encounters/${__ENV.ENCOUNTER_ID}/vital-signs`,
    body,
    { ...jsonHeaders, tags: { name: 'vital_signs' } },
  );
  check(vitals, { 'signos 2xx': (r) => r.status >= 200 && r.status < 300 });
  sleep(1 + Math.random() * 2);
}
