import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import type { CleaningOrder } from "./types";

type Call = { url: string; method: string; body?: Record<string, unknown> };

function order(partial: Partial<CleaningOrder>): CleaningOrder {
  return {
    id: 1,
    bedId: 11,
    room: "312",
    bedCode: "B",
    ward: "Medicina Interna",
    isolation: false,
    protocol: "standard",
    status: "pendiente",
    checklist: {},
    dispatchedAt: new Date(Date.now() - 22 * 60000).toISOString(),
    ...partial,
  };
}

function stubApi(orders: CleaningOrder[], options: { failWith?: { status: number; message: string }; gate?: Promise<void> } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (url.includes("/beds/cleaning-orders") && method === "GET") return jsonResponse(200, { orders });
      if (method === "POST") {
        if (options.gate) await options.gate;
        if (options.failWith) return jsonResponse(options.failWith.status, { message: options.failWith.message });
        return jsonResponse(200, { order: orders[0] });
      }
      return jsonResponse(200, {});
    }),
  );
  return calls;
}

describe("habilitación de unidades (RF-74 a RF-77)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("explica el siguiente paso al rol y muestra el circuito", async () => {
    stubApi([order({ id: 1 }), order({ id: 2, bedId: 12, bedCode: "C" })]);
    renderApp("/camas/limpieza", { role: "servicios_generales" });

    const guide = await screen.findByRole("region", { name: /guía del proceso/i });
    expect(within(guide).getByText(/tiene 2 desinfecciones pendientes/i)).toBeInTheDocument();
    expect(within(guide).getByText(/tu siguiente paso/i)).toBeInTheDocument();
    expect(within(guide).getByText(/desinfección/i, { selector: "li *" })).toBeInTheDocument();
  });

  it("servicios generales no puede registrar la desinfección sin completar el checklist", async () => {
    const calls = stubApi([order({})]);
    const user = userEvent.setup();
    renderApp("/camas/limpieza", { role: "servicios_generales" });

    const submit = await screen.findByRole("button", { name: /registrar desinfección terminada/i });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/0 \/ 4 completados/i)).toBeInTheDocument();

    for (const label of [/superficies duras/i, /porta-suero/i, /colchón sanitario/i]) {
      await user.click(screen.getByRole("checkbox", { name: label }));
    }
    expect(submit).toBeDisabled();
    expect(screen.getByText(/3 \/ 4 completados/i)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /ventilación/i }));
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByText(/desinfección registrada en habitación 312 · cama b/i)).toBeInTheDocument();
    const post = calls.find((call) => call.method === "POST");
    expect(post?.url).toContain("/cleaning-orders/1/complete");
    expect(post?.body).toEqual({
      checklist: { superficies: true, portasuero: true, colchon: true, ventilacion: true },
    });
  });

  it("evita el doble envío mientras la acción está en curso", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const calls = stubApi([order({ status: "completada", checklist: { superficies: true, portasuero: true, colchon: true, ventilacion: true } })], { gate });
    const user = userEvent.setup();
    renderApp("/camas/limpieza", { role: "auxiliar_enfermeria" });

    const button = await screen.findByRole("button", { name: /marcar unidad equipada/i });
    await user.click(button);
    await user.click(button);
    release();

    await screen.findByText(/unidad equipada/i, { selector: "[role=status]" });
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("la auxiliar solo ve la acción de equipar sobre órdenes desinfectadas", async () => {
    stubApi([
      order({ id: 1, status: "pendiente" }),
      order({ id: 2, bedId: 12, bedCode: "C", status: "completada" }),
    ]);
    renderApp("/camas/limpieza", { role: "auxiliar_enfermeria" });

    await screen.findByRole("heading", { name: /habitación 312 · cama c/i });
    expect(screen.getAllByRole("button", { name: /marcar unidad equipada/i })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /registrar desinfección terminada/i })).not.toBeInTheDocument();
    expect(screen.getByText(/esperando a: servicios generales/i)).toBeInTheDocument();
  });

  it("la supervisora habilita solo unidades equipadas y ve quién falta en las demás", async () => {
    const calls = stubApi([
      order({ id: 1, status: "completada" }),
      order({ id: 2, bedId: 12, bedCode: "C", status: "equipada" }),
    ]);
    const user = userEvent.setup();
    renderApp("/camas/limpieza", { role: "enfermera_supervisora" });

    expect(await screen.findAllByRole("button", { name: /habilitar cama en censo hospitalario/i })).toHaveLength(1);
    expect(screen.getByText(/esperando a: auxiliar de enfermería/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /habilitar cama en censo hospitalario/i }));
    await waitFor(() => expect(calls.some((call) => call.url.includes("/12/release"))).toBe(true));
    expect(await screen.findByText(/cama habilitada en el censo central/i)).toBeInTheDocument();
  });

  it("muestra el motivo cuando la API rechaza la transición", async () => {
    stubApi([order({ status: "completada" })], {
      failWith: { status: 422, message: "La unidad aún no está equipada." },
    });
    const user = userEvent.setup();
    renderApp("/camas/limpieza", { role: "auxiliar_enfermeria" });

    await user.click(await screen.findByRole("button", { name: /marcar unidad equipada/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/aún no está equipada/i);
    expect(screen.getByRole("button", { name: /marcar unidad equipada/i })).toBeEnabled();
  });

  it("filtra por etapa y por habitación o cama", async () => {
    stubApi([
      order({ id: 1, status: "pendiente" }),
      order({ id: 2, bedId: 12, room: "405", bedCode: "A", status: "equipada" }),
    ]);
    const user = userEvent.setup();
    renderApp("/camas/limpieza", { role: "enfermera_supervisora" });

    await screen.findByRole("heading", { name: /habitación 405 · cama a/i });
    await user.click(screen.getByRole("button", { name: /etapa 1/i }));
    expect(screen.queryByRole("heading", { name: /habitación 405/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /habitación 312/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /todas las órdenes/i }));
    await user.type(screen.getByRole("searchbox", { name: /buscar por habitación o cama/i }), "405");
    expect(screen.queryByRole("heading", { name: /habitación 312/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /habitación 405/i })).toBeInTheDocument();
  });

  it("explica de dónde nacen las órdenes cuando no hay ninguna", async () => {
    stubApi([]);
    renderApp("/camas/limpieza", { role: "servicios_generales" });

    expect(await screen.findByText(/no hay órdenes de limpieza/i)).toBeInTheDocument();
    expect(screen.getByText(/se generan automáticamente al registrarse el egreso/i)).toBeInTheDocument();
  });
});
