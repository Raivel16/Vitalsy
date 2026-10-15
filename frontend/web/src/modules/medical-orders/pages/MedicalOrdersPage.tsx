import { type Dispatch, type SetStateAction, type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { CheckField, TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { createRowKeys } from "../../../shared/list/rowKeys";

type OrderItem = { title: string; detail: string; category: string };

type HomeMedication = { name?: string; dose?: string; route?: string; frequency?: string };

type Orders = {
  status?: string;
  statusLabel: string;
  items: Array<OrderItem | string>;
  chiefComplaint?: string | null;
  allergies?: string[];
  history?: string | null;
  vitals?: { summary?: string | null; news2Label?: string | null } | null;
  reconciliation?: {
    medications?: HomeMedication[];
    noHomeMedications?: boolean;
    notes?: string | null;
    alerts?: string[];
  } | null;
  risks?: { fallRisk?: string | null; pressureRisk?: string | null } | null;
};

function asItems(raw: Array<OrderItem | string> | undefined): OrderItem[] {
  return (raw ?? []).map((item) => (
    typeof item === "string"
      ? { title: item, detail: "", category: "" }
      : { title: item.title ?? "", detail: item.detail ?? "", category: item.category ?? "" }
  ));
}

function filledItems(items: OrderItem[]) {
  return items.filter((item) => item.title.trim());
}

function signatureErrors({
  ready,
  physicianName,
  credential,
  confirmed,
}: Readonly<{ ready: OrderItem[]; physicianName: string; credential: string; confirmed: boolean }>): Record<string, string> {
  const next: Record<string, string> = {};
  if (ready.length === 0) next.items = "Debe registrar al menos una indicación.";
  if (!physicianName.trim()) next.physicianName = "El nombre del médico es obligatorio.";
  if (!credential.trim()) next.credential = "La colegiatura es obligatoria.";
  if (!confirmed) next.confirmed = "Debe confirmar la firma de las indicaciones.";
  return next;
}

function NursingReview({ orders }: Readonly<{ orders: Orders }>) {
  const allergies = orders.allergies ?? [];
  const medications = (orders.reconciliation?.medications ?? []).filter((item) => item.name?.trim());
  const interactionAlerts = orders.reconciliation?.alerts ?? [];
  const history = orders.history?.trim() ?? "";
  const vitalsSummary = orders.vitals?.summary?.trim() ?? "";
  const news2Label = orders.vitals?.news2Label?.trim() ?? "";
  const notes = orders.reconciliation?.notes?.trim() ?? "";
  const fallRisk = orders.risks?.fallRisk?.trim() ?? "";
  const pressureRisk = orders.risks?.pressureRisk?.trim() ?? "";

  return (
    <section className="orders-nursing-review" aria-label="Revisión de enfermería">
      <h3>Revisión de enfermería</h3>
      <div className="orders-snapshot">
        <div>
          <span>Motivo de consulta</span>
          <strong>{orders.chiefComplaint?.trim() || "Sin valoración registrada"}</strong>
        </div>
        <div className={allergies.length > 0 ? "orders-allergies" : undefined}>
          <span>
            <IconAlertTriangle size={16} aria-hidden /> Alergias confirmadas
          </span>
          <strong>{allergies.length > 0 ? allergies.join(", ") : "Sin alergias registradas"}</strong>
        </div>
        {history ? (
          <div>
            <span>Antecedentes</span>
            <strong>{history}</strong>
          </div>
        ) : null}
        {vitalsSummary || news2Label ? (
          <div>
            <span>Constantes</span>
            {vitalsSummary ? <strong>{vitalsSummary}</strong> : null}
            {news2Label ? <strong>NEWS2 {news2Label}</strong> : null}
          </div>
        ) : null}
        <div>
          <span>Medicación habitual</span>
          {orders.reconciliation?.noHomeMedications ? <strong>Sin medicación habitual</strong> : null}
          {medications.length > 0 ? (
            <ul>
              {medications.map((item) => (
                <li key={`${item.name}-${item.dose}-${item.frequency}`}>
                  {[item.name, item.dose, item.route, item.frequency].filter(Boolean).join(" · ")}
                </li>
              ))}
            </ul>
          ) : null}
          {notes ? <p>{notes}</p> : null}
          {interactionAlerts.length > 0 ? (
            <ul aria-label="Alertas de interacción">
              {interactionAlerts.map((alert) => <li key={alert}>{alert}</li>)}
            </ul>
          ) : null}
        </div>
        {fallRisk ? (
          <div>
            <span>Riesgo de caída</span>
            <strong>{fallRisk}</strong>
          </div>
        ) : null}
        {pressureRisk ? (
          <div>
            <span>Riesgo de úlcera por presión</span>
            <strong>{pressureRisk}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OrdersEditor({
  items,
  rowKeys,
  updateItem,
  setItems,
}: Readonly<{
  items: OrderItem[];
  rowKeys: ReturnType<typeof createRowKeys>;
  updateItem: (index: number, patch: Partial<OrderItem>) => void;
  setItems: Dispatch<SetStateAction<OrderItem[]>>;
}>) {
  return (
    <div className="stack">
      {items.map((item, index) => (
        <div key={rowKeys.keyOf(item)} className="order-edit">
          <TextField
            id={`order-title-${index}`}
            label={`Indicación ${index + 1}`}
            value={item.title}
            onChange={(event) => updateItem(index, { title: event.target.value })}
          />
          <TextField
            id={`order-category-${index}`}
            label="Categoría"
            value={item.category}
            onChange={(event) => updateItem(index, { category: event.target.value })}
          />
          <TextAreaField
            id={`order-detail-${index}`}
            label="Detalle"
            value={item.detail}
            onChange={(event) => updateItem(index, { detail: event.target.value })}
            rows={2}
            wide
          />
          <Button
            type="button"
            variant="quiet"
            onClick={() => setItems((current) => current.filter((_, position) => position !== index))}
          >
            <IconTrash size={16} /> Quitar
          </Button>
        </div>
      ))}
      <Button type="button" variant="quiet" onClick={() => setItems((current) => [...current, { title: "", detail: "", category: "" }])}>
        <IconPlus size={16} /> Agregar indicación
      </Button>
    </div>
  );
}

function OrderCards({ visible }: Readonly<{ visible: OrderItem[] }>) {
  return (
    <ol className="order-cards">
      {visible.map((item, index) => (
        <li key={`${item.title}-${index}`} className="order-card">
          <span className="order-card-num">{index + 1}</span>
          <div>
            <div className="order-card-head">
              <strong>{item.title}</strong>
              {item.category ? <span>{item.category}</span> : null}
            </div>
            {item.detail ? <p>{item.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function OrdersSummary({
  editing,
  items,
  visible,
  rowKeys,
  updateItem,
  setItems,
}: Readonly<{
  editing: boolean;
  items: OrderItem[];
  visible: OrderItem[];
  rowKeys: ReturnType<typeof createRowKeys>;
  updateItem: (index: number, patch: Partial<OrderItem>) => void;
  setItems: Dispatch<SetStateAction<OrderItem[]>>;
}>) {
  return (
    <section className="orders-list" aria-label="Resumen de prescripciones basales">
      <header>
        <h3>Resumen de prescripciones basales</h3>
        <span>{visible.length} {visible.length === 1 ? "ítem activo" : "ítems activos"}</span>
      </header>
      {editing ? <OrdersEditor items={items} rowKeys={rowKeys} updateItem={updateItem} setItems={setItems} /> : null}
      {!editing && visible.length > 0 ? <OrderCards visible={visible} /> : null}
      {!editing && visible.length === 0 ? (
        <p className="empty">No hay prescripciones. Use Editar prescripciones para registrarlas.</p>
      ) : null}
    </section>
  );
}

export function MedicalOrdersPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const role = user?.role ?? "medico_residente";
  const [orders, setOrders] = useState<Orders | null>(null);
  const rowKeys = useMemo(createRowKeys, []);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [statusLabel, setStatusLabel] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [credential, setCredential] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(ingreso));
  const [advanced, setAdvanced] = useState(false);
  const signed = /firmado/i.test(statusLabel);

  useEffect(() => {
    if (user?.name) setPhysicianName((current) => current || user.name);
  }, [user]);

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
        setItems(asItems(data.orders.items));
        setStatusLabel(data.orders.statusLabel);
      })
      .catch((error_: unknown) => {
        if (active) setError(errorText(error_, "No se pudieron cargar las indicaciones."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [encounter?.encounterId, ingreso]);

  if (!encounter) {
    return (
      <Sheet kicker="Médico" title="Indicaciones médicas basales" clinic="file">
        <EmptyEncounter message="Abra un paciente desde el censo para firmar las indicaciones." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;
  const service = activeEncounter.location.service || activeEncounter.originService;
  const visible = filledItems(items);

  function updateItem(index: number, patch: Partial<OrderItem>) {
    setItems((current) => current.map((item, position) => (position === index ? rowKeys.carry(item, { ...item, ...patch }) : item)));
  }

  async function persistDraft(nextItems: OrderItem[]) {
    const data = await api<{ orders: Orders }>(
      `/api/v1/hospital-admission/medical-orders/${encodeURIComponent(activeEncounter.encounterId)}`,
      { method: "PUT", body: JSON.stringify({ items: nextItems }) },
    );
    setOrders(data.orders);
    setItems(asItems(data.orders.items));
    setStatusLabel(data.orders.statusLabel);
  }

  async function toggleEdit() {
    if (signed) return;
    if (editing) {
      try {
        await persistDraft(items);
        setEditing(false);
        setError("");
      } catch (error_) {
        setError(errorText(error_, "No se pudieron guardar las indicaciones."));
      }
      return;
    }
    setEditing(true);
    if (items.length === 0) setItems([{ title: "", detail: "", category: "" }]);
  }

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    const ready = filledItems(items);
    const next = signatureErrors({ ready, physicianName, credential, confirmed });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const data = await api<{ signature: { status: string } }>(
        `/api/v1/hospital-admission/medical-orders/${encodeURIComponent(activeEncounter.encounterId)}/sign`,
        { method: "POST", body: JSON.stringify({ physicianName, credential, confirmed, items: ready }) },
      );
      setStatusLabel(data.signature.status === "firmado" ? "Firmado" : data.signature.status);
      setEditing(false);
      setError("");
      if (activeEncounter.currentStep === "indicaciones") {
        const updated = await advanceEncounter(activeEncounter.encounterId, "indicaciones");
        applyEncounter(updated);
      }
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudo firmar."));
    }
  }

  if (loading) return <LoadingState label="Cargando indicaciones…" />;
  if (!orders) return <Feedback tone="error">{error || "Indicaciones no disponibles."}</Feedback>;

  return (
    <Sheet kicker="Médico · Hospitalización" title="Indicaciones médicas basales" clinic="file">
      <p className="lead">Revisión final y firma electrónica de las prescripciones médicas basales de ingreso al servicio{service ? ` · ${service}` : ""}.</p>
      <output aria-label="Estado del documento">{statusLabel}</output>
      <NursingReview orders={orders} />
      <OrdersSummary
        editing={editing}
        items={items}
        visible={visible}
        rowKeys={rowKeys}
        updateItem={updateItem}
        setItems={setItems}
      />
      <form className="orders-sign stack" onSubmit={onSubmit} noValidate>
        <div className="orders-sign-head">
          <h3>Bloque de firma electrónica y validación profesional</h3>
        </div>
        <div className="orders-sign-grid">
          <div>
            <span>Médico solicitante</span>
            <TextField id="physician-name" label="Nombre del médico" value={physicianName} onChange={(event) => setPhysicianName(event.target.value)} error={errors.physicianName} />
            <p className="hint">{service || "Servicio no indicado"}</p>
          </div>
          <div>
            <span>Credenciales sanitarias</span>
            <TextField id="credential" label="Colegiatura" value={credential} onChange={(event) => setCredential(event.target.value)} error={errors.credential} />
          </div>
          <div>
            <span>Estado del documento</span>
            <strong>{statusLabel}</strong>
          </div>
        </div>
        <CheckField
          id="sign-confirmed"
          label="Confirmo y firmo las indicaciones basales para inicio formal del plan de cuidados en piso."
          description="Declaro que las dosis, vías de administración y órdenes clínicas han sido verificadas contra la conciliación medicamentosa y antecedentes de alergias del paciente."
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          error={errors.confirmed}
        />
        {errors.items ? <Feedback tone="error">{errors.items}</Feedback> : null}
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <div className="form-actions-bar">
          <Button type="button" variant="quiet" onClick={() => void toggleEdit()} disabled={signed}>
            {editing ? "Listo" : "Editar prescripciones"}
          </Button>
          <Button type="submit" disabled={signed || !confirmed || visible.length === 0}>
            Firmar indicaciones
          </Button>
        </div>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="indicaciones" canContinue={advanced} />
    </Sheet>
  );
}
