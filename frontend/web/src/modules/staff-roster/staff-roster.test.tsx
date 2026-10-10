import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import { todayIso } from "./domain/coverage";

const MEMBERS = [
  { id: 4, name: "Ana Piso", email: "ana.piso@vitalsy.local", role: "enfermera_piso", isActive: true },
  { id: 5, name: "Beto Auxiliar", email: "beto.aux@vitalsy.local", role: "auxiliar_enfermeria", isActive: true },
];

const CURRENT_MONTH = todayIso().slice(0, 7);

function shiftPrev(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

type PlanFixture = {
  yearMonth: string;
  shifts: Array<{ userId: number; userName: string; userRole: string; startsAt: string; endsAt: string; unit: string }>;
};

function publishedPlan(yearMonth = CURRENT_MONTH): PlanFixture {
  return {
    yearMonth,
    shifts: [{ userId: 4, userName: "Ana Piso", userRole: "enfermera_piso", startsAt: `${yearMonth}-05T07:00:00+00:00`, endsAt: `${yearMonth}-05T19:00:00+00:00`, unit: "Medicina" }],
  };
}

async function pickPerson(user: ReturnType<typeof userEvent.setup>, label: RegExp, name: string) {
  await user.type(await screen.findByRole("combobox", { name: label }), name.split(" ")[0]);
  await user.click(await screen.findByRole("option", { name: new RegExp(name, "i") }));
}

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

function stubStaff(options?: { coverage?: Coverage[]; absence?: unknown; handoverPatients?: unknown[]; plans?: PlanFixture[]; candidates?: unknown[] }) {
  calls.length = 0;
  const plans = [...(options?.plans ?? [])];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body as string | undefined });
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (url.includes("/staff/members")) return jsonResponse(200, { data: MEMBERS });
      if (url.includes("/staff/shift-plans/") && method === "GET") {
        const found = plans.find((plan) => url.endsWith(`/shift-plans/${plan.yearMonth}`));
        if (!found) return jsonResponse(404, { message: "No hay un rol publicado para ese mes." });
        return jsonResponse(200, { plan: { ...found, published: true, publishedAt: `${found.yearMonth}-01T08:00:00+00:00`, publishedByName: "Jefa Turnos", retainers: [] } });
      }
      if (url.includes("/staff/shift-plans") && method === "POST") {
        const body = JSON.parse((init?.body as string) ?? "{}");
        const next: PlanFixture = {
          yearMonth: body.yearMonth,
          shifts: body.shifts.map((shift: { userId: number; startsAt: string; endsAt: string; unit: string }) => ({
            ...shift,
            userName: MEMBERS.find((m) => m.id === shift.userId)?.name ?? "",
            userRole: "enfermera_piso",
          })),
        };
        const index = plans.findIndex((plan) => plan.yearMonth === next.yearMonth);
        if (index >= 0) plans[index] = next;
        else plans.push(next);
        return jsonResponse(201, { plan: { ...next, published: true } });
      }
      if (url.includes("/staff/shift-plans")) {
        return jsonResponse(200, {
          plans: plans.map((plan) => ({
            yearMonth: plan.yearMonth, publishedAt: `${plan.yearMonth}-01T08:00:00+00:00`, publishedByName: "Jefa Turnos",
            shiftCount: plan.shifts.length, staffCount: 1,
          })),
        });
      }
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
      if (url.includes("/staff/handover/candidates")) {
        return jsonResponse(200, {
          candidates: options?.candidates ?? [{ userId: 4, name: "Ana Piso", unit: "Medicina", endsAt: "2026-10-09T19:00:00+00:00", patients: 1 }],
        });
      }
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

  it("la jefatura busca por correo, marca turnos y al publicar la matriz sigue visible", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "jefatura_enfermeria" });

    await user.type(await screen.findByRole("combobox", { name: /colaborador/i }), "beto.aux");
    await user.click(await screen.findByRole("option", { name: /beto auxiliar/i }));
    // Elegir a la persona no la agrega: se confirma con el botón.
    expect(screen.queryByRole("button", { name: /beto auxiliar, día 5/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /agregar al rol/i }));

    const cell = await screen.findByRole("button", { name: /beto auxiliar, día 5: libre/i });
    await user.click(cell);
    expect(cell).toHaveTextContent("D");
    await user.click(cell);
    expect(cell).toHaveTextContent("N");

    await user.click(screen.getByRole("button", { name: /publicar rol mensual oficial/i }));

    expect(await screen.findByText(/rol mensual de turnos publicado/i)).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/shift-plans"));
    const body = JSON.parse(post?.body ?? "{}");
    expect(body.yearMonth).toBe(CURRENT_MONTH);
    expect(body.shifts).toEqual([
      expect.objectContaining({ userId: 5, startsAt: `${CURRENT_MONTH}-05T19:00:00`, endsAt: expect.stringContaining("T07:00:00") }),
    ]);
    // El rol publicado no desaparece: se recarga y se muestra como vigente.
    expect(await screen.findByText(/publicado el/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /beto auxiliar, día 5: noche/i })).toBeInTheDocument();
  });

  it("la jefatura exige marcar al menos un turno antes de publicar", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "jefatura_enfermeria" });

    await user.click(await screen.findByRole("button", { name: /publicar rol mensual oficial/i }));
    expect(await screen.findByText(/marque al menos un turno/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.url.includes("/shift-plans"))).toBe(false);
  });

  it("muestra el rol vigente, navega a meses anteriores y pide confirmar el reemplazo", async () => {
    const previous = shiftPrev(CURRENT_MONTH);
    stubStaff({ plans: [publishedPlan(), publishedPlan(previous)] });
    const user = userEvent.setup();
    renderApp("/personal", { role: "jefatura_enfermeria" });

    expect(await screen.findByRole("button", { name: /ana piso, día 5: diurno/i })).toBeInTheDocument();
    expect(screen.getByText(/jefa turnos/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mes anterior/i }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith(`/shift-plans/${previous}`))).toBe(true));
    expect(await screen.findByRole("button", { name: /ana piso, día 5: diurno/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /publicar rol mensual oficial/i }));
    expect(await screen.findByText(/reemplaza el rol de/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.url.includes("/shift-plans"))).toBe(false);
    await user.click(screen.getByRole("button", { name: /confirmar reemplazo/i }));
    expect(await screen.findByText(/rol mensual de turnos publicado/i)).toBeInTheDocument();
  });

  it("avisa cuando un mes no tiene rol publicado", async () => {
    stubStaff();
    renderApp("/personal", { role: "jefatura_enfermeria" });
    expect(await screen.findByText(/aún no hay un rol publicado/i)).toBeInTheDocument();
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

    await pickPerson(user, /quien falta/i, "Ana Piso");
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

    await pickPerson(user, /quien falta/i, "Ana Piso");
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
    await pickPerson(user, /retén que ingresa/i, "Beto Auxiliar");
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

  it("la enfermera de piso ve a quién relevar ahora, consolida y firma", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_piso" });

    await user.click(await screen.findByRole("radio", { name: /ana piso/i }));
    await user.click(screen.getByRole("button", { name: /consolidar handover/i }));
    expect(await screen.findByText("Paciente Uno")).toBeInTheDocument();
    expect(screen.getByText(/alerta abierta/i)).toBeInTheDocument();
    expect(screen.getByText(/2 dosis pendientes/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /firmar recepción de turno/i }));
    expect(await screen.findByText(/recepción de turno firmada/i)).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/staff/handover"));
    expect(JSON.parse(post?.body ?? "{}")).toMatchObject({ fromUserId: 4 });
  });

  it("explica por qué no hay relevo disponible cuando no es el cambio de turno", async () => {
    stubStaff({ candidates: [] });
    renderApp("/personal", { role: "enfermera_piso" });

    expect(await screen.findByText(/no hay un relevo disponible ahora/i)).toBeInTheDocument();
    expect(screen.getByText(/rol del mes está publicado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /consolidar handover/i })).not.toBeInTheDocument();
  });

  it("recursos humanos ve cómo llega una solicitud y cuántas esperan su autorización", async () => {
    stubStaff({ coverage: [{ ...coverage("aprobada_jefatura"), id: 8 }, coverage("solicitada")] });
    renderApp("/personal", { role: "recursos_humanos" });

    expect(await screen.findByText(/cómo llega una solicitud/i)).toBeInTheDocument();
    const tile = screen.getByText(/esperan su autorización/i).closest(".stat-tile");
    expect(tile).toHaveTextContent("1");
  });

  it("no ofrece la pantalla de personal a otros perfiles", async () => {
    stubStaff();
    renderApp("/personal", { role: "admision" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });
});
