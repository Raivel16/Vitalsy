import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

type Call = { url: string; method: string; body?: Record<string, unknown> };
const calls: Call[] = [];

const WARD = {
  id: 1,
  code: "MED-A",
  name: "Medicina Interna A",
  specialty: "medicina_interna",
  active: true,
  beds: [
    { id: 11, wardId: 1, room: "101", bedCode: "A", genderPolicy: "mixed", isolation: false, status: "available", active: true },
    { id: 12, wardId: 1, room: "101", bedCode: "B", genderPolicy: "female", isolation: true, status: "occupied", active: true },
  ],
};

function stubApi(options: { wards?: unknown[]; failBedPatch?: boolean } = {}) {
  calls.length = 0;
  const wards = options.wards ?? [WARD];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (!url.includes("/bed-infrastructure")) return jsonResponse(200, {});
      calls.push({ url, method, body });
      if (url.endsWith("/wards") && method === "GET") return jsonResponse(200, { wards });
      if (url.endsWith("/wards") && method === "POST") return jsonResponse(201, { ward: { ...WARD, id: 2, code: body?.code, name: body?.name, beds: [] } });
      if (url.endsWith("/beds/bulk/preview")) {
        return jsonResponse(200, {
          total: 4,
          existing: 1,
          beds: [
            { room: "301", bedCode: "A", label: "301-A", exists: false },
            { room: "301", bedCode: "B", label: "301-B", exists: true },
            { room: "302", bedCode: "A", label: "302-A", exists: false },
            { room: "302", bedCode: "B", label: "302-B", exists: false },
          ],
        });
      }
      if (url.endsWith("/beds/bulk")) return jsonResponse(201, { created: 3, skipped: 1 });
      if (url.endsWith("/beds") && method === "POST") return jsonResponse(201, { bed: WARD.beds[0] });
      if (/\/beds\/\d+$/.test(url) && method === "PATCH") {
        if (options.failBedPatch) return jsonResponse(422, { message: "No se puede desactivar la cama 101-B: está ocupada o en limpieza." });
        return jsonResponse(200, { bed: { ...WARD.beds[0], active: body?.active } });
      }
      if (/\/(beds|wards)\/\d+$/.test(url) && method === "DELETE") return jsonResponse(200, { deleted: true });
      return jsonResponse(200, {});
    }),
  );
}

const sent = (suffix: string, method: string) => calls.find((c) => c.url.endsWith(suffix) && c.method === method);

