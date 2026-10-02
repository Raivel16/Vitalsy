import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { BedTile, MetricRow, Panel, StatTile, StatusMark } from "../../../shared/ui/clinical";
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
  const [wardFilter, setWardFilter] = useState("todos");
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

  const totals = useMemo(() => {
    const available = wards.reduce((sum, ward) => sum + ward.available, 0);
    const occupied = wards.reduce((sum, ward) => sum + ward.occupied, 0);
    const cleaning = wards.reduce((sum, ward) => sum + ward.cleaning, 0);
    const isolation = wards.reduce(
      (sum, ward) => sum + ward.beds.filter((bed) => bed.isolation).length,
      0,
    );
    return {
      capacity: available + occupied + cleaning,
      available,
      occupied,
      cleaning,
      isolation,
    };
  }, [wards]);

  const visibleWards = wardFilter === "todos" ? wards : wards.filter((ward) => ward.code === wardFilter);
  const firstAvailable = wards.flatMap((ward) => ward.beds).find((bed) => bed.status === "available");
  const share = (part: number) => (totals.capacity === 0 ? 0 : Math.round((part / totals.capacity) * 100));

  if (loading) return <LoadingState label="Cargando censo de camas…" />;

  return (
    <Sheet kicker="Gestión de camas" title="Censo hospitalario" wide clinic="board" className="floor-care ops-board">
      <p className="lead">Disponibilidad de lechos por servicio, lista de espera y asignación.</p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}

      <div className="stat-grid" aria-label="Capacidad hospitalaria">
        <div className="stat-cell">
          <StatTile label="Capacidad total" value={totals.capacity} hint="lechos" />
          <div className="stat-share" aria-hidden><span style={{ width: "100%" }} /></div>
        </div>
        <div className="stat-cell">
          <StatTile label="Disponibles" value={totals.available} hint="libres" tone="success" />
          <div className="stat-share" aria-hidden><span style={{ width: `${share(totals.available)}%` }} /></div>
        </div>
        <div className="stat-cell">
          <StatTile label="Ocupadas" value={totals.occupied} hint="activas" />
          <div className="stat-share" aria-hidden><span style={{ width: `${share(totals.occupied)}%` }} /></div>
        </div>
        <div className="stat-cell">
          <StatTile label="Limpieza" value={totals.cleaning} hint="en proceso" tone="info" />
          <div className="stat-share" aria-hidden><span style={{ width: `${share(totals.cleaning)}%` }} /></div>
        </div>
        <div className="stat-cell">
          <StatTile label="Aislamiento" value={totals.isolation} hint="críticos" tone="warning" />
          <div className="stat-share" aria-hidden><span style={{ width: `${share(totals.isolation)}%` }} /></div>
        </div>
      </div>

      <div className="filter-pills" role="group" aria-label="Filtrar pabellones">
        <button type="button" className={`filter-pill${wardFilter === "todos" ? " is-active" : ""}`} aria-pressed={wardFilter === "todos"} onClick={() => setWardFilter("todos")}>
          Todos los pabellones
        </button>
        {wards.map((ward) => (
          <button
            key={ward.code}
            type="button"
            className={`filter-pill${wardFilter === ward.code ? " is-active" : ""}`}
            aria-pressed={wardFilter === ward.code}
            onClick={() => setWardFilter(ward.code)}
          >
            {ward.name}
          </button>
        ))}
      </div>

      <div className="chip-row bed-legend" aria-label="Leyenda de estados">
        <StatusMark tone="available" />
        <StatusMark tone="occupied" />
        <StatusMark tone="cleaning" />
        <StatusMark tone="isolation" />
      </div>

      <div className="bed-layout">
        <div className="bed-board">
          {visibleWards.map((ward) => (
            <section key={ward.code} className="bed-ward">
              <h3>{ward.name}</h3>
              <MetricRow items={[
                { label: "Disponibles", value: ward.available },
                { label: "Ocupadas", value: ward.occupied },
                { label: "Limpieza", value: ward.cleaning },
              ]} />
              <div className="room-grid">
                {Array.from(ward.beds.reduce((rooms, bed) => {
                  const group = rooms.get(bed.room) ?? [];
                  group.push(bed);
                  rooms.set(bed.room, group);
                  return rooms;
                }, new Map<string, Bed[]>())).map(([room, beds]) => (
                  <section key={room} className="room-card" aria-label={`Habitación ${room}`}>
                    <h4>Habitación {room}</h4>
                    <div className="bed-grid">
                      {beds.map((bed) => (
                        <BedTile key={bed.id} room={bed.room} code={bed.bedCode} status={bed.status} isolation={bed.isolation} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="bed-side">
          {requests.length > 0 ? (
            <Panel title="Lista de espera" aside={`${requests.length} solicitudes`}>
              <ul className="work-queue">
                {requests.map((request) => (
                  <li key={request.id} className="work-card">
                    <p><strong>{request.patientName ?? `Solicitud ${request.id}`}</strong> · {request.priority} · {request.status}</p>
                    {request.isolation ? <StatusMark tone="isolation" /> : null}
                    {role === "gestion_camas" && request.status !== "asignada" && firstAvailable ? (
                      <Button type="button" onClick={() => void assign(request.id, firstAvailable.id)}>
                        Asignar primer lecho disponible
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {role === "gestion_camas" ? (
            <Panel title="Nueva solicitud de cama">
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
        </aside>
      </div>
    </Sheet>
  );
}
