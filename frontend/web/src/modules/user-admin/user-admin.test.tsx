import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

type Account = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  mustChangePassword: boolean;
};

const ACCOUNTS: Account[] = [
  { id: 2, name: "Rosa Quispe", email: "rosa@vitalsy.local", role: "enfermera_piso", roleLabel: "Enfermera de piso", isActive: true, mustChangePassword: false },
  { id: 3, name: "Pedro Baja", email: "pedro@vitalsy.local", role: "camillero", roleLabel: "Celador / Camillero", isActive: false, mustChangePassword: false },
];

const calls: Array<{ url: string; method: string; body?: string }> = [];

function stubUsers(overrides?: { createStatus?: number }) {
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body as string | undefined });
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (url.endsWith("/api/v1/users") && method === "POST") {
        if (overrides?.createStatus === 422) return jsonResponse(422, { message: "El correo ya está registrado." });
        return jsonResponse(201, { user: { ...ACCOUNTS[0], id: 9, name: "Lucía Mendoza" }, temporaryPassword: "Temporal12345" });
      }
      if (url.includes("/deactivate")) return jsonResponse(200, { user: { ...ACCOUNTS[0], isActive: false } });
      if (/\/api\/v1\/users\/\d+$/.test(url) && method === "PATCH") return jsonResponse(200, { user: { ...ACCOUNTS[0], name: "Rosa Q." } });
      if (url.includes("/api/v1/users")) {
        const status = new URL(url, "http://x").searchParams.get("status");
        const data = status === "inactive" ? ACCOUNTS.filter((a) => !a.isActive) : ACCOUNTS;
        return jsonResponse(200, { data });
      }
      return jsonResponse(200, {});
    }),
  );
}

describe("administración de usuarios (RF-101 a RF-104)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("lista cuentas con rol y estado, y filtra por inactivos", async () => {
    stubUsers();
    const user = userEvent.setup();
    renderApp("/usuarios", { role: "administrador_accesos" });

    expect(await screen.findByText("Rosa Quispe")).toBeInTheDocument();
    expect(screen.getByText("Enfermera de piso")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /inactivos/i }));
    expect(await screen.findByText("Pedro Baja")).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("status=inactive"))).toBe(true);
  });

  it("coloca la acción del formulario en su propia fila, a todo el ancho", async () => {
    stubUsers();
    renderApp("/usuarios/nuevo", { role: "administrador_accesos" });

    const submit = await screen.findByRole("button", { name: /crear cuenta/i });
    const row = submit.closest(".form-span-2");
    expect(row).not.toBeNull();
    expect(row).toHaveClass("form-actions-bar");
  });

  it("niega el acceso a otros perfiles", async () => {
    stubUsers();
    renderApp("/usuarios", { role: "recursos_humanos" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });

  it("valida antes de enviar el alta y no llama a la API", async () => {
    stubUsers();
    const user = userEvent.setup();
    renderApp("/usuarios/nuevo", { role: "administrador_accesos" });

    await user.click(await screen.findByRole("button", { name: /crear cuenta/i }));
    expect(await screen.findByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("crea la cuenta y muestra la contraseña temporal una sola vez", async () => {
    stubUsers();
    const user = userEvent.setup();
    renderApp("/usuarios/nuevo", { role: "administrador_accesos" });

    await user.type(await screen.findByLabelText(/nombre completo/i), "Lucía Mendoza");
    await user.type(screen.getByLabelText(/correo/i), "lucia@vitalsy.local");
    await user.selectOptions(screen.getByLabelText(/rol/i), "enfermera_piso");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText("Temporal12345")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/cuenta creada/i);
  });

  it("oculta la contraseña temporal pasado un minuto", async () => {
    stubUsers();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderApp("/usuarios/nuevo", { role: "administrador_accesos" });

      await user.type(await screen.findByLabelText(/nombre completo/i), "Lucía Mendoza");
      await user.type(screen.getByLabelText(/correo/i), "lucia@vitalsy.local");
      await user.selectOptions(screen.getByLabelText(/rol/i), "enfermera_piso");
      await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
      expect(await screen.findByText("Temporal12345")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(61_000);
      });
      expect(screen.queryByText("Temporal12345")).not.toBeInTheDocument();
      expect(screen.getByText(/ya no se muestra/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("muestra el error del servidor cuando el correo ya existe", async () => {
    stubUsers({ createStatus: 422 });
    const user = userEvent.setup();
    renderApp("/usuarios/nuevo", { role: "administrador_accesos" });

    await user.type(await screen.findByLabelText(/nombre completo/i), "Lucía");
    await user.type(screen.getByLabelText(/correo/i), "rosa@vitalsy.local");
    await user.selectOptions(screen.getByLabelText(/rol/i), "camillero");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El correo ya está registrado.");
  });

  it("edita una cuenta y confirma la desactivación sin ofrecer eliminar", async () => {
    stubUsers();
    const user = userEvent.setup();
    renderApp("/usuarios/2", { role: "administrador_accesos" });

    const name = await screen.findByLabelText(/nombre completo/i);
    await user.clear(name);
    await user.type(name, "Rosa Q.");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));
    expect(await screen.findByText(/cambios guardados/i)).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /desactivar cuenta/i }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: /confirmar desactivación/i }));
    expect(await screen.findByText(/cuenta desactivada/i)).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("/users/2/deactivate") && c.method === "POST")).toBe(true);
  });
});
