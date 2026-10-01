import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../test/renderApp";

describe("inicio de sesión", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no envía el formulario si faltan el correo o la contraseña", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/", { role: null });

    expect(document.querySelector("main.login-screen")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(screen.getByLabelText(/correo/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/el correo es obligatorio/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("permite mostrar y ocultar la contraseña con el botón del ojo", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());
    renderApp("/", { role: null });

    const password = screen.getByLabelText(/^contraseña$/i);
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar contraseña/i }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /ocultar contraseña/i }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("muestra el error del servidor y entra al ingreso si las credenciales son válidas", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(204, {}))
      .mockResolvedValueOnce(jsonResponse(422, { message: "El correo o la contraseña no son correctos." }))
      .mockResolvedValueOnce(jsonResponse(204, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, { user: { name: "Mesa de admisión", email: "admision@vitalsy.local", role: "admision" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/", { role: null });

    await user.type(screen.getByLabelText(/correo/i), "admision@vitalsy.local");
    await user.type(screen.getByLabelText(/^contraseña$/i), "incorrecta");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no son correctos/i);

    await user.clear(screen.getByLabelText(/^contraseña$/i));
    await user.type(screen.getByLabelText(/^contraseña$/i), "Vitalsy.2026");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: /admisión y recepción/i })).toBeInTheDocument();
    expect(screen.queryByText(/RF-\d+/)).not.toBeInTheDocument();
  });
});
