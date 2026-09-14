import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../../app/api";
import { CheckField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";

type Orders = { statusLabel: string; items: string[] };

export function MedicalOrdersPage() {
  const [orders, setOrders] = useState<Orders | null>(null);
  const [statusLabel, setStatusLabel] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [credential, setCredential] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<{ orders: Orders }>("/api/v1/hospital-admission/medical-orders/ENC-0001")
      .then((data) => {
        if (!active) return;
        setOrders(data.orders);
        setStatusLabel(data.orders.statusLabel);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "No se pudieron cargar las indicaciones.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
        "/api/v1/hospital-admission/medical-orders/ENC-0001/sign",
        { method: "POST", body: JSON.stringify({ physicianName, credential, confirmed }) },
      );
      setStatusLabel(data.signature.status === "firmado" ? "Firmado" : data.signature.status);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo firmar.");
    }
  }

  if (loading) return <p role="status">Cargando indicaciones basales.</p>;
  if (!orders) return <Feedback tone="error">{error || "Indicaciones no disponibles."}</Feedback>;

  return (
    <Sheet kicker="Médico" title="Indicaciones médicas basales">
      <p className="lead">Revise la valoración de ingreso y firme las indicaciones basales.</p>
      <p role="status" aria-label="Estado del documento">{statusLabel}</p>
      <ul>{orders.items.map((item) => <li key={item}>{item}</li>)}</ul>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField id="physician-name" label="Nombre del médico" value={physicianName} onChange={(event) => setPhysicianName(event.target.value)} error={errors.physicianName} />
        <TextField id="credential" label="Colegiatura" value={credential} onChange={(event) => setCredential(event.target.value)} error={errors.credential} />
        <CheckField id="sign-confirmed" label="Confirmo la firma de las indicaciones" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} error={errors.confirmed} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <button className="button" type="submit">Firmar indicaciones</button>
      </form>
    </Sheet>
  );
}
