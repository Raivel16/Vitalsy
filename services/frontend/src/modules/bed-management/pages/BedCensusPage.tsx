import { type FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { BedTile, MetricRow, Panel } from "../../../shared/ui/clinical";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";

type Bed = {
  id: number;
  ward: string | null;
  room: string;
  bedCode: string;
  isolation: boolean;
  status: string;
};

type WardCensus = {
  code: string;
  name: string;
  available: number;
  occupied: number;
  cleaning: number;
  beds: Bed[];
};

type BedRequest = {
  id: number;
  patientName: string | null;
  priority: string;
  status: string;
  isolation: boolean;
};

export function BedCensusPage() {
  const { user } = useAuth();
  const role = user?.role ?? "gestion_camas";
  const [wards, setWards] = useState<WardCensus[]>([]);
  const [requests, setRequests] = useState<BedRequest[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ source: "urgencias", priority: "media", specialty: "medicina_interna", gender: "female", isolation: "no", patientName: "" });

  const load = useCallback(async () => {
    try {
      const census = await api<{ wards: WardCensus[] }>("/api/v1/beds/census");
      setWards(census.wards);
      if (role === "gestion_camas" || role === "enfermera_supervisora") {
        const waiting = await api<{ requests: BedRequest[] }>("/api/v1/beds/requests");
        setRequests(waiting.requests);
      }
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo cargar el censo de camas."));
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/v1/beds/requests", {
        method: "POST",
        body: JSON.stringify({
          source: form.source,
          priority: form.priority,
          specialty: form.specialty,
          gender: form.gender,
          isolation: form.isolation === "si",
          patientName: form.patientName,
        }),
      });
      setNotice("Solicitud de cama registrada.");
      await load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar la solicitud."));
    }
  }

  async function assign(requestId: number, bedId: number) {
    try {
      await api(`/api/v1/beds/requests/${requestId}/assign`, {
        method: "POST",
        body: JSON.stringify({ bedId }),
      });
      setNotice("Lecho asignado. La supervisora queda notificada en el censo.");
      await load();
    } catch (caught) {
      setError(errorText(caught, "No se pudo asignar el lecho."));
    }
  }

  if (loading) return <LoadingState label="Cargando censo de camas…" />;

  return (
    <Sheet kicker="Gestión de camas" title="Censo hospitalario" wide>
      <p className="lead">Disponibilidad de lechos por servicio, lista de espera y asignación.</p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      <div className="bed-board">
        {wards.map((ward) => (
          <section key={ward.code} className="bed-ward">
            <h3>{ward.name}</h3>
            <MetricRow items={[
              { label: "Disponibles", value: ward.available },
              { label: "Ocupadas", value: ward.occupied },
              { label: "Limpieza", value: ward.cleaning },
            ]} />
            <div className="bed-grid">
              {ward.beds.map((bed) => (
                <BedTile key={bed.id} room={bed.room} code={bed.bedCode} status={bed.status} isolation={bed.isolation} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {role === "gestion_camas" ? (
        <Panel title="Nueva solicitud">
          <form className="stack" onSubmit={(event) => void createRequest(event)}>
            <div className="form-grid">
              <SelectField id="source" label="Origen" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
                <option value="urgencias">Urgencias</option>
                <option value="quirofano">Quirófano</option>
                <option value="admisiones">Admisiones</option>
              </SelectField>
              <SelectField id="priority" label="Prioridad" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </SelectField>
              <TextField id="patientName" label="Paciente" value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} />
              <SelectField id="isolation" label="¿Aislamiento?" value={form.isolation} onChange={(event) => setForm({ ...form, isolation: event.target.value })}>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </SelectField>
            </div>
            <Button type="submit">Registrar solicitud</Button>
          </form>
        </Panel>
      ) : null}
      {requests.length > 0 ? (
        <Panel title="Solicitudes">
          <ul className="work-queue">
            {requests.map((request) => (
              <li key={request.id} className="work-card">
                <p><strong>{request.patientName ?? `Solicitud ${request.id}`}</strong> · {request.priority} · {request.status}</p>
                {role === "gestion_camas" && request.status !== "asignada" && wards[0]?.beds.find((bed) => bed.status === "available") ? (
                  <Button type="button" onClick={() => void assign(request.id, wards.flatMap((ward) => ward.beds).find((bed) => bed.status === "available")!.id)}>
                    Asignar primer lecho disponible
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </Sheet>
  );
}
