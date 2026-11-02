import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";
import { formatDateTime } from "../../shared/datetime/format";
import { toDateTimeInput } from "./domain/schedule";

const inOneHour = () => toDateTimeInput(new Date(Date.now() + 3_600_000).toISOString());

const encounter = {
  encounterId: "ENC-HOSP-0001",
  orderNumber: "OI-2026-CPOE-1",
  transferOrderNumber: null,
  patientName: "Paciente Hospitalizado Demo",
  documentType: "DNI",
  documentNumber: "99887766",
  originService: "Medicina",
  coverage: { payer: "Essalud", status: "aprobada", plan: "Regular" },
  location: { room: "401", bed: "A", service: "Medicina" },
  wristbandCode: "BRZ-CPOE-0001",
  recordId: "EXP-CPOE-0001",
  subprocess: "2.1",
  subprocessLabel: "Visita médica",
  currentStep: "cerrado",
  currentStepLabel: "Ingreso cerrado",
  nextRole: null,
  statusLabel: "Hospitalizado",
  deliverables: [],
  progress: [],
};

describe("prescripción CPOE (RF-25)", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("crea plan inicial sin opción de reemplazar completo", async () => {
    const user = userEvent.setup();
    let hasActive = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
        if (url.includes("/prescriptions/active") && (!init || !init.method || init.method === "GET")) {
          return jsonResponse(200, {
            prescription: hasActive
              ? {
                  id: 1,
                  status: "activo",
                  signedAt: "2026-09-21T12:00:00+00:00",
                  items: [{ id: 1, drugName: "Paracetamol", dose: "1 g", route: "VO", frequency: "cada 8 horas", drugBarcode: "DRUG-PARACETAMOL-1G" }],
                }
              : null,
          });
        }
        if (url.includes("/kardex") && (!init || !init.method || init.method === "GET")) {
          return jsonResponse(200, {
            medications: hasActive ? ["Paracetamol 1 g cada 8 horas"] : [],
            source: "cpoe",
          });
        }
        if (url.includes("/prescriptions") && init?.method === "POST" && !url.includes("/items")) {
          hasActive = true;
          return jsonResponse(201, {
            prescription: {
              id: 1,
              status: "activo",
              signedAt: "2026-09-21T12:00:00+00:00",
              items: [{ id: 1, drugName: "Paracetamol", dose: "1 g", route: "VO", frequency: "cada 8 horas", drugBarcode: "DRUG-PARACETAMOL-1G" }],
            },
            kardex: { medications: ["Paracetamol 1 g cada 8 horas"], source: "cpoe" },
          });
        }
        return jsonResponse(404, { message: "No se encontró lo solicitado." });
      }),
    );

    renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");
    expect(await screen.findByRole("heading", { name: /prescripción electrónica/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /reemplazar plan completo/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /nueva prescripción/i })).toBeInTheDocument();

    await user.click(screen.getByLabelText(/^medicamento$/i));
    await user.paste("Paracetamol");
    await user.type(screen.getByLabelText(/^dosis$/i), "1 g");
    await user.type(screen.getByLabelText(/^vía$/i), "VO");
    await user.selectOptions(screen.getByLabelText(/^frecuencia$/i), "cada 8 horas");
    fireEvent.change(screen.getByLabelText(/^primera dosis$/i), { target: { value: inOneHour() } });
    await user.click(screen.getByRole("button", { name: /registrar cpoe/i }));

    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/e-mar/i);
    expect(screen.getByRole("region", { name: /prescripción activa/i })).toHaveTextContent(/paracetamol/i);
    expect(screen.queryByRole("heading", { name: /reemplazar plan completo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /nueva prescripción/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar al plan/i })).toBeInTheDocument();
  });

  describe("horario de la indicación (RF-25)", () => {
    const signedAt = "2026-09-21T12:00:00+00:00";
    const plan = (frequency: string, firstDoseAt: string | null) => ({
      id: 1,
      status: "activo",
      signedAt,
      items: [{ id: 1, drugName: "Paracetamol", dose: "1 g", route: "VO", frequency, firstDoseAt, drugBarcode: "DRUG-PARACETAMOL-1G" }],
    });

    function stubServer(prescription: unknown) {
      const writes: { method: string; body: Record<string, unknown> }[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo, init?: RequestInit) => {
          const url = String(input);
          if (url.includes("/hospital-admission/encounters/")) return jsonResponse(200, { encounter });
          if (init?.method && init.method !== "GET") {
            writes.push({ method: init.method, body: JSON.parse(String(init.body)) });
            return jsonResponse(200, { prescription: plan("cada 8 horas", signedAt), kardex: { medications: [], source: "cpoe" } });
          }
          if (url.includes("/prescriptions/active")) return jsonResponse(200, { prescription });
          if (url.includes("/kardex")) return jsonResponse(200, { medications: [], source: "cpoe" });
          return jsonResponse(404, { message: "No se encontró lo solicitado." });
        }),
      );
      return writes;
    }

    async function fillDrug(user: ReturnType<typeof userEvent.setup>) {
      await user.type(await screen.findByLabelText(/^medicamento$/i), "Paracetamol");
      await user.type(screen.getByLabelText(/^dosis$/i), "1 g");
      await user.type(screen.getByLabelText(/^vía$/i), "VO");
    }

    it("ofrece solo las frecuencias de la lista", async () => {
      stubServer(null);
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");

      const frequency = await screen.findByRole("combobox", { name: /^frecuencia$/i });
      const options = within(frequency).getAllByRole("option").map((option) => option.textContent);

      expect(options).toEqual(["Seleccione", "cada 4 horas", "cada 6 horas", "cada 8 horas", "cada 12 horas", "cada 24 horas", "dosis única"]);
    });

    it("envía la frecuencia y la primera dosis como instante", async () => {
      const writes = stubServer(null);
      const user = userEvent.setup();
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");
      await fillDrug(user);
      await user.selectOptions(screen.getByLabelText(/^frecuencia$/i), "cada 12 horas");
      const firstDose = inOneHour();
      fireEvent.change(screen.getByLabelText(/^primera dosis$/i), { target: { value: firstDose } });

      await user.click(screen.getByRole("button", { name: /registrar cpoe/i }));

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.items).toEqual([
        { drugName: "Paracetamol", dose: "1 g", route: "VO", frequency: "cada 12 horas", firstDoseAt: new Date(firstDose).toISOString() },
      ]);
    });

    it("exige la primera dosis antes de enviar", async () => {
      const writes = stubServer(null);
      const user = userEvent.setup();
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");
      await fillDrug(user);
      await user.selectOptions(screen.getByLabelText(/^frecuencia$/i), "cada 8 horas");

      await user.click(screen.getByRole("button", { name: /registrar cpoe/i }));

      expect(await screen.findByText(/primera dosis en cada línea/i)).toBeInTheDocument();
      expect(writes).toHaveLength(0);
    });

    it("rechaza una primera dosis en el pasado antes de enviar", async () => {
      const writes = stubServer(null);
      const user = userEvent.setup();
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");
      await fillDrug(user);
      await user.selectOptions(screen.getByLabelText(/^frecuencia$/i), "cada 8 horas");
      fireEvent.change(screen.getByLabelText(/^primera dosis$/i), { target: { value: "2020-01-01T08:00" } });

      await user.click(screen.getByRole("button", { name: /registrar cpoe/i }));

      expect(await screen.findByText(/no puede estar en el pasado/i)).toBeInTheDocument();
      expect(writes).toHaveLength(0);
    });

    it("avisa al médico de los medicamentos sin horario", async () => {
      stubServer({ ...plan("BID", signedAt), items: [{ ...plan("BID", signedAt).items[0], needsSchedule: true }] });
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");

      expect(await screen.findByRole("alert")).toHaveTextContent(/paracetamol.*sin horario/i);
    });

    it("muestra la primera dosis en el plan activo", async () => {
      stubServer(plan("cada 8 horas", signedAt));
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");

      const region = await screen.findByRole("region", { name: /prescripción activa/i });

      expect(await within(region).findByRole("columnheader", { name: /primera dosis/i })).toBeInTheDocument();
      expect(within(region).getByRole("row", { name: /paracetamol/i })).toHaveTextContent(formatDateTime(signedAt));
    });

    it("permite corregir la dosis aunque la primera dosis ya pasó", async () => {
      const writes = stubServer(plan("cada 8 horas", signedAt));
      const user = userEvent.setup();
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");

      await user.click(await screen.findByRole("button", { name: /^editar$/i }));
      await user.click(screen.getByRole("button", { name: /^guardar$/i }));

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(writes[0].body.firstDoseAt).toBe(new Date(signedAt).toISOString());
    });

    it("no deja cambiar el horario a una hora pasada", async () => {
      const writes = stubServer(plan("cada 8 horas", signedAt));
      const user = userEvent.setup();
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");

      await user.click(await screen.findByRole("button", { name: /^editar$/i }));
      await user.selectOptions(within(screen.getByRole("form", { name: /editar medicamento/i })).getByRole("combobox", { name: /^frecuencia$/i }), "cada 12 horas");
      await user.click(screen.getByRole("button", { name: /^guardar$/i }));

      expect(await screen.findByText(/no puede estar en el pasado/i)).toBeInTheDocument();
      expect(writes).toHaveLength(0);
    });

    it("pide elegir de la lista al editar una indicación con frecuencia libre", async () => {
      const writes = stubServer(plan("c/12h", null));
      const user = userEvent.setup();
      renderApp("/atencion/cpoe?ingreso=ENC-HOSP-0001");

      await user.click(await screen.findByRole("button", { name: /^editar$/i }));

      expect(within(screen.getByRole("form", { name: /editar medicamento/i })).getByRole("combobox", { name: /^frecuencia$/i })).toHaveValue("");
      await user.click(screen.getByRole("button", { name: /^guardar$/i }));

      expect(await screen.findByText(/complete todos los campos/i)).toBeInTheDocument();
      expect(writes).toHaveLength(0);
    });
  });
});
