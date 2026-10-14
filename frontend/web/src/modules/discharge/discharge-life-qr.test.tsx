import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QRCode from "qrcode";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import type { DischargeCase } from "./domain/discharge";
import { lifeSheetHtml } from "./domain/lifeSheet";

const printSpy = vi.fn();
vi.mock("../../shared/print/printDocument", () => ({
  printClinicalDocument: (...args: unknown[]) => printSpy(...args),
}));

const reconciledCase: DischargeCase = {
  encounterId: "ENC-ALTA-0001",
  patientName: "Paciente de Alta Demo",
  location: "Habitación 401, lecho A",
  nextAction: "nursing",
  deliverables: [{ id: "order", label: "Orden de alta", done: true }],
  order: { status: "registrada", orderedAt: "2026-09-26T10:00:00+00:00" },
  epicrisis: { diagnoses: "Neumonía", procedures: null, evolution: null },
  prescriptions: { items: [], issuedAt: null },
  socialAssessment: null,
  reconciliation: { notes: "ok", status: "conciliada" },
  nursingReport: null,
  indicationReceipt: null,
  account: null,
  exitPass: null,
  exit: null,
  lifePlan: null,
};

const reportedCase: DischargeCase = {
  ...reconciledCase,
  nursingReport: { instructions: "Amoxicilina 8h", alarmSigns: "Fiebre", homeCare: "Reposo" },
};

const invitationPlan = {
  mode: "invitacion",
  code: "VLA-AAA111",
  invitationCode: "VLI-BBB222",
  status: "emitido",
  payload: { id: "plan-1", medications: [], comfortSigns: [], homeCare: [], validUntil: "2026-10-30" },
};

function stub(options: {
  initial?: DischargeCase;
  lifeResponse?: () => unknown;
  receiptLifePlanNull?: boolean;
}) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (url.endsWith("/life-plan") && method === "POST") {
        return (options.lifeResponse ?? (() => jsonResponse(201, { lifePlan: invitationPlan })))();
      }
      if (url.endsWith("/indication-receipt") && method === "POST") {
        return jsonResponse(201, {
          case: {
            ...reportedCase,
            indicationReceipt: { receivedByName: "Ana", receivedAt: null },
            lifePlan: options.receiptLifePlanNull ? null : { mode: "invitacion", status: "emitido", validUntil: "2026-10-30" },
          },
        });
      }
      if (url.endsWith("/nursing-report") && method === "POST") {
        return jsonResponse(201, { case: reportedCase });
      }
      if (url.includes("/discharge/encounters/ENC-ALTA-0001") && method === "GET") {
        return jsonResponse(200, { case: options.initial ?? reconciledCase });
      }
      return jsonResponse(200, {});
    }),
  );
  return calls;
}

async function fillReport(user: ReturnType<typeof userEvent.setup>, optionLabel: RegExp) {
  await user.type(await screen.findByLabelText(/indicaciones de medicamentos/i), "Amoxicilina 8h");
  await user.type(screen.getByLabelText(/signos de alarma/i), "Fiebre");
  await user.click(screen.getByRole("radio", { name: optionLabel }));
  await user.click(screen.getByRole("button", { name: /generar informe/i }));
}

