import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { ProgressStep } from "../domain/encounter";
import { AdmissionStepper } from "./AdmissionStepper";

const steps: ProgressStep[] = [
  { id: "orden", label: "Consultar orden de internamiento", state: "done" },
  { id: "filiacion", label: "Validar filiación", state: "current" },
  { id: "cobertura", label: "Validar cobertura", state: "pending" },
  { id: "traslado", label: "Consultar orden de traslado", state: "pending" },
];

describe("AdmissionStepper", () => {
  it("permite regresar a pasos del rol ya alcanzados y bloquea el resto", () => {
    render(
      <MemoryRouter>
        <AdmissionStepper steps={steps} role="admision" encounterId="ENC-0001" currentStep="filiacion" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /consultar orden de internamiento/i })).toHaveAttribute(
      "href",
      "/admision/orden?ingreso=ENC-0001",
    );
    expect(screen.getByRole("link", { name: /validar filiación/i })).toHaveAttribute(
      "href",
      "/admision/filiacion?ingreso=ENC-0001",
    );
    expect(screen.queryByRole("link", { name: /validar cobertura/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /consultar orden de traslado/i })).not.toBeInTheDocument();
  });

  it("no ofrece enlaces de admisión al rol celador", () => {
    render(
      <MemoryRouter>
        <AdmissionStepper
          steps={[
            { id: "traslado", label: "Consultar orden de traslado", state: "current" },
            { id: "identidad", label: "Verificar identidad", state: "pending" },
            { id: "orden", label: "Consultar orden de internamiento", state: "done" },
          ]}
          role="celador"
          encounterId="ENC-0001"
          currentStep="traslado"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /consultar orden de traslado/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /consultar orden de internamiento/i })).not.toBeInTheDocument();
  });
});