describe("infraestructura de camas (RF-110 a RF-112)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("solo el administrador de accesos ve la opción y la pantalla", async () => {
    stubApi();
    renderApp("/infraestructura", { role: "administrador_accesos" });
    expect(await screen.findByRole("heading", { name: "Infraestructura de camas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Infraestructura de camas/ })).toBeInTheDocument();
  });

  it("niega la pantalla a otros roles", async () => {
    stubApi();
    renderApp("/infraestructura", { role: "gestion_camas" });
    expect(await screen.findByText(/administrador de accesos/i)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("guía el primer arranque cuando no hay pabellones y valida antes de enviar", async () => {
    stubApi({ wards: [] });
    const user = userEvent.setup();
    renderApp("/infraestructura", { role: "administrador_accesos" });

    expect(await screen.findByText(/Aún no hay pabellones/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Crear pabellón" }));
    expect(screen.getByText("El código es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("Seleccione una especialidad.")).toBeInTheDocument();
    expect(sent("/wards", "POST")).toBeUndefined();

    await user.type(screen.getByLabelText("Código del pabellón"), "UCI-C");
    await user.type(screen.getByLabelText("Nombre del pabellón"), "Cuidados intensivos");
    await user.selectOptions(screen.getByLabelText("Especialidad"), "cuidados_intensivos");
    await user.click(screen.getByRole("button", { name: "Crear pabellón" }));

    expect(await screen.findByText("Pabellón UCI-C creado.")).toBeInTheDocument();
    expect(sent("/wards", "POST")?.body).toEqual({ code: "UCI-C", name: "Cuidados intensivos", specialty: "cuidados_intensivos" });
  });

  it("crea una cama individual tras validar", async () => {
    stubApi();
    const user = userEvent.setup();
    renderApp("/infraestructura", { role: "administrador_accesos" });
    await screen.findByText("Medicina Interna A");

    await user.click(screen.getByRole("button", { name: "Crear cama" }));
    expect(screen.getByText("La habitación es obligatoria.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Pabellón de la cama"), "1");
    await user.type(screen.getByLabelText("Habitación"), "102");
    await user.type(screen.getByLabelText("Código de cama"), "A");
    await user.click(screen.getByLabelText("Cama de aislamiento"));
    await user.click(screen.getByRole("button", { name: "Crear cama" }));

    expect(await screen.findByText("Cama 102-A creada.")).toBeInTheDocument();
    expect(sent("/beds", "POST")?.body).toEqual({ wardId: 1, room: "102", bedCode: "A", genderPolicy: "mixed", isolation: true });
  });

  it("desactiva una cama y avisa; muestra el motivo si el servidor la rechaza", async () => {
    stubApi();
    const user = userEvent.setup();
    renderApp("/infraestructura", { role: "administrador_accesos" });
    await screen.findByText("Medicina Interna A");

    await user.click(screen.getByRole("button", { name: "Desactivar cama 101-A" }));
    expect(await screen.findByText("Cama 101-A desactivada.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PATCH" && c.body?.active === false)).toBe(true);

    vi.unstubAllGlobals();
    stubApi({ failBedPatch: true });
    await user.click(screen.getByRole("button", { name: "Desactivar cama 101-B" }));
    expect(await screen.findByText(/está ocupada o en limpieza/)).toBeInTheDocument();
  });

  it("pide confirmación antes de borrar una cama y conserva el historial", async () => {
    stubApi();
    const user = userEvent.setup();
    renderApp("/infraestructura", { role: "administrador_accesos" });
    await screen.findByText("Medicina Interna A");

    await user.click(screen.getByRole("button", { name: "Borrar cama 101-A" }));
    expect(screen.getByText(/conserva el historial/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Cancelar borrado de la cama 101-A" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Borrar cama 101-A" }));
    await user.click(screen.getByRole("button", { name: "Confirmar borrado de la cama 101-A" }));
    expect(await screen.findByText("Cama 101-A borrada. El historial se conserva.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/beds/11"))).toBe(true);
  });

  it("alta en lote: valida, muestra la vista previa y crea solo las nuevas", async () => {
    stubApi();
    const user = userEvent.setup();
    renderApp("/infraestructura", { role: "administrador_accesos" });
    await screen.findByText("Medicina Interna A");

    await user.click(screen.getByRole("button", { name: "Vista previa del lote" }));
    expect(screen.getByText("Indique la habitación inicial.")).toBeInTheDocument();
    expect(sent("/beds/bulk/preview", "POST")).toBeUndefined();

    await user.selectOptions(screen.getByLabelText("Pabellón del lote"), "1");
    await user.type(screen.getByLabelText("Habitación inicial"), "301");
    await user.type(screen.getByLabelText("Habitación final"), "302");
    await user.type(screen.getByLabelText("Camas por habitación"), "2");
    await user.click(screen.getByRole("button", { name: "Vista previa del lote" }));

    const preview = await screen.findByRole("region", { name: "Vista previa del lote" });
    expect(within(preview).getByText(/4 camas/)).toBeInTheDocument();
    expect(within(preview).getByText(/1 ya existe/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Crear 3 camas nuevas" }));
    expect(await screen.findByText("Lote creado: 3 camas nuevas, 1 ya existía.")).toBeInTheDocument();
    expect(sent("/beds/bulk", "POST")?.body).toMatchObject({ wardId: 1, roomFrom: 301, roomTo: 302, bedsPerRoom: 2 });
  });
});
