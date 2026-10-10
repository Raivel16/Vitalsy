import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

const MEMBERS = [
  { id: 4, name: "Ana Piso", role: "enfermera_piso", isActive: true },
  { id: 5, name: "Beto Auxiliar", role: "auxiliar_enfermeria", isActive: true },
];

type Call = { url: string; method: string; body?: string };
const calls: Call[] = [];

type Coverage = {
  id: number; absenceId: number; status: string; absentUserId: number; absentName: string;
  shiftDate: string; reason: string; approvedByName: string | null; authorizedByName: string | null; retainerName: string | null;
};

function coverage(status: string): Coverage {
  return {
    id: 7, absenceId: 3, status, absentUserId: 4, absentName: "Ana Piso", shiftDate: "2026-10-09",
    reason: "Descanso médico", approvedByName: null, authorizedByName: null, retainerName: null,
  };
}

function stubStaff(options?: { coverage?: Coverage[]; absence?: unknown; handoverPatients?: unknown[] }) {
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body as string | undefined });
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (url.includes("/staff/members")) return jsonResponse(200, { data: MEMBERS });
      if (url.includes("/staff/shift-plans/") && method === "GET") return jsonResponse(404, { message: "No hay un rol publicado para ese mes." });
      if (url.includes("/staff/shift-plans")) return jsonResponse(201, { plan: { yearMonth: "2026-10", published: true, shifts: [] } });
      if (url.includes("/assignments/suggest")) {
        return jsonResponse(200, {
          suggestion: {
            shiftDate: "2026-10-09",
            assignments: [{ nurseUserId: 4, encounterId: "ENC-1", patientName: "Paciente Uno", news2Weight: 8 }],
            loads: [{ nurseId: 4, name: "Ana Piso", weight: 3, patients: 1 }],
          },
        });
      }
      if (url.includes("/assignments/approve")) return jsonResponse(201, { approved: true });
      if (url.includes("/staff/absences")) {
        return jsonResponse(201, options?.absence ?? { absence: { id: 3 }, coverage: { required: false, requestId: null }, reassignments: [{ nurseUserId: 5, nurseName: "Beto Auxiliar", patients: 2 }], unassigned: 0 });
      }
      if (url.includes("/coverage-requests") && method === "GET") return jsonResponse(200, { requests: options?.coverage ?? [] });
      if (url.includes("/confirm")) return jsonResponse(201, { confirmation: { id: 1, userId: 5, confirmedBy: 1 } });
      if (url.includes("/approve")) return jsonResponse(200, { request: { id: 7, status: "aprobada_jefatura" } });
      if (url.includes("/authorize")) return jsonResponse(200, { request: { id: 7, status: "autorizada" } });
      if (url.includes("/staff/handover") && method === "GET") {
        return jsonResponse(200, {
          handover: {
            shiftDate: "2026-10-09", fromUserId: 4, fromName: "Ana Piso",
            patients: options?.handoverPatients ?? [
              { encounterId: "ENC-1", patientName: "Paciente Uno", news2: 5, alerts: [{ id: 1, message: "Alerta abierta", status: "abierta" }], pendingDoses: 2 },
            ],
          },
        });
      }
      if (url.includes("/staff/handover")) return jsonResponse(201, { handover: { id: 1, signed: true } });
      return jsonResponse(200, {});
    }),
  );
}

