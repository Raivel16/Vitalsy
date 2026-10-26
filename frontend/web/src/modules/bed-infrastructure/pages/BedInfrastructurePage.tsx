import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { BedForm, BulkForm, WardForm } from "../components/InfraForms";
import { WardCard, type InfraActions } from "../components/WardCard";
import type { BulkFormValues } from "../domain/infrastructureForm";
import { createBed, createBulk, createWard, deleteBed, deleteWard, listWards, previewBulk, setBedActive, setWardActive } from "../infrastructureApi";
import type { BulkPreview, InfraBed, InfraWard } from "../types";

type Notice = { tone: "success" | "error"; text: string };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function BulkPreviewPanel({ preview, busy, onConfirm }: Readonly<{ preview: BulkPreview; busy: boolean; onConfirm: () => void }>) {
  const fresh = preview.total - preview.existing;
  return (
    <section className="panel" aria-label="Vista previa del lote">
      <header className="panel-head"><h3>Resultado esperado</h3></header>
      <p>
        El lote generaría {plural(preview.total, "cama", "camas")}: {preview.beds.map((bed) => bed.label).join(", ")}.
      </p>
      <p className="hint">{preview.existing > 0 ? `${plural(preview.existing, "ya existe", "ya existen")} y se omitirá.` : "Ninguna existe todavía."}</p>
      <Button type="button" disabled={fresh === 0} pending={busy} onClick={onConfirm}>
        {`Crear ${plural(fresh, "cama nueva", "camas nuevas")}`}
      </Button>
    </section>
  );
}

export function BedInfrastructurePage() {
  const [wards, setWards] = useState<InfraWard[] | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [bulk, setBulk] = useState<{ values: BulkFormValues; preview: BulkPreview } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setWards((await listWards()).wards);
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, "No se pudo cargar la infraestructura.") });
      setWards([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  /** Ejecuta una acción, recarga el catálogo y comunica el resultado. */
  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    try {
      await action();
      setNotice({ tone: "success", text: success });
      await load();
      return true;
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, "No se pudo completar la operación.") });
      return false;
    }
  }

  const actions: InfraActions = {
    onToggleBed: (bed: InfraBed) =>
      void run(() => setBedActive(bed.id, !bed.active), `Cama ${bed.room}-${bed.bedCode} ${bed.active ? "desactivada" : "activada"}.`),
    onDeleteBed: (bed: InfraBed) =>
      void run(() => deleteBed(bed.id), `Cama ${bed.room}-${bed.bedCode} borrada. El historial se conserva.`),
    onToggleWard: (ward: InfraWard) =>
      void run(() => setWardActive(ward.id, !ward.active), `Pabellón ${ward.code} ${ward.active ? "desactivado" : "activado"}.`),
    onDeleteWard: (ward: InfraWard) =>
      void run(() => deleteWard(ward.id), `Pabellón ${ward.code} borrado. El historial se conserva.`),
  };

  async function onPreview(values: BulkFormValues) {
    try {
      setBulk({ values, preview: await previewBulk(values) });
      setNotice(null);
    } catch (error) {
      setBulk(null);
      setNotice({ tone: "error", text: errorText(error, "No se pudo generar la vista previa.") });
    }
  }

  async function confirmBulk() {
    if (!bulk) return;
    setBulkBusy(true);
    try {
      const result = await createBulk(bulk.values);
      const skipped = result.skipped > 0 ? `, ${plural(result.skipped, "ya existía", "ya existían")}` : "";
      setNotice({ tone: "success", text: `Lote creado: ${plural(result.created, "cama nueva", "camas nuevas")}${skipped}.` });
      setBulk(null);
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: errorText(error, "No se pudo crear el lote.") });
    }
    setBulkBusy(false);
  }

  const catalog = wards ?? [];

  return (
    <Sheet kicker="Administración" title="Infraestructura de camas" clinic="board" className="floor-care ops-board">
      {notice ? <Feedback tone={notice.tone}>{notice.text}</Feedback> : null}
      {wards === null ? <LoadingState label="Cargando pabellones…" /> : null}
      {wards !== null && catalog.length === 0 ? (
        <Panel title="Primer arranque">
          <p>Aún no hay pabellones. Cree el primero para comenzar; después agregue sus camas una por una o en lote.</p>
        </Panel>
      ) : null}
      {catalog.map((ward) => <WardCard key={ward.id} ward={ward} actions={actions} />)}
      <WardForm onSubmit={(values) => run(() => createWard(values), `Pabellón ${values.code.trim()} creado.`)} />
      {catalog.length > 0 ? (
        <>
          <BedForm wards={catalog} onSubmit={(values) => run(() => createBed(values), `Cama ${values.room.trim()}-${values.bedCode.trim()} creada.`)} />
          <BulkForm wards={catalog} onPreview={onPreview} onChange={() => setBulk(null)} />
          {bulk ? <BulkPreviewPanel preview={bulk.preview} busy={bulkBusy} onConfirm={() => void confirmBulk()} /> : null}
        </>
      ) : null}
    </Sheet>
  );
}
