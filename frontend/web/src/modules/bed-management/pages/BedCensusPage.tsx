import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { StatusMark } from "../../../shared/ui/clinical";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { bedApi } from "../bedApi";
import { AssignConfirm, type AssignDraft } from "../components/AssignConfirm";
import { BedKpiStrip } from "../components/BedKpiStrip";
import { BedRequestForm } from "../components/BedRequestForm";
import { FlowGuide } from "../components/FlowGuide";
import { NotificationsPanel } from "../components/NotificationsPanel";
import { ProjectionPanel, type Occupant } from "../components/ProjectionPanel";
import { WaitingList } from "../components/WaitingList";
import { WardBoard } from "../components/WardBoard";
import { capabilitiesFor } from "../domain/access";
import { censusTotals, compatibleRequests } from "../domain/census";
import { elapsedLabel } from "../domain/flowGuide";
import { toPayload, type RequestForm } from "../domain/requests";
import { useBedBoard, type WaitingItem } from "../hooks/useBedBoard";
import type { AssignmentNotification, Bed, PatientOption, WardCensus } from "../types";

export function BedCensusPage() {
  const { user } = useAuth();
  const role = user?.role ?? "gestion_camas";
  const caps = capabilitiesFor(role);
  const board = useBedBoard(role);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [wardFilter, setWardFilter] = useState("todos");
  const [draft, setDraft] = useState<AssignDraft | null>(null);
  const [formKey, setFormKey] = useState(0);

  const searchPatients = useCallback(async (query: string): Promise<PatientOption[]> => (await bedApi.patients(query)).patients, []);

  /** Ejecuta una acción con bloqueo de doble envío y feedback de éxito/error. */
  async function run(kind: string, action: () => Promise<unknown>, success: string, failure: string): Promise<boolean> {
    if (busy !== null) return false;
    setBusy(kind);
    setNotice("");
    try {
      await action();
      setError("");
      setNotice(success);
      await board.reload();
      return true;
    } catch (caught) {
      setNotice("");
      setError(errorText(caught, failure));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const waitingRequests = useMemo(() => board.waiting.map((item) => item.request), [board.waiting]);
  const totals = useMemo(() => censusTotals(board.wards), [board.wards]);
  const specialties = useMemo(
    () => [...new Set(board.wards.map((ward) => ward.specialty).filter((value): value is string => Boolean(value)))],
    [board.wards],
  );
  const occupants = useMemo<Occupant[]>(
    () =>
      board.wards.flatMap((ward) =>
        ward.beds
          .filter((bed) => bed.status === "occupied" && bed.occupant)
          .map((bed) => ({
            encounterId: bed.occupant!.encounterId,
            patientName: bed.occupant!.patientName ?? bed.occupant!.encounterId,
            location: `${bed.room}-${bed.bedCode}`,
          })),
      ),
    [board.wards],
  );
  const visibleWards = wardFilter === "todos" ? board.wards : board.wards.filter((ward) => ward.code === wardFilter);

  function draftFromWaiting(item: WaitingItem) {
    if (!item.suggestion) return;
    setDraft({ request: item.request, bed: item.suggestion, options: [item.request] });
  }

  function draftFromBed(bed: Bed, ward: WardCensus) {
    const options = compatibleRequests(bed, ward, waitingRequests);
    if (options.length === 0) return;
    setDraft({ request: options[0], bed, options });
  }

  async function confirmAssignment() {
    if (!draft) return;
    const { request, bed } = draft;
    const name = request.patientName ?? `solicitud ${request.id}`;
    const done = await run(
      "assign",
      () => bedApi.assign(request.id, bed.id),
      `Lecho ${bed.room}-${bed.bedCode} asignado a ${name}. Notificada a la enfermera supervisora.`,
      "No se pudo asignar el lecho.",
    );
    if (done) setDraft(null);
  }

  async function submitRequest(form: RequestForm) {
    const done = await run(
      "request",
      () => bedApi.createRequest(toPayload(form)),
      "Solicitud de cama registrada. Aparece en la lista de espera priorizada.",
      "No se pudo registrar la solicitud.",
    );
    if (done) setFormKey((key) => key + 1);
  }

  const submitProjection = (encounterId: string, projectedAt: string) =>
    run("projection", () => bedApi.createProjection(encounterId, projectedAt), "Proyección de alta registrada.", "No se pudo registrar la proyección.");

  const acknowledge = (item: AssignmentNotification) =>
    run(`ack-${item.id}`, () => bedApi.acknowledge(item.id), "Asignación confirmada.", "No se pudo confirmar la asignación.");

  if (board.loading) return <LoadingState label="Cargando censo de camas…" />;

  return (
    <Sheet kicker="Gestión de camas" title="Censo hospitalario" wide clinic="board" className="floor-care ops-board">
      <p className="lead">Disponibilidad de lechos por servicio, lista de espera y asignación.</p>
      <FlowGuide
        role={role}
        counts={{
          waiting: board.waiting.length,
          notifications: board.notifications.length,
          pendingDisinfect: 0,
          toEquip: 0,
          toEnable: board.toEnable,
        }}
      />
      {board.error ? <Feedback tone="error">{board.error}</Feedback> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}

      <div className="ops-toolbar">
        <span className="sync-chip">Sincronizado: {elapsedLabel(board.loadedAt).toLowerCase()}</span>
        <div className="ops-toolbar-tools">
          <Button type="button" variant="quiet" onClick={() => void board.reload()}>Actualizar</Button>
          {caps.canRequest ? (
            <Button
              type="button"
              onClick={() => document.getElementById("bed-request-form")?.scrollIntoView?.({ behavior: "smooth" })}
            >
              Nueva solicitud
            </Button>
          ) : null}
        </div>
      </div>

      <BedKpiStrip totals={totals} />

      <div className="filter-pills" role="group" aria-label="Filtrar pabellones">
        <button type="button" className={`filter-pill${wardFilter === "todos" ? " is-active" : ""}`} aria-pressed={wardFilter === "todos"} onClick={() => setWardFilter("todos")}>
          Todos los pabellones
        </button>
        {board.wards.map((ward) => (
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
        <WardBoard wards={visibleWards} waiting={waitingRequests} canAssign={caps.canAssign} onAssign={draftFromBed} />

        <aside className="bed-side">
          {draft ? (
            <AssignConfirm
              draft={draft}
              busy={busy === "assign"}
              onChangeRequest={(requestId) => {
                const next = draft.options.find((option) => option.id === requestId);
                if (next) setDraft({ ...draft, request: next });
              }}
              onConfirm={() => void confirmAssignment()}
              onCancel={() => setDraft(null)}
            />
          ) : null}

          {caps.seesWaitingList ? <WaitingList items={board.waiting} canAssign={caps.canAssign} onAssign={draftFromWaiting} /> : null}

          {caps.canRequest ? (
            <BedRequestForm
              key={formKey}
              specialties={specialties}
              busy={busy === "request"}
              onSearch={searchPatients}
              onSubmit={(form) => void submitRequest(form)}
            />
          ) : null}

          {caps.seesNotifications ? (
            <NotificationsPanel
              items={board.notifications}
              busyId={busy?.startsWith("ack-") ? Number(busy.slice(4)) : null}
              onAcknowledge={(item) => void acknowledge(item)}
            />
          ) : null}

          {caps.seesProjections ? (
            <ProjectionPanel
              canWrite={caps.canProject}
              occupants={occupants}
              projections={board.projections}
              busy={busy === "projection"}
              onSubmit={submitProjection}
            />
          ) : null}
        </aside>
      </div>
    </Sheet>
  );
}
