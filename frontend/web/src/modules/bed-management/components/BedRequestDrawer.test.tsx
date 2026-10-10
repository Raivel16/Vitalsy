import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BedRequestDrawer } from "./BedRequestDrawer";

describe("BedRequestDrawer", () => {
  it("expone el cajón como diálogo nativo con nombre y enfoca el panel", () => {
    render(
      <BedRequestDrawer title="Nueva solicitud de cama" onClose={vi.fn()}>
        <p>Contenido del formulario</p>
      </BedRequestDrawer>,
    );

    const dialog = screen.getByRole("dialog", { name: /nueva solicitud de cama/i });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
    expect(dialog.parentElement).toHaveClass("drawer-backdrop");
    // El fondo clicable es un botón nativo oculto a lectores de pantalla y fuera del orden de tabulación.
    const scrim = dialog.parentElement?.querySelector(".drawer-scrim");
    expect(scrim?.tagName).toBe("BUTTON");
    expect(scrim).toHaveAttribute("aria-hidden", "true");
    expect(scrim).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Contenido del formulario")).toBeInTheDocument();
  });

  it("cierra con el botón, con Escape y con clic en el fondo, pero no dentro del panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <BedRequestDrawer title="Nueva solicitud de cama" onClose={onClose}>
        <p>Contenido del formulario</p>
      </BedRequestDrawer>,
    );

    await user.click(screen.getByText("Contenido del formulario"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("dialog").parentElement?.querySelector(".drawer-scrim") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("devuelve el foco al elemento que abrió el cajón al desmontarse", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <BedRequestDrawer title="Nueva solicitud de cama" onClose={vi.fn()}>
        <p>Contenido</p>
      </BedRequestDrawer>,
    );
    expect(opener).not.toHaveFocus();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
