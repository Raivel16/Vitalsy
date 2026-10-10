import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StaffMember } from "../types";
import { PersonPicker } from "./PersonPicker";

const members = [
  { id: 1, name: "Lucía Paredes", email: "lucia.paredes@vitalsy.local", role: "enfermera_piso" },
  { id: 2, name: "Mateo Salas", email: "mateo.salas@vitalsy.local", role: "medico_tratante" },
  { id: 3, name: "Rosa Quispe", email: "rosa.quispe@vitalsy.local", role: "enfermera_piso" },
] as unknown as StaffMember[];

function setup(props: Partial<React.ComponentProps<typeof PersonPicker>> = {}) {
  const onPick = vi.fn();
  render(<PersonPicker id="persona" label="Colaborador" members={members} onPick={onPick} {...props} />);
  return { onPick, input: screen.getByRole("combobox", { name: /colaborador/i }) };
}

describe("PersonPicker", () => {
  it("filtra por nombre, correo o rol sin distinguir acentos", async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.click(input);
    expect(screen.getAllByRole("option")).toHaveLength(3);

    await user.type(input, "lucia");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("Lucía Paredes");

    await user.clear(input);
    await user.type(input, "salas@vitalsy");
    expect(screen.getByRole("option")).toHaveTextContent("Mateo Salas");
  });

  it("avisa cuando nadie coincide", async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.type(input, "zzz");
    expect(screen.getByText(/ninguna persona coincide/i)).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("elige con el teclado: flechas y Enter", async () => {
    const user = userEvent.setup();
    const { input, onPick } = setup();

    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);

    await user.keyboard("{Enter}");
    expect(onPick).toHaveBeenCalledWith(members[1]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("elige con el ratón sin perder el foco del campo", async () => {
    const user = userEvent.setup();
    const { input, onPick } = setup();
    await user.click(input);
    await user.click(screen.getByRole("option", { name: /rosa quispe/i }));
    expect(onPick).toHaveBeenCalledWith(members[2]);
  });

  it("cada opción responde a Enter y Espacio por si recibe el foco", async () => {
    const user = userEvent.setup();
    const { input, onPick } = setup();
    await user.click(input);
    fireEvent.keyDown(screen.getAllByRole("option")[0], { key: "Enter" });
    expect(onPick).toHaveBeenLastCalledWith(members[0]);

    await user.keyboard("{ArrowDown}");
    fireEvent.keyDown(screen.getAllByRole("option")[2], { key: " " });
    expect(onPick).toHaveBeenLastCalledWith(members[2]);
  });

  it("cierra la lista con Escape y excluye a las personas indicadas", async () => {
    const user = userEvent.setup();
    const { input } = setup({ excludeIds: [1] });
    await user.click(input);
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.queryByRole("option", { name: /lucía/i })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("muestra a la persona elegida y permite cambiarla", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<PersonPicker id="p" label="Retén" members={members} selected={members[0]} onClear={onClear} onPick={vi.fn()} />);
    expect(screen.getByText("Lucía Paredes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cambiar/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
