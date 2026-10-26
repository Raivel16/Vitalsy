import { type SyntheticEvent, useEffect, useState } from "react";
import { IconPrinter, IconSearch, IconCheck } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { StepNav } from "../../admission-census/ui/StepNav";
import { errorText } from "../../../app/userMessage";
import { Button, ButtonLink } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { escapeHtml, printClinicalDocument } from "../../../shared/print/printDocument";
import { readDraft, writeDraft } from "../domain/admissionDraft";

type OrderData = {
  orderNumber: string;
  originService: string;
  requestingPhysician: string | null;
  reason: string | null;
  patient: { fullName: string; documentType: string; documentNumber: string };
  coverage: { payer: string; status: string; plan: string };
};

type AdmissionOrder = { order: OrderData };

export function AdmissionOrderPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<AdmissionOrder | null>(null);
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  // Los avisos solo se limpian al cambiar de ingreso: confirmar la orden avanza el paso y no debe borrar «Orden confirmada.».
  useEffect(() => {
    setError("");
    setNotice("");
  }, [encounter?.encounterId]);

  useEffect(() => {
    setOrderNumber(encounter?.orderNumber ?? "");
    const cached = encounter ? readDraft<AdmissionOrder>(encounter.encounterId, "order") : null;
    setResult(cached);
    setAdvanced(Boolean(encounter && encounter.currentStep !== "orden"));
  }, [encounter?.encounterId, encounter?.orderNumber, encounter?.currentStep]);

  async function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api<AdmissionOrder>(
        `/api/v1/hospital-admission/admission-orders/${encodeURIComponent(orderNumber.trim())}`,
      );
      setResult(data);
      if (encounter) writeDraft(encounter.encounterId, "order", data);
    } catch (error_) {
      setError(errorText(error_, "No se pudo consultar la orden."));
    } finally {
      setLoading(false);
    }
  }

  async function confirmOrder() {
    if (!encounter) return;
    setPending(true);
    setError("");
    try {
      if (encounter.currentStep === "orden") {
        const next = await advanceEncounter(encounter.encounterId, "orden");
        applyEncounter(next);
      }
      setNotice("Orden confirmada.");
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudo confirmar la orden."));
    } finally {
      setPending(false);
    }
  }

  const order = result?.order ?? (encounter ? {
    orderNumber: encounter.orderNumber,
    originService: encounter.originService,
    requestingPhysician: null,
    reason: null,
    patient: {
      fullName: encounter.patientName,
      documentType: encounter.documentType,
      documentNumber: encounter.documentNumber,
    },
    coverage: encounter.coverage,
  } : null);

  function printOrder() {
    if (!order) return;
    printClinicalDocument("Orden de internamiento", `
      <dl>
        <dt>Número</dt><dd>${escapeHtml(order.orderNumber)}</dd>
        <dt>Paciente</dt><dd>${escapeHtml(order.patient.fullName)} · ${escapeHtml(order.patient.documentType)} ${escapeHtml(order.patient.documentNumber)}</dd>
        <dt>Origen</dt><dd>${escapeHtml(order.originService)}</dd>
        <dt>Médico solicitante</dt><dd>${escapeHtml(order.requestingPhysician ?? "No indicado")}</dd>
        <dt>Motivo</dt><dd>${escapeHtml(order.reason ?? "No indicado")}</dd>
        <dt>Cobertura</dt><dd>${escapeHtml(order.coverage.payer)} · ${escapeHtml(order.coverage.status)} · ${escapeHtml(order.coverage.plan)}</dd>
      </dl>
    `);
  }

  return (
    <Sheet kicker="Admisión hospitalaria" title="Orden de internamiento" clinic="form">
      <p className="lead">
        {encounter
          ? `Consulte la orden de internamiento de ${encounter.patientName}.`
          : "Consulte la orden digital enviada por el servicio emisor o registre un ingreso manual."}
      </p>
      {!encounter ? (
        <p><ButtonLink to="/pacientes/nuevo">Registrar ingreso manual</ButtonLink></p>
      ) : null}
      <form className="stack" onSubmit={onSubmit}>
        <div className="form-grid">
          <TextField id="order-number" label="Número de orden" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} required />
        </div>
        <div className="form-actions-bar">
          <span />
          <Button type="submit"><IconSearch size={16} /> Consultar orden</Button>
        </div>
      </form>
      {loading ? <output>Cargando orden de internamiento.</output> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {order ? (
        <section className="result-block">
          <div className="admit-panel">
            <div className="admit-panel-head">
              <p className="kicker">Datos clínicos de la solicitud</p>
            </div>
            <h3 className="sr-only">{order.patient.fullName}</h3>
            <dl className="admit-rows">
              <div><dt>Número</dt><dd>{order.orderNumber}</dd></div>
              <div><dt>Origen</dt><dd>{order.originService}</dd></div>
              <div><dt>Médico solicitante</dt><dd>{order.requestingPhysician ?? "No indicado"}</dd></div>
              <div><dt>Motivo</dt><dd>{order.reason ?? "No indicado"}</dd></div>
              <div>
                <dt>Paciente</dt>
                <dd>{order.patient.fullName} · {order.patient.documentType} {order.patient.documentNumber}</dd>
              </div>
              <div><dt>Cobertura</dt><dd>{order.coverage.payer} · {order.coverage.status}</dd></div>
            </dl>
          </div>
          {encounter ? (
            <div className="form-actions-bar">
              <Button variant="quiet" type="button" onClick={printOrder}><IconPrinter size={16} /> Imprimir orden</Button>
              <Button type="button" onClick={() => void confirmOrder()} disabled={pending || advanced}>
                <IconCheck size={16} /> Confirmar orden
              </Button>
            </div>
          ) : (
            <p><ButtonLink to="/pacientes">Ir al censo</ButtonLink></p>
          )}
        </section>
      ) : null}
      {encounter ? <StepNav role={role} encounter={encounter} viewingStep="orden" canContinue={advanced} /> : null}
    </Sheet>
  );
}
