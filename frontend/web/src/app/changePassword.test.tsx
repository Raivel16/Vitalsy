import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../test/renderApp";

function signInWithTemporaryPassword() {
  sessionStorage.removeItem("vitalsy-role");
  sessionStorage.setItem(
    "vitalsy-user",
    JSON.stringify({ name: "Ana Admisión", email: "ana@vitalsy.local", role: "admision", mustChangePassword: true }),
  );
}

describe("cambio obligatorio de contraseña temporal (RF-102)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("muestra solo la pantalla de cambio y no el tablero mientras la contraseña sea temporal", () => {
    signInWithTemporaryPassword();
    vi.stubGlobal("fetch", vi.fn());
    renderApp("/");

    expect(screen.getByRole("heading", { name: /cambie su contraseña/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("valida antes de enviar y no llama a la API con datos inválidos", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    signInWithTemporaryPassword();
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/");

    await user.type(screen.getByLabelText(/contraseña actual/i), "temporal");
    await user.type(screen.getByLabelText(/^nueva contraseña$/i), "corta");
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), "otra");
    await user.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    expect(screen.getByText(/al menos 10 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envía el cambio y libera el acceso al tablero", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        user: { name: "Ana Admisión", email: "ana@vitalsy.local", role: "admision", mustChangePassword: false },
      }),
    );
    signInWithTemporaryPassword();
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/");

    await user.type(screen.getByLabelText(/contraseña actual/i), "temporal-123");
    await user.type(screen.getByLabelText(/^nueva contraseña$/i), "Clave-nueva-segura-9");
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), "Clave-nueva-segura-9");
    await user.click(screen.getByRole("button", { name: /guardar contraseña/i }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: /cambie su contraseña/i })).not.toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/auth/change-password");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      currentPassword: "temporal-123",
      password: "Clave-nueva-segura-9",
      password_confirmation: "Clave-nueva-segura-9",
    });
  });
});
