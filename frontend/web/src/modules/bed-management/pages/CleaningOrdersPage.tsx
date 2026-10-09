import { useMemo, useState } from "react";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/Field";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { bedApi } from "../bedApi";
import { CleaningOrderCard } from "../components/CleaningOrderCard";
import { CleaningStageStrip } from "../components/CleaningStageStrip";
import { FlowGuide } from "../components/FlowGuide";
import { stageCounts, unitTitle, type Checklist, type CleaningStatus } from "../domain/cleaningStage";
import { elapsedLabel } from "../domain/flowGuide";
import { useCleaningOrders } from "../hooks/useCleaningOrders";
import type { CleaningOrder } from "../types";

type StageFilter = CleaningStatus | "todas";

const FILTERS: ReadonlyArray<{ id: StageFilter; label: (counts: Record<CleaningStatus, number>, total: number) => string }> = [
  { id: "todas", label: (_counts, total) => `Todas las órdenes (${total})` },
  { id: "pendiente", label: (counts) => `Desinfección pendiente (${counts.pendiente})` },
  { id: "completada", label: (counts) => `Por equipar (${counts.completada})` },
  { id: "equipada", label: (counts) => `Por habilitar (${counts.equipada})` },
];

/** Cantidad de unidades ya habilitadas que se muestran en la vista «Todas». */
const RECENT_ENABLED = 5;

export function CleaningOrdersPage() {
  const { user } = useAuth();
  const role = user?.role ?? "servicios_generales";
  const board = useCleaningOrders();
  const { orders } = board;
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<StageFilter>("todas");
  const [search, setSearch] = useState("");

  async function run(order: CleaningOrder, request: () => Promise<unknown>, success: string, failure: string) {
    if (busyId !== null) return;
    setBusyId(order.id);
    setNotice("");
    try {
      await request();
      setActionError("");
      setNotice(success);
      await board.reload();
    } catch (caught) {
      setNotice("");
      setActionError(errorText(caught, failure));
    } finally {
      setBusyId(null);
    }
  }

  const disinfect = (order: CleaningOrder, checklist: Checklist) =>
    run(
      order,
      () => bedApi.completeCleaning(order.id, checklist),
      `Desinfección registrada en ${unitTitle(order)}. Pasa a equipamiento.`,
      "No se pudo registrar la desinfección.",
    );
  const equip = (order: CleaningOrder) =>
    run(order, () => bedApi.equip(order.bedId), `Unidad equipada: ${unitTitle(order)}. Pasa a validación de la supervisora.`, "No se pudo marcar la unidad como equipada.");
  const enable = (order: CleaningOrder) =>
    run(order, () => bedApi.release(order.bedId), `Cama habilitada en el censo central: ${unitTitle(order)}.`, "No se pudo habilitar la cama.");

  const counts = useMemo(() => stageCounts(orders), [orders]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = (order: CleaningOrder) =>
      term === "" || `${order.room ?? ""} ${order.bedCode ?? ""} ${order.ward ?? ""}`.toLowerCase().includes(term);
    const filtered = orders.filter((order) => (filter === "todas" || order.status === filter) && matches(order));
    if (filter !== "todas") return filtered;
    const open = filtered.filter((order) => order.status !== "habilitada");
    const enabled = filtered.filter((order) => order.status === "habilitada").slice(0, RECENT_ENABLED);
    return [...open, ...enabled];
  }, [orders, filter, search]);

  if (board.loading) return <LoadingState label="Cargando órdenes de limpieza…" />;

  return (
    <Sheet kicker="Gestión de camas" title="Habilitación de unidades y protocolo de higiene" wide clinic="board" className="floor-care ops-board">
      <p className="lead">Control operativo del circuito de acondicionamiento de camas tras el egreso o traslado de pacientes.</p>
      <FlowGuide
        role={role}
        counts={{
          waiting: 0,
          notifications: 0,
          pendingDisinfect: counts.pendiente,
          toEquip: counts.completada,
          toEnable: counts.equipada,
        }}
      />
      {board.error ? <Feedback tone="error">{board.error}</Feedback> : null}
      {actionError ? <Feedback tone="error">{actionError}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}

      <CleaningStageStrip counts={counts} active={filter} onSelect={setFilter} />

      <div className="ops-toolbar">
        <div className="filter-pills" role="group" aria-label="Filtrar órdenes">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`filter-pill${filter === item.id ? " is-active" : ""}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label(counts, orders.length)}
            </button>
          ))}
        </div>
        <div className="ops-toolbar-tools">
          <TextField
            id="cleaning-search"
            type="search"
            label="Buscar por habitación o cama"
            hideLabel
            compact
            placeholder="Buscar por habitación o cama…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="sync-chip">Actualizado {elapsedLabel(board.loadedAt).toLowerCase()}</span>
          <Button type="button" variant="quiet" onClick={() => void board.reload()}>Actualizar</Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <Feedback tone="info">
          {orders.length === 0
            ? "No hay órdenes de limpieza. Se generan automáticamente al registrarse el egreso o traslado de un paciente."
            : "Ninguna orden coincide con el filtro o la búsqueda."}
        </Feedback>
      ) : (
        <ul className="pipeline">
          {visible.map((order) => (
            <CleaningOrderCard
              key={order.id}
              order={order}
              role={role}
              busy={busyId === order.id}
              onDisinfect={(target, checklist) => void disinfect(target, checklist)}
              onEquip={(target) => void equip(target)}
              onEnable={(target) => void enable(target)}
            />
          ))}
        </ul>
      )}
    </Sheet>
  );
}
