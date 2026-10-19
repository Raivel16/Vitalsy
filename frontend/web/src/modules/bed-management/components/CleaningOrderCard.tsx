import { useState } from "react";
import { formatTime } from "../../../shared/datetime/format";
import { Button } from "../../../shared/ui/Button";
import { StatusPill } from "../../../shared/ui/clinical";
import { CheckField } from "../../../shared/ui/Field";
import {
  CHECKLIST_ITEMS,
  actionFor,
  checklistComplete,
  emptyChecklist,
  ownerOf,
  protocolLabel,
  statusLabel,
  unitTitle,
  type Checklist,
  type CleaningStatus,
} from "../domain/cleaningStage";
import { elapsedLabel } from "../domain/flowGuide";
import type { CleaningOrder } from "../types";

function statusTone(status: CleaningStatus): "success" | "warning" | "info" {
  if (status === "habilitada") return "success";
  if (status === "pendiente") return "warning";
  return "info";
}

function orderMeta(order: CleaningOrder, status: CleaningStatus): string {
  const parts = [elapsedLabel(order.dispatchedAt)];
  if (order.isolation) parts.push(" · Criterio de aislamiento previo");
  if (order.completedAt && status !== "pendiente") parts.push(` · Desinfectada a las ${formatTime(order.completedAt)}`);
  if (order.equippedAt && (status === "equipada" || status === "habilitada")) {
    parts.push(` · Equipada a las ${formatTime(order.equippedAt)}`);
  }
  return parts.join("");
}

function OrderActions({
  action,
  owner,
  busy,
  complete,
  onDisinfect,
  onEquip,
  onEnable,
}: Readonly<{
  action: ReturnType<typeof actionFor>;
  owner: ReturnType<typeof ownerOf>;
  busy: boolean;
  complete: boolean;
  onDisinfect: () => void;
  onEquip: () => void;
  onEnable: () => void;
}>) {
  return (
    <div className="pipeline-actions">
      {action === "disinfect" ? (
        <Button type="button" pending={busy} disabled={!complete} onClick={onDisinfect}>
          Registrar desinfección terminada
        </Button>
      ) : null}
      {action === "equip" ? (
        <Button type="button" pending={busy} onClick={onEquip}>Marcar unidad equipada</Button>
      ) : null}
      {action === "enable" ? (
        <Button type="button" pending={busy} onClick={onEnable}>Habilitar cama en censo hospitalario</Button>
      ) : null}
      {!action && owner ? <p className="pipeline-waiting">Esperando a: {owner}</p> : null}
      {!action && !owner ? <p className="pipeline-waiting is-done">Unidad apta para ingreso inmediato</p> : null}
      {action && owner ? <p className="pipeline-owner">Acción asignada a: {owner}</p> : null}
    </div>
  );
}

/**
 * Tarjeta de una orden de limpieza. Solo expone la acción que le corresponde al rol
 * en la etapa actual; en cualquier otro caso indica a quién se espera.
 */
export function CleaningOrderCard({
  order,
  role,
  busy,
  onDisinfect,
  onEquip,
  onEnable,
}: Readonly<{
  order: CleaningOrder;
  role: string;
  busy: boolean;
  onDisinfect: (order: CleaningOrder, checklist: Checklist) => void;
  onEquip: (order: CleaningOrder) => void;
  onEnable: (order: CleaningOrder) => void;
}>) {
  const [checklist, setChecklist] = useState<Checklist>(emptyChecklist);
  const status = order.status as CleaningStatus;
  const action = actionFor(role, status);
  const owner = ownerOf(status);
  const done = CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length;
  const complete = checklistComplete(checklist);

  return (
    <li className={`pipeline-card is-${status}`}>
      <div className="pipeline-main">
        <h3>{unitTitle(order)}</h3>
        <div className="chip-row">
          {order.ward ? <StatusPill tone="info">{order.ward}</StatusPill> : null}
          <StatusPill tone={order.protocol === "deep" ? "danger" : "neutral"}>{protocolLabel(order.protocol)}</StatusPill>
          <StatusPill tone={statusTone(status)}>
            {statusLabel(status)}
          </StatusPill>
        </div>
        <p className="pipeline-meta">
          {orderMeta(order, status)}
        </p>

        {action === "disinfect" ? (
          <fieldset className="check-panel">
            <legend>
              Checklist requerido de habilitación clínica
              {" "}
              <span className="check-progress">{done} / {CHECKLIST_ITEMS.length} completados</span>
            </legend>
            <div className="check-grid">
              {CHECKLIST_ITEMS.map((item) => (
                <CheckField
                  key={item.key}
                  id={`check-${order.id}-${item.key}`}
                  label={item.label}
                  checked={checklist[item.key]}
                  disabled={busy}
                  onChange={(event) => setChecklist({ ...checklist, [item.key]: event.target.checked })}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      <OrderActions
        action={action}
        owner={owner}
        busy={busy}
        complete={complete}
        onDisinfect={() => onDisinfect(order, checklist)}
        onEquip={() => onEquip(order)}
        onEnable={() => onEnable(order)}
      />
    </li>
  );
}
