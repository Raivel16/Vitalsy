import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ToastProvider, useToast } from "./ToastProvider";

function Harness() {
  const { push } = useToast();

  return (
    <button
      type="button"
      onClick={() =>
        push({
          id: "alerta-7",
          tone: "critical",
          title: "Paciente con Deterioro Demo",
          body: "NEWS2 8: confirme la recepción.",
          confirmLabel: "Confirmar lectura",
          onConfirm: () => undefined,
        })
      }
    >
      Emitir aviso
    </button>
  );
}

describe("avisos emergentes de alertas (RF-94)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("anuncia el aviso de forma asertiva para lectores de pantalla", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /emitir aviso/i }));

    const region = screen.getByRole("region", { name: /avisos de alertas/i });
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText(/paciente con deterioro demo/i)).toBeInTheDocument();
  });

  it("no se cierra por tiempo: exige confirmar la lectura", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /emitir aviso/i }));
    expect(screen.getByText(/NEWS2 8/)).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(screen.getByText(/NEWS2 8/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirmar lectura/i }));
    expect(screen.queryByText(/NEWS2 8/)).not.toBeInTheDocument();
  });

  it("ejecuta la confirmación entregada por quien emite el aviso", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    function ConfirmHarness() {
      const { push } = useToast();
      return (
        <button
          type="button"
          onClick={() => push({ id: "a-1", tone: "critical", title: "Alerta", body: "Cuerpo", confirmLabel: "Confirmar lectura", onConfirm })}
        >
          Emitir
        </button>
      );
    }

    render(
      <ToastProvider>
        <ConfirmHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /emitir/i }));
    await user.click(screen.getByRole("button", { name: /confirmar lectura/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("no apila dos veces el mismo aviso", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /emitir aviso/i }));
    await user.click(screen.getByRole("button", { name: /emitir aviso/i }));

    expect(screen.getAllByRole("button", { name: /confirmar lectura/i })).toHaveLength(1);
  });
});
