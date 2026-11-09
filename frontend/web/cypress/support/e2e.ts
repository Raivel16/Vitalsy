/// <reference types="cypress" />
import type { Hospitalized, RaisedAlert } from "./vitalsy/scenarios";
import type { RawResponse } from "./vitalsy/session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Inicia sesión por API con la cuenta demo `{rol}@vitalsy.local` y la reutiliza entre escenarios. */
      loginAs(role: string): Chainable<void>;
      /** Paciente hospitalizado de la corrida, preparado por API (módulo 1 completo) y compartido entre escenarios. */
      hospitalize(): Chainable<Hospitalized>;
      /** Registra constantes alteradas y devuelve la alerta generada (RF-39). */
      raiseAlert(encounterId: string, profile: "news2_medio" | "news2_alto"): Chainable<RaisedAlert>;
      /** Llamada directa a /api/v1 con la sesión de un rol (para verificar el estado en el servidor). */
      vitalsyApi(role: string, method: string, path: string, body?: unknown): Chainable<RawResponse>;
      /** Tarjeta de la bandeja que corresponde a una alerta concreta. */
      alertCard(alertId: number): Chainable<JQuery<HTMLElement>>;
    }
  }
}

const THROTTLE_WAIT_MS = 61_000;

function login(role: string, attempt = 0): void {
  cy.request("/sanctum/csrf-cookie");
  cy.env<{ DEMO_PASSWORD: string }>(["DEMO_PASSWORD"], { log: false }).then(({ DEMO_PASSWORD }) => {
    cy.getCookie("XSRF-TOKEN").then((cookie) => sendLogin(role, DEMO_PASSWORD, cookie?.value ?? "", attempt));
  });
}

function sendLogin(role: string, password: string, xsrf: string, attempt: number): void {
  const baseUrl = Cypress.config("baseUrl") ?? "";
  cy.request({
    method: "POST",
    url: "/api/v1/auth/login",
    failOnStatusCode: false,
    headers: {
      Accept: "application/json",
      Origin: baseUrl,
      Referer: `${baseUrl}/`,
      "X-XSRF-TOKEN": decodeURIComponent(xsrf),
    },
    body: { email: `${role}@vitalsy.local`, password },
    log: false,
  }).then((response) => {
    // El login está limitado a 10 intentos por minuto e IP.
    if (response.status === 429 && attempt < 2) {
      cy.wait(THROTTLE_WAIT_MS);
      login(role, attempt + 1);
      return;
    }
    expect(response.status, `inicio de sesión de ${role}`).to.eq(200);
  });
}

Cypress.Commands.add("loginAs", (role: string) => {
  cy.session(role, () => login(role), {
    cacheAcrossSpecs: true,
    validate() {
      cy.request("/api/v1/auth/me").its("status").should("eq", 200);
    },
  });
});

Cypress.Commands.add("hospitalize", () => cy.task<Hospitalized>("vitalsy:hospitalize", null, { timeout: 120_000 }));

Cypress.Commands.add("raiseAlert", (encounterId: string, profile: "news2_medio" | "news2_alto") =>
  cy.task<RaisedAlert>("vitalsy:raiseAlert", { encounterId, profile }, { timeout: 60_000 }),
);

Cypress.Commands.add("vitalsyApi", (role: string, method: string, path: string, body?: unknown) =>
  cy.task<RawResponse>("vitalsy:api", { role, method, path, body }, { timeout: 60_000 }),
);

Cypress.Commands.add("alertCard", (alertId: number) =>
  // La bandeja puede tardar con muchas alertas en el entorno de desarrollo.
  cy.get(`.alert-card a[href="/alertas/${alertId}"]`, { timeout: 30_000 }).closest(".alert-card"),
);
