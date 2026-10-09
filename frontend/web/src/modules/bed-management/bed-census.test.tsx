import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import type { AssignmentNotification, Bed, BedRequest, PatientOption, Projection, WardCensus } from "./types";

type Call = { url: string; method: string; body?: Record<string, unknown> };

const bed = (overrides: Partial<Bed>): Bed => ({
  id: 1, ward: "Medicina Interna A", room: "101", bedCode: "A", genderPolicy: "mixed", isolation: false, status: "available", occupant: null, ...overrides,
});

const WARDS: WardCensus[] = [
  {
    id: 1, code: "MED-A", name: "Medicina Interna A", specialty: "medicina_interna", available: 2, occupied: 1, cleaning: 0,
    beds: [
      bed({ id: 1, room: "101", bedCode: "A" }),
      bed({
        id: 2, room: "101", bedCode: "B", status: "occupied",
        occupant: { encounterId: "ENC-OC", patientName: "Carlos Ramírez", since: new Date(Date.now() - 3 * 86400000).toISOString() },
      }),
      bed({ id: 3, room: "102", bedCode: "A", genderPolicy: "female" }),
    ],
  },
  {
    id: 2, code: "CIR-B", name: "Cirugía B", specialty: "cirugia", available: 1, occupied: 0, cleaning: 1,
    beds: [
      bed({ id: 4, ward: "Cirugía B", room: "201", bedCode: "A", genderPolicy: "male" }),
      bed({ id: 5, ward: "Cirugía B", room: "202", bedCode: "A", status: "cleaning" }),
    ],
  },
];

const WAITING: BedRequest[] = [
  {
    id: 9, patientName: "Lucía Ramos", encounterId: "ENC-9", source: "quirofano", priority: "critica", specialty: "medicina_interna",
    gender: "female", isolation: false, isolationType: "ninguno", equipment: ["oxigeno_central"], status: "pendiente",
    requestedAt: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 10, patientName: "Sin lecho", encounterId: null, source: "urgencias", priority: "baja", specialty: "cirugia",
    gender: "male", isolation: true, isolationType: "contacto", equipment: [], status: "en_espera",
    requestedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
];

const PATIENTS: PatientOption[] = [
  { encounterId: "ENC-AN", patientName: "Ana Quispe", documentNumber: "70000031", originService: "Urgencias", gender: "female" },
  { encounterId: "ENC-CA", patientName: "Carlos Soto", documentNumber: "70000041", originService: "Admisión", gender: null },
];

type Options = {
  wards?: WardCensus[];
  requests?: BedRequest[];
  projections?: Projection[];
  notifications?: AssignmentNotification[];
  gate?: Promise<void>;
  failAssign?: string;
};

function stubApi(options: Options = {}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });

      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (method === "GET") {
        if (url.includes("/beds/census")) return jsonResponse(200, { wards: options.wards ?? WARDS });
        if (url.includes("/suggestions")) {
          const id = Number(url.match(/requests\/(\d+)\/suggestions/)?.[1]);
          return jsonResponse(200, { suggestions: id === 9 ? [WARDS[0].beds[2]] : [] });
        }
        if (url.includes("/beds/requests")) return jsonResponse(200, { requests: options.requests ?? WAITING });
        if (url.includes("/beds/patients")) {
          const query = decodeURIComponent(url.split("query=")[1] ?? "").toLowerCase();
          return jsonResponse(200, { patients: PATIENTS.filter((patient) => patient.patientName.toLowerCase().includes(query)) });
        }
        if (url.includes("/beds/projections")) return jsonResponse(200, { projections: options.projections ?? [] });
        if (url.includes("/assignments/notifications")) return jsonResponse(200, { notifications: options.notifications ?? [] });
        if (url.includes("/cleaning-orders")) return jsonResponse(200, { orders: [] });
      }
      if (method === "POST") {
        if (options.gate) await options.gate;
        if (url.includes("/assign") && options.failAssign) return jsonResponse(422, { message: options.failAssign });
        if (url.endsWith("/beds/requests")) return jsonResponse(201, { request: { id: 99, status: "pendiente" }, suggestions: [] });
        if (url.includes("/assign")) return jsonResponse(201, { assignment: { id: 7, bedId: 3 } });
        if (url.endsWith("/beds/projections")) return jsonResponse(201, { projection: { id: 1 } });
        return jsonResponse(200, { acknowledged: true });
      }
      return jsonResponse(200, {});
    }),
  );
  return calls;
}

const posts = (calls: Call[]) => calls.filter((call) => call.method === "POST");