describe("personal asistencial (RF-78 a RF-88)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("la jefatura arma el rol con selector de personal y lo publica", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "jefatura_enfermeria" });

    await user.click(await screen.findByRole("button", { name: /publicar rol mensual/i }));
    expect(await screen.findByText(/agregue al menos un turno/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.url.includes("/shift-plans"))).toBe(false);

    await user.selectOptions(await screen.findByLabelText(/colaborador/i), "4");
    await user.click(screen.getByRole("button", { name: /agregar turno/i }));
    await user.click(screen.getByRole("button", { name: /publicar rol mensual/i }));

    expect(await screen.findByText(/rol mensual de turnos publicado/i)).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/shift-plans"));
    const body = JSON.parse(post?.body ?? "{}");
    expect(body.shifts[0].userId).toBe(4);
    expect(body.yearMonth).toMatch(/^\d{4}-\d{2}$/);
  });

  it("la supervisora sugiere con nombres, revisa la propuesta y la aprueba", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_supervisora" });

    await user.click(await screen.findByLabelText("Ana Piso"));
    await user.click(screen.getByRole("button", { name: /sugerir distribución/i }));

    const proposal = await screen.findByRole("table", { name: /propuesta/i });
    expect(within(proposal).getByText("Paciente Uno")).toBeInTheDocument();
    expect(screen.queryByText(/nurseUserId/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /aprobar asignación/i }));
    expect(await screen.findByText(/asignación diaria aprobada/i)).toBeInTheDocument();
    expect(screen.queryByText(/notificada/i)).not.toBeInTheDocument();
  });

  it("exige elegir a la enfermera sugerida antes de llamar a la API", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_supervisora" });

    await user.click(await screen.findByRole("button", { name: /sugerir distribución/i }));
    expect(await screen.findByText(/seleccione al menos una enfermera/i)).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("/assignments/suggest"))).toBe(false);
  });

  it("muestra el resultado de la inasistencia con las reasignaciones", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_supervisora" });

    await user.selectOptions(await screen.findByLabelText(/quien falta/i), "4");
    await user.selectOptions(screen.getByLabelText(/motivo/i), "Descanso médico");
    await user.click(screen.getByRole("button", { name: /registrar inasistencia/i }));

    expect(await screen.findByText(/2 paciente\(s\) reasignado\(s\) a beto auxiliar/i)).toBeInTheDocument();
    const post = calls.find((c) => c.url.includes("/staff/absences"));
    expect(JSON.parse(post?.body ?? "{}")).toMatchObject({ userId: 4, reason: "Descanso médico" });
  });

  it("avisa cuando la ausencia abre una solicitud de cobertura", async () => {
    stubStaff({ absence: { absence: { id: 3 }, coverage: { required: true, requestId: 9 }, reassignments: [], unassigned: 1 } });
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_supervisora" });

    await user.selectOptions(await screen.findByLabelText(/quien falta/i), "4");
    await user.selectOptions(screen.getByLabelText(/motivo/i), "Inasistencia");
    await user.click(screen.getByRole("button", { name: /registrar inasistencia/i }));

    expect(await screen.findByText(/se abrió una solicitud de cobertura/i)).toBeInTheDocument();
  });

  it("la supervisora confirma el ingreso del retén autorizado (RF-88)", async () => {
    stubStaff({ coverage: [coverage("autorizada")] });
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_supervisora" });

    expect(await screen.findByText("Lista para ingreso")).toBeInTheDocument();
    expect(screen.getByText(/2026-10-09 · Descanso médico/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/retén que ingresa/i), "5");
    await user.click(screen.getByRole("button", { name: /confirmar ingreso del retén/i }));

    expect(await screen.findByText(/ingreso del retén confirmado/i)).toBeInTheDocument();
    const post = calls.find((c) => c.url.includes("/coverage-requests/7/confirm"));
    expect(JSON.parse(post?.body ?? "{}")).toEqual({ userId: 5 });
  });

  it("la jefatura aprueba solo convocatorias pendientes", async () => {
    stubStaff({ coverage: [coverage("solicitada"), { ...coverage("autorizada"), id: 8 }] });
    const user = userEvent.setup();
    renderApp("/personal", { role: "jefatura_enfermeria" });

    const buttons = await screen.findAllByRole("button", { name: /aprobar retén/i });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    expect(await screen.findByText(/convocatoria de retén aprobada/i)).toBeInTheDocument();
  });

  it("recursos humanos autoriza solo lo aprobado por la jefatura", async () => {
    stubStaff({ coverage: [coverage("solicitada"), { ...coverage("aprobada_jefatura"), id: 8 }] });
    const user = userEvent.setup();
    renderApp("/personal", { role: "recursos_humanos" });

    const buttons = await screen.findAllByRole("button", { name: /autorizar cobertura/i });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    expect(await screen.findByText(/cobertura extraordinaria autorizada/i)).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay coberturas", async () => {
    stubStaff({ coverage: [] });
    renderApp("/personal", { role: "recursos_humanos" });
    expect(await screen.findByText(/no hay solicitudes de cobertura/i)).toBeInTheDocument();
  });

  it("la enfermera de piso consolida el handover de la saliente y firma", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_piso" });

    await user.selectOptions(await screen.findByLabelText(/enfermera saliente/i), "4");
    await user.click(screen.getByRole("button", { name: /consolidar handover/i }));
    expect(await screen.findByText("Paciente Uno")).toBeInTheDocument();
    expect(screen.getByText(/alerta abierta/i)).toBeInTheDocument();
    expect(screen.getByText(/2 dosis pendientes/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /firmar recepción de turno/i }));
    expect(await screen.findByText(/recepción de turno firmada/i)).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/staff/handover"));
    expect(JSON.parse(post?.body ?? "{}")).toMatchObject({ fromUserId: 4 });
  });

  it("no ofrece la pantalla de personal a otros perfiles", async () => {
    stubStaff();
    renderApp("/personal", { role: "admision" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });
});
