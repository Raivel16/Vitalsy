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

type Dose = {
  id: number;
  drugName: string;
  dose: string;
  route: string;
  status: string;
  expectedPatientBarcode: string | null;
  expectedDrugBarcode: string;
};

export function EmarPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [selected, setSelected] = useState<Dose | null>(null);
  const [patientBarcode, setPatientBarcode] = useState("");
  const [drugBarcode, setDrugBarcode] = useState("");
  const [sign, setSign] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    if (!ingreso) return;
    api<{ doses: Dose[] }>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/emar`)
      .then((data) => setDoses(data.doses))
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
        {encounter ? ` para ${encounter.patientName}` : ""}. Verifique los cinco correctos antes de firmar.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado de administración">{notice}</Feedback> : null}
      <ul className="stack" aria-label="Dosis del turno">
        {doses.length === 0 ? <Feedback tone="info">No hay dosis en el turno vigente.</Feedback> : null}
        {doses.map((dose) => (
          <li key={dose.id}>
            <strong>{dose.drugName} {dose.dose}</strong> · {dose.route} · {dose.status}
            {dose.status === "pendiente" ? (
              <Button type="button" variant="quiet" onClick={() => {
                setSelected(dose);
                setPatientBarcode(dose.expectedPatientBarcode ?? "");
                setDrugBarcode(dose.expectedDrugBarcode);
              }}>Administrar</Button>
            ) : null}
          </li>
        ))}
      </ul>
      {selected ? (
        <form className="stack" onSubmit={onAdminister} noValidate>
          <h3>Verificar {selected.drugName}</h3>
          <TextField id="patient-bc" label="Código paciente (brazalete)" value={patientBarcode} onChange={(e) => setPatientBarcode(e.target.value)} required />
          <TextField id="drug-bc" label="Código medicamento" value={drugBarcode} onChange={(e) => setDrugBarcode(e.target.value)} required />
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