describe("censo y asignación de camas (RF-68 a RF-73)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("muestra el censo, el ocupante, la lista de espera priorizada y el siguiente paso", async () => {
    stubApi();
    renderApp("/camas", { role: "gestion_camas" });

    expect(await screen.findByRole("heading", { name: /censo hospitalario/i })).toBeInTheDocument();
    expect(await screen.findByText("Carlos Ramírez")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /guía del proceso/i })).toHaveTextContent(/tiene 2 solicitudes en espera/i);

    const waiting = screen.getByRole("region", { name: /lista de espera priorizada/i });
    expect(within(waiting).getByText("Prioridad 1: Crítica")).toBeInTheDocument();
    expect(within(waiting).getByText("Lucía Ramos")).toBeInTheDocument();
    expect(within(waiting).getByText(/sugerida: 102-a/i)).toBeInTheDocument();
    expect(within(waiting).getByText(/sin lecho compatible/i)).toBeInTheDocument();
    expect(within(waiting).getByText(/requiere: oxígeno central/i)).toBeInTheDocument();
  });

  it("asigna el lecho sugerido tras confirmar y avisa que la supervisora fue notificada", async () => {
    const calls = stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    await user.click(await screen.findByRole("button", { name: /asignar lecho compatible a lucía ramos/i }));
    const confirm = screen.getByRole("region", { name: /confirmar asignación/i });
    expect(within(confirm).getByText(/lucía ramos/i)).toBeInTheDocument();
    expect(within(confirm).getByText(/102-a/i)).toBeInTheDocument();
    expect(posts(calls)).toHaveLength(0);

    await user.click(within(confirm).getByRole("button", { name: /confirmar asignación/i }));

    expect(await screen.findByText(/notificada a la enfermera supervisora/i)).toBeInTheDocument();
    const assign = posts(calls).find((call) => call.url.includes("/requests/9/assign"));
    expect(assign?.body).toEqual({ bedId: 3 });
  });

  it("permite cancelar la confirmación sin asignar", async () => {
    const calls = stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    await user.click(await screen.findByRole("button", { name: /asignar lecho compatible a lucía ramos/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("region", { name: /confirmar asignación/i })).not.toBeInTheDocument();
    expect(posts(calls)).toHaveLength(0);
  });

  it("asigna desde una cama libre solo si hay una solicitud compatible", async () => {
    stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    // 101-A (mixta, medicina) sirve a Lucía; 201-A (cirugía, varón) no sirve a nadie pendiente sin aislamiento
    const compatible = await screen.findByRole("button", { name: /asignar lecho 101-a/i });
    expect(compatible).toBeEnabled();
    expect(screen.getByRole("button", { name: /asignar lecho 201-a/i })).toBeDisabled();

    await user.click(compatible);
    expect(screen.getByRole("region", { name: /confirmar asignación/i })).toHaveTextContent(/101-a/i);
  });

  it("muestra el motivo cuando el servidor rechaza la asignación", async () => {
    stubApi({ failAssign: "El lecho no es compatible con el paciente: La política de género no coincide." });
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    await user.click(await screen.findByRole("button", { name: /asignar lecho compatible a lucía ramos/i }));
    await user.click(screen.getByRole("button", { name: /confirmar asignación/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no es compatible con el paciente/i);
  });

  it("valida la solicitud antes de enviarla", async () => {
    const calls = stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    await user.click(await screen.findByRole("button", { name: /registrar solicitud/i }));

    expect(screen.getByText(/seleccione al paciente o escriba su nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/indique la especialidad/i)).toBeInTheDocument();
    expect(screen.getByText(/indique el género/i)).toBeInTheDocument();
    expect(posts(calls)).toHaveLength(0);
  });

  it("registra la solicitud con el ingreso elegido y sin valores ocultos", async () => {
    const calls = stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    await user.type(await screen.findByLabelText(/^paciente$/i), "Ana");
    await user.click(await screen.findByRole("button", { name: /ana quispe/i }));
    await user.selectOptions(screen.getByLabelText(/^especialidad$/i), "medicina_interna");
    await user.click(screen.getByRole("radio", { name: /crítica/i }));
    await user.selectOptions(screen.getByLabelText(/requerimientos de aislamiento/i), "gotas");
    await user.click(screen.getByRole("checkbox", { name: /oxígeno central/i }));
    await user.click(screen.getByRole("button", { name: /registrar solicitud/i }));

    expect(await screen.findByText(/solicitud de cama registrada/i)).toBeInTheDocument();
    const created = posts(calls).find((call) => call.url.endsWith("/beds/requests"));
    expect(created?.body).toEqual({
      source: "urgencias",
      priority: "critica",
      encounterId: "ENC-AN",
      specialty: "medicina_interna",
      gender: "female",
      isolationType: "gotas",
      equipment: ["oxigeno_central"],
    });
  });

  it("pide el género cuando el paciente elegido no lo tiene registrado", async () => {
    stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    await user.type(await screen.findByLabelText(/^paciente$/i), "Carlos");
    await user.click(await screen.findByRole("button", { name: /carlos soto/i }));
    await user.selectOptions(screen.getByLabelText(/^especialidad$/i), "cirugia");
    await user.click(screen.getByRole("button", { name: /registrar solicitud/i }));

    expect(screen.getByText(/indique el género/i)).toBeInTheDocument();
  });

  it("no envía dos veces la solicitud mientras se registra", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const calls = stubApi({ gate });
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    await user.type(await screen.findByLabelText(/^paciente$/i), "Ana");
    await user.click(await screen.findByRole("button", { name: /ana quispe/i }));
    await user.selectOptions(screen.getByLabelText(/^especialidad$/i), "medicina_interna");
    const submit = screen.getByRole("button", { name: /registrar solicitud/i });
    await user.click(submit);
    await user.click(submit);
    release();

    await screen.findByText(/solicitud de cama registrada/i);
    expect(posts(calls).filter((call) => call.url.endsWith("/beds/requests"))).toHaveLength(1);
  });
});

describe("proyección de altas y notificaciones (RF-71, RF-73)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("la supervisora no ve el alta de solicitudes ni acciones de asignación", async () => {
    stubApi();
    renderApp("/camas", { role: "enfermera_supervisora" });

    expect(await screen.findByRole("heading", { name: /censo hospitalario/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar solicitud/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /asignar lecho/i })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /proyección de altas/i })).toBeInTheDocument();
  });

  it("registra una proyección eligiendo un paciente internado", async () => {
    const calls = stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "enfermera_supervisora" });

    const panel = await screen.findByRole("region", { name: /proyección de altas/i });
    await user.selectOptions(within(panel).getByLabelText(/paciente internado/i), "ENC-OC");
    const future = new Date(Date.now() + 6 * 3600000);
    const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    await user.type(within(panel).getByLabelText(/alta prevista/i), local);
    await user.click(within(panel).getByRole("button", { name: /registrar proyección/i }));

    expect(await screen.findByText(/proyección de alta registrada/i)).toBeInTheDocument();
    const created = posts(calls).find((call) => call.url.endsWith("/beds/projections"));
    expect(created?.body).toMatchObject({ encounterId: "ENC-OC" });
  });

  it("valida la proyección antes de enviarla", async () => {
    const calls = stubApi();
    const user = userEvent.setup();
    renderApp("/camas", { role: "enfermera_supervisora" });

    const panel = await screen.findByRole("region", { name: /proyección de altas/i });
    await user.click(within(panel).getByRole("button", { name: /registrar proyección/i }));

    expect(within(panel).getByText(/seleccione al paciente/i)).toBeInTheDocument();
    expect(within(panel).getByText(/indique la fecha y hora/i)).toBeInTheDocument();
    expect(posts(calls)).toHaveLength(0);
  });

  it("la supervisora confirma las asignaciones notificadas", async () => {
    const calls = stubApi({
      notifications: [
        { id: 7, encounterId: "ENC-9", patientName: "Lucía Ramos", ward: "Medicina Interna A", room: "102", bedCode: "A", assignedAt: new Date().toISOString() },
      ],
    });
    const user = userEvent.setup();
    renderApp("/camas", { role: "enfermera_supervisora" });

    const inbox = await screen.findByRole("region", { name: /asignaciones por confirmar/i });
    expect(within(inbox).getByText(/lucía ramos/i)).toBeInTheDocument();
    await user.click(within(inbox).getByRole("button", { name: /confirmar recepción/i }));

    await waitFor(() => expect(posts(calls).some((call) => call.url.includes("/assignments/7/acknowledge"))).toBe(true));
  });

  it("gestión de camas ve las proyecciones vigentes pero no puede registrarlas", async () => {
    stubApi({
      projections: [{ id: 1, encounterId: "ENC-OC", patientName: "Carlos Ramírez", projectedAt: new Date(Date.now() + 3600000).toISOString() }],
    });
    renderApp("/camas", { role: "gestion_camas" });

    const panel = await screen.findByRole("region", { name: /proyección de altas/i });
    expect(within(panel).getByText(/carlos ramírez/i)).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /registrar proyección/i })).not.toBeInTheDocument();
  });
});
