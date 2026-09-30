import { render, screen } from "@testing-library/react";
import { BedTile, MetricRow, StatusMark, bedTone } from "./clinical";

describe("piezas de layout clínico", () => {
  it("muestra una métrica con su valor", () => {
    render(<MetricRow items={[{ label: "Disponibles", value: 4 }]} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Disponibles")).toBeInTheDocument();
  });

  it("etiqueta el estado de cama sin usar el color de marca como riesgo", () => {
    render(<StatusMark tone="occupied" />);
    const mark = screen.getByText("Ocupada");
    expect(mark).toHaveClass("status-mark", "status-occupied");
  });

  it("dibuja el lecho con habitación, código y aislamiento", () => {
    render(<BedTile room="301" code="A" status="occupied" isolation />);
    expect(screen.getByText("301-A")).toBeInTheDocument();
    expect(screen.getByText("Aislamiento")).toBeInTheDocument();
  });

  it("traduce los estados del censo a la ficha visual", () => {
    expect(bedTone("available")).toBe("available");
    expect(bedTone("cleaning")).toBe("cleaning");
    expect(bedTone("otro")).toBe("neutral");
  });
});