describe("QR de Vitalsy Life emitido por el servidor (RF-61, RF-96)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    printSpy.mockReset();
    sessionStorage.clear();
  });

  it("al elegir invitación guarda el informe, emite el plan y el QR codifica el código de invitación", async () => {
    const calls = stub({});
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    await fillReport(user, /generar invitación/i);

    expect(await screen.findByRole("img", { name: "Código QR VLI-BBB222" })).toBeInTheDocument();
    expect(screen.getByText(/Código: VLI-BBB222/)).toBeInTheDocument();
    const report = calls.find((call) => call.url.endsWith("/nursing-report"));
    expect(JSON.stringify(report?.body)).not.toMatch(/Vitalsy Life/);
    const life = calls.find((call) => call.url.endsWith("/life-plan"));
    expect(life?.method).toBe("POST");
    expect(life?.body).toEqual({ mode: "invitacion" });
    expect(screen.queryByRole("img", { name: /ENC-ALTA-0001/ })).not.toBeInTheDocument();
  });

  it("conserva el QR cuando una mutación posterior devuelve el plan sin códigos", async () => {
    stub({});
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    await fillReport(user, /generar invitación/i);
    expect(await screen.findByRole("img", { name: "Código QR VLI-BBB222" })).toBeInTheDocument();
    await user.type(await screen.findByLabelText(/nombre de quien recibe/i), "Ana");
    await user.click(screen.getByRole("button", { name: /confirmar recepción/i }));

    expect(await screen.findByText(/recepción de indicaciones confirmada/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Código QR VLI-BBB222" })).toBeInTheDocument();
  });

  it("en modo usuario el QR codifica el código de activación", async () => {
    stub({
      lifeResponse: () => jsonResponse(201, { lifePlan: { ...invitationPlan, mode: "usuario", invitationCode: null } }),
    });
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    await fillReport(user, /ya es usuario/i);

    expect(await screen.findByRole("img", { name: "Código QR VLA-AAA111" })).toBeInTheDocument();
  });

  it("al rechazar no muestra QR", async () => {
    const calls = stub({ lifeResponse: () => jsonResponse(200, { lifePlan: { mode: "rechaza" } }) });
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    await fillReport(user, /rechaza el seguimiento/i);

    expect(await screen.findByText(/rechaza el seguimiento digital/i, { selector: "p" })).toBeInTheDocument();
    expect(calls.some((call) => call.url.endsWith("/life-plan"))).toBe(true);
    expect(screen.queryByRole("img", { name: /Código QR/ })).not.toBeInTheDocument();
  });

  it("si falla la emisión muestra el error y permite reintentar sin perder el informe", async () => {
    let attempts = 0;
    const calls = stub({
      lifeResponse: () => {
        attempts += 1;
        return attempts === 1
          ? jsonResponse(500, { message: "Server Error" })
          : jsonResponse(201, { lifePlan: invitationPlan });
      },
    });
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    await fillReport(user, /generar invitación/i);

    expect(await screen.findByText(/no se pudo generar el código de vitalsy life/i)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /reintentar/i }));

    expect(await screen.findByRole("img", { name: "Código QR VLI-BBB222" })).toBeInTheDocument();
    expect(calls.filter((call) => call.url.endsWith("/nursing-report"))).toHaveLength(1);
    expect(calls.filter((call) => call.url.endsWith("/life-plan"))).toHaveLength(2);
  });

  it("otro rol ve solo el modo, sin QR ni código", async () => {
    stub({
      initial: { ...reportedCase, lifePlan: { mode: "invitacion", status: "emitido", validUntil: "2026-10-30" } },
    });
    renderApp("/egreso/ENC-ALTA-0001", { role: "altas_caja" });

    expect(await screen.findByText(/invitación generada/i)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Código QR/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Código: /)).not.toBeInTheDocument();
  });

  it.each(["altas_caja", "medico_tratante"] as const)("el rol %s no ve QR, código ni botón de impresión aunque la respuesta traiga códigos", async (role) => {
    stub({ initial: { ...reportedCase, lifePlan: invitationPlan as DischargeCase["lifePlan"] } });
    renderApp("/egreso/ENC-ALTA-0001", { role });

    expect(await screen.findByText(/invitación generada/i)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Código QR/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Código: /)).not.toBeInTheDocument();
    expect(screen.queryByText(/VLI-BBB222/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /imprimir ficha/i })).not.toBeInTheDocument();
  });

  it("al recargar, la enfermera ve el QR y el código sin nuevo POST; sin cambio de modo", async () => {
    const calls = stub({ initial: { ...reportedCase, lifePlan: invitationPlan as DischargeCase["lifePlan"] } });
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    expect(await screen.findByRole("img", { name: "Código QR VLI-BBB222" })).toBeInTheDocument();
    expect(screen.getByText(/Código: VLI-BBB222/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /imprimir ficha de alta/i })).toBeInTheDocument();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar seguimiento en vitalsy life/i })).not.toBeInTheDocument();
  });

  it("mantiene el plan emitido si una mutación devuelve lifePlan nulo", async () => {
    stub({ receiptLifePlanNull: true });
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    await fillReport(user, /generar invitación/i);
    expect(await screen.findByRole("img", { name: "Código QR VLI-BBB222" })).toBeInTheDocument();
    await user.type(await screen.findByLabelText(/nombre de quien recibe/i), "Ana");
    await user.click(screen.getByRole("button", { name: /confirmar recepción/i }));

    expect(await screen.findByText(/recepción de indicaciones confirmada/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Código QR VLI-BBB222" })).toBeInTheDocument();
  });

  it("oculta imprimir si no se emitió el plan (falló el POST)", async () => {
    stub({ lifeResponse: () => jsonResponse(500, { message: "Server Error" }) });
    const user = userEvent.setup();
    renderApp("/egreso/ENC-ALTA-0001", { role: "enfermera_piso" });

    await fillReport(user, /generar invitación/i);

    expect(await screen.findByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /imprimir ficha/i })).not.toBeInTheDocument();
  });

  it("sin plan definido y con informe indica que falta el seguimiento", async () => {
    stub({ initial: reportedCase });
    renderApp("/egreso/ENC-ALTA-0001", { role: "altas_caja" });

    await waitFor(() => expect(screen.getByText(/sin seguimiento definido/i)).toBeInTheDocument());
  });
});

describe("ficha de alta imprimible", () => {
  it("incluye el QR en SVG, la leyenda, la vigencia y el código en texto", async () => {
    const html = await lifeSheetHtml({
      ...reportedCase,
      lifePlan: invitationPlan as DischargeCase["lifePlan"],
    }, "enfermera_piso");

    expect(html).toContain("<svg");
    expect(html).toContain("Escanee con la app Vitalsy Life para activar su seguimiento");
    expect(html).toContain("2026-10-30");
    expect(html).toContain("Código: VLI-BBB222");
  });

  it("codifica en el SVG el código del plan y nunca el encounterId", async () => {
    const spy = vi.spyOn(QRCode, "toString");
    await lifeSheetHtml({ ...reportedCase, lifePlan: invitationPlan as DischargeCase["lifePlan"] }, "enfermera_piso");

    expect(spy).toHaveBeenCalledWith("VLI-BBB222", expect.anything());
    expect(spy.mock.calls.some((call) => call[0] === "ENC-ALTA-0001")).toBe(false);
    spy.mockRestore();
  });

  it("no emite QR ni código para roles distintos de enfermería de piso", async () => {
    const html = await lifeSheetHtml({ ...reportedCase, lifePlan: invitationPlan as DischargeCase["lifePlan"] }, "altas_caja");

    expect(html).not.toContain("<svg");
    expect(html).not.toContain("VLI-BBB222");
  });

  it("no incluye QR cuando rechaza o no hay plan", async () => {
    const rejected = await lifeSheetHtml({ ...reportedCase, lifePlan: { mode: "rechaza" } }, "enfermera_piso");
    const none = await lifeSheetHtml(reportedCase, "enfermera_piso");

    for (const html of [rejected, none]) {
      expect(html).not.toContain("<svg");
      expect(html).not.toContain("Código:");
    }
  });
});
