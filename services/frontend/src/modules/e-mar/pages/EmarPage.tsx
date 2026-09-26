import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { BarcodeScanner } from "../../../shared/ui/BarcodeScanner";
import { formatDateTime } from "../../../shared/datetime/format";

type Dose = {
  id: number;
  drugName: string;
  dose: string;
  route: string;
  status: string;
  scheduledAt?: string | null;
  expectedPatientBarcode: string | null;
  expectedDrugBarcode: string;
};

export function EmarPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [hasActivePrescription, setHasActivePrescription] = useState(true);
  const [shiftLabel, setShiftLabel] = useState("");
  const [selected, setSelected] = useState<Dose | null>(null);
  const [patientBarcode, setPatientBarcode] = useState("");
  const [drugBarcode, setDrugBarcode] = useState("");
  const [sign, setSign] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    if (!ingreso) return;
    api<{ doses: Dose[]; hasActivePrescription?: boolean; shiftStart?: string; shiftEnd?: string }>(
      `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/emar`,
    )
      .then((data) => {
        setDoses(data.doses);
        setHasActivePrescription(data.hasActivePrescription ?? true);
        if (data.shiftStart && data.shiftEnd) {
          setShiftLabel(`${formatDateTime(data.shiftStart)} – ${formatDateTime(data.shiftEnd)}`);
        }
      })
      .catch((caught) => setError(errorText(caught, "No se pudo cargar el e-MAR.")));
  }

  useEffect(() => {
    load();
  }, [ingreso]);

  async function onAdminister(event: FormEvent) {
    event.preventDefault();
    if (!ingreso || !selected) return;
    setError("");
    setNotice("");
    try {
      await api(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/emar/${selected.id}/administer`, {
        method: "POST",
        body: JSON.stringify({ patientBarcode, drugBarcode, sign }),
      });
      setNotice("Dosis administrada y firmada.");
      setSelected(null);
      setPatientBarcode("");
      setDrugBarcode("");
      load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo administrar la dosis."));
    }
  }

  if (!ingreso) {
    return <EmptyEncounter message="Abra un paciente hospitalizado para consultar el e-MAR." />;
  }

  return (
    <Sheet kicker="Atención en piso" title="e-MAR del turno" wide>
      <p className="lead">
        Dosis programadas
        {encounter ? ` para ${encounter.patientName}` : ""}
        {shiftLabel ? ` · Turno ${shiftLabel}` : ""}. Verifique los cinco correctos antes de firmar.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de administración">{notice}</Feedback> : null}

      {!hasActivePrescription ? (
        <Feedback tone="info">
          No hay prescripción CPOE activa. El médico tratante debe registrar el plan en CPOE.
        </Feedback>
      ) : null}

      {hasActivePrescription && doses.length === 0 ? (
        <Feedback tone="info">No hay dosis programadas en el turno vigente para el plan activo.</Feedback>
      ) : null}

      {doses.length > 0 ? (
        <div className="table-wrap" aria-label="Dosis del turno">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Medicamento</th>
                <th>Vía</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {doses.map((dose) => (
                <tr key={dose.id}>
                  <td>{formatDateTime(dose.scheduledAt)}</td>
                  <td>{dose.drugName} {dose.dose}</td>
                  <td>{dose.route}</td>
                  <td>{dose.status}</td>
                  <td>
                    {dose.status === "pendiente" ? (
                      <Button
                        type="button"
                        variant="quiet"
                        onClick={() => {
                          setSelected(dose);
                          setPatientBarcode("");
                          setDrugBarcode("");
                        }}
                      >
                        Administrar
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? (
        <form className="stack" onSubmit={onAdminister} noValidate>
          <h3>Verificar {selected.drugName}</h3>
          <p className="hint">
            Código esperado del medicamento: <code>{selected.expectedDrugBarcode}</code>
            {selected.expectedPatientBarcode ? (
              <> · Brazalete paciente: <code>{selected.expectedPatientBarcode}</code></>
            ) : null}
          </p>
          <TextField id="patient-bc" label="Código paciente (brazalete)" value={patientBarcode} onChange={(e) => setPatientBarcode(e.target.value)} required />
          <BarcodeScanner label="Escanear brazalete" onScan={(code) => setPatientBarcode(code)} />
          <TextField id="drug-bc" label="Código medicamento" value={drugBarcode} onChange={(e) => setDrugBarcode(e.target.value)} required />
          <BarcodeScanner label="Escanear medicamento" onScan={(code) => setDrugBarcode(code)} />
          <label className="check">
            <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} />
            Firmar digitalmente la dosis
          </label>
          <FormActions>
            <Button type="submit">Confirmar administración</Button>
          </FormActions>
        </form>
      ) : null}
    </Sheet>
  );
}
