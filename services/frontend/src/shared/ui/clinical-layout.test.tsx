import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  BedTile,
  MetricRow,
  Panel,
  ProgressTrack,
  QueueRow,
  StatTile,
  StatusMark,
  StatusPill,
  bedTone,
} from "./clinical";

describe("piezas de layout clínico", () => {
  it("muestra una métrica con su valor", () => {
    render(<MetricRow items={[{ label: "Disponibles", value: 4 }]} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Disponibles")).toBeInTheDocument();
  });

  it("dibuja un tile de métrica con etiqueta y valor", () => {
    render(<StatTile label="Alertas abiertas" value={2} hint="activas" tone="danger" />);
    expect(screen.getByText("Alertas abiertas")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("activas")).toBeInTheDocument();
  });

  it("renderiza una fila de cola con chip y acción", () => {
    render(
      <MemoryRouter>
        <ul>
          <QueueRow
            name="Ana María Quispe"
            meta="Habitación 312-B · Medicina Interna"
            tone="success"
            chip="NEWS2 0"
            action={{ to: "/atencion/emar", label: "Continuar e-MAR" }}
          />
        </ul>
      </MemoryRouter>,
    );
    expect(screen.getByText("Ana María Quispe")).toBeInTheDocument();
    expect(screen.getByText(/312-B/)).toBeInTheDocument();
    expect(screen.getByText("NEWS2 0")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continuar e-mar/i })).toHaveAttribute("href", "/atencion/emar");
  });

  it("muestra pastillas de estado y avance", () => {
    render(
      <>
        <StatusPill tone="success">Hospitalizado</StatusPill>
        <ProgressTrack done={2} total={5} />
      </>,
    );
    expect(screen.getByText("Hospitalizado")).toHaveClass("status-pill", "pill-success");
    expect(screen.getByText(/2 de 5/i)).toBeInTheDocument();
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

  it("agrupa contenido clínico en un panel con título", () => {
    render(<Panel title="Cola de trabajo">Pendientes del turno</Panel>);
    expect(screen.getByRole("heading", { name: /cola de trabajo/i })).toBeInTheDocument();
    expect(screen.getByText("Pendientes del turno")).toBeInTheDocument();
  });
});
