import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { CheckField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { FormActions } from "../../../shared/ui/FormActions";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";

type Orders = { statusLabel: string; items: string[] };

export function MedicalOrdersPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const role = user?.role ?? "medico_residente";
  const [orders, setOrders] = useState<Orders | null>(null);
  const [statusLabel, setStatusLabel] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [credential, setCredential] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(ingreso));
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (!encounter) {
      if (!ingreso) setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    api<{ orders: Orders }>(`/api/v1/hospital-admission/medical-orders/${encodeURIComponent(encounter.encounterId)}`)
      .then((data) => {
        if (!active) return;
        setOrders(data.orders);
        setStatusLabel(data.orders.statusLabel);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorText(caught, "No se pudieron cargar las indicaciones."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [encounter, ingreso]);

  if (!encounter) {
    return (
      <Sheet kicker="Médico" title="Indicaciones médicas basales">
        <EmptyEncounter message="Abra un paciente desde el censo para firmar las indicaciones." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!physicianName.trim()) next.physicianName = "El nombre del médico es obligatorio.";
    if (!credential.trim()) next.credential = "La colegiatura es obligatoria.";
    if (!confirmed) next.confirmed = "Debe confirmar la firma de las indicaciones.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const data = await api<{ signature: { status: string } }>(
        `/api/v1/hospital-admission/medical-orders/${encodeURIComponent(activeEncounter.encounterId)}/sign`,
        { method: "POST", body: JSON.stringify({ physicianName, credential, confirmed }) },
      );
      setStatusLabel(data.signature.status === "firmado" ? "Firmado" : data.signature.status);
      setError("");
      if (activeEncounter.currentStep === "indicaciones") {
        const updated = await advanceEncounter(activeEncounter.encounterId, "indicaciones");
        applyEncounter(updated);
      }
      setAdvanced(true);
    } catch (caught) {
      setError(errorText(caught, "No se pudo firmar."));
    }
  }

  if (loading) return <LoadingState label="Cargando indicaciones…" />;
  if (!orders) return <Feedback tone="error">{error || "Indicaciones no disponibles."}</Feedback>;

  return (
    <Sheet kicker="Médico" title="Indicaciones médicas basales">
      <p className="lead">Revise la valoración de {activeEncounter.patientName} y firme las indicaciones basales.</p>
      <p role="status" aria-label="Estado del documento">{statusLabel}</p>
      <ul>{orders.items.map((item) => <li key={item}>{item}</li>)}</ul>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="physician-name" label="Nombre del médico" value={physicianName} onChange={(event) => setPhysicianName(event.target.value)} error={errors.physicianName} />
        <TextField id="credential" label="Colegiatura" value={credential} onChange={(event) => setCredential(event.target.value)} error={errors.credential} />
        <CheckField id="sign-confirmed" label="Confirmo la firma de las indicaciones" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} error={errors.confirmed} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <FormActions align="center">
          <Button type="submit">Firmar indicaciones</Button>
        </FormActions>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="indicaciones" canContinue={advanced} />
    </Sheet>
  );
}
