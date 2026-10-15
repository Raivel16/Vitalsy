import { type FormEvent, useEffect, useState } from "react";
import { IconPrinter, IconQrcode, IconFilePlus, IconCheck } from "@tabler/icons-react";
import { api, ApiError } from "../../../app/api";
import { printClinicalDocument } from "../../../shared/print/printDocument";
import { readDraft, writeDraft } from "../domain/admissionDraft";
import { errorText } from "../../../app/userMessage";
import { Barcode, printBarcodeOnly } from "../components/Barcode";
import { BarcodeScanner } from "../../../shared/ui/BarcodeScanner";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { CheckField, SelectField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LifeWordmark } from "../../../shared/ui/LifeWordmark";
import { advanceEncounter } from "../../admission-census/domain/advance";
import { useAuth } from "../../../app/AuthProvider";
import { useEncounter, useEncounterState } from "../../admission-census/EncounterContext";
import { StepNav } from "../../admission-census/ui/StepNav";
import { normalizeLinkCode, validateLinkCode } from "../../../shared/validation/inputRules";
import { lifeLinkErrorMessage, type LifeMetric } from "../domain/lifeBaseline";
import { LifeBaselineMetrics } from "../components/LifeBaselineMetrics";

export function WristbandPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [code, setCode] = useState(encounter?.wristbandCode ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setCode(encounter?.wristbandCode ?? "");
    if (encounter?.wristbandCode) setAdvanced(true);
  }, [encounter?.wristbandCode]);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Brazalete de identificación" clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para emitir su brazalete." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);
    try {
      const data = await api<{ wristband: { code: string } }>("/api/v1/hospital-admission/wristbands", {
        method: "POST",
        body: JSON.stringify({ encounterId: activeEncounter.encounterId }),
      });
      setCode(data.wristband.code);
      setNotice("Brazalete emitido.");
      if (activeEncounter.currentStep === "brazalete") {
        const next = await advanceEncounter(activeEncounter.encounterId, "brazalete");
        applyEncounter(next);
        setAdvanced(true);
      } else {
        setAdvanced(true);
      }
    } catch (error_) {
      setError(errorText(error_, "No se pudo emitir el brazalete."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión" title="Brazalete de identificación" clinic="form">
      <p className="lead">Genere y verifique el identificador físico del paciente antes de la entrega o colocación en cama.</p>
      {notice ? (
        <div className="admit-callout">
          <strong>Brazalete emitido con éxito</strong>
          <p>Identificador validado y listo para despacho o impresión de repuesto.</p>
          <Feedback tone="success">{notice}</Feedback>
        </div>
      ) : null}
      <form className="stack" onSubmit={onSubmit}>
        <div className="form-actions-bar">
          <span />
          <Button type="submit" pending={pending} disabled={pending || advanced}>Emitir brazalete</Button>
        </div>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
      </form>
      {code ? (
        <>
          <p className="kicker">Vista previa del brazalete</p>
          <div className="wristband">
            <span className="wrist-hole" aria-hidden="true" />
            <div>
              <p className="wrist-code" aria-label="Código del brazalete">{code}</p>
              <Barcode value={code} />
            </div>
            <span className="wrist-hole" aria-hidden="true" />
          </div>
          <div className="form-actions-bar">
            <Button variant="quiet" type="button" onClick={() => printBarcodeOnly()}>
              Imprimir código de barras
            </Button>
          </div>
        </>
      ) : null}
      <StepNav role={role} encounter={activeEncounter} viewingStep="brazalete" canContinue={advanced} />
    </Sheet>
  );
}

export function RecordPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [recordId, setRecordId] = useState(encounter?.recordId ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setRecordId(encounter?.recordId ?? "");
    if (encounter?.recordId) setAdvanced(true);
  }, [encounter?.recordId]);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Expediente clínico de ingreso" clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para aperturar su expediente." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const data = await api<{ record: { recordId: string } }>("/api/v1/hospital-admission/clinical-records", {
        method: "POST",
        body: JSON.stringify({ encounterId: activeEncounter.encounterId }),
      });
      setRecordId(data.record.recordId);
      setError("");
      if (activeEncounter.currentStep === "expediente") {
        const next = await advanceEncounter(activeEncounter.encounterId, "expediente");
        applyEncounter(next);
      }
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudo aperturar el expediente."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión hospitalaria" title="Expediente clínico de ingreso" clinic="form">
      <p className="lead">Formalice la apertura del registro institucional del paciente antes del traslado a sala de hospitalización.</p>
      <div className="admit-panel">
        <div className="admit-panel-head">
          <p className="kicker">Datos para apertura de historia clínica</p>
          <span className="sheet-badge">Revisión previa</span>
        </div>
        <dl className="admit-tiles">
          <div className="admit-tile">
            <dt>Servicio asignado</dt>
            <dd>{activeEncounter.location.service || activeEncounter.originService}</dd>
          </div>
          <div className="admit-tile">
            <dt>Cama asignada</dt>
            <dd>
              {[activeEncounter.location.room, activeEncounter.location.bed].filter(Boolean).join(" · ") || "Pendiente de asignación"}
            </dd>
          </div>
          <div className="admit-tile">
            <dt>Régimen previsional</dt>
            <dd>{activeEncounter.coverage.payer} · {activeEncounter.coverage.plan}</dd>
          </div>
          <div className="admit-tile">
            <dt>Responsable de apertura</dt>
            <dd>{user?.name ?? "Admisión"}</dd>
          </div>
        </dl>
      </div>
      <form onSubmit={onSubmit}>
        <Button className="button-block" type="submit" pending={pending} disabled={pending || advanced || Boolean(recordId)}>
          <IconFilePlus size={16} /> Aperturar expediente
        </Button>
      </form>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {recordId ? (
        <div className="admit-callout">
          <Feedback tone="success">Expediente abierto correctamente. Identificador {recordId}.</Feedback>
        </div>
      ) : null}
      <StepNav role={role} encounter={activeEncounter} viewingStep="expediente" canContinue={advanced} />
    </Sheet>
  );
}

export function ConsentPage() {
  const encounter = useEncounter();
  const { applyEncounter } = useEncounterState();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [signerName, setSignerName] = useState("");
  const [relationship, setRelationship] = useState("titular");
  const [accepted, setAccepted] = useState(false);
  const [lifeUser, setLifeUser] = useState(false);
  const [lifeCode, setLifeCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [lifeStatus, setLifeStatus] = useState<"idle" | "linked" | "failed">("idle");
  const [lifeMessage, setLifeMessage] = useState("");
  const [lifeMetrics, setLifeMetrics] = useState<LifeMetric[]>([]);
  const [lifePending, setLifePending] = useState(false);

  useEffect(() => {
    if (!encounter) return;
    const saved = encounter.clinical?.consent ?? readDraft<{
      signerName?: string;
      relationship?: string;
      accepted?: boolean;
    }>(encounter.encounterId, "consent");
    if (saved?.signerName) {
      setSignerName(saved.signerName);
      setRelationship(saved.relationship || "titular");
      setAccepted(true);
      setSigned("firmado");
      setAdvanced(true);
    }
  }, [encounter]);

  if (!encounter) {
    return (
      <Sheet kicker="Admisión" title="Consentimiento informado" clinic="form">
        <EmptyEncounter message="Abra un paciente desde el censo para registrar el consentimiento." />
      </Sheet>
    );
  }

  const activeEncounter = encounter;

  async function linkLife(): Promise<void> {
    const codeIssue = validateLinkCode(lifeCode);
    if (codeIssue) {
      setErrors((current) => ({ ...current, lifeCode: codeIssue }));
      return;
    }
    setErrors((current) => {
      const rest = { ...current };
      delete rest.lifeCode;
      return rest;
    });
    setLifePending(true);
    try {
      const data = await api<{ link: { baselineSummary?: { metrics?: LifeMetric[] } } }>(
        "/api/v1/hospital-admission/life-links",
        {
          method: "POST",
          body: JSON.stringify({
            encounterId: activeEncounter.encounterId,
            code: normalizeLinkCode(lifeCode),
          }),
        },
      );
      setLifeMetrics(data.link?.baselineSummary?.metrics ?? []);
      setLifeStatus("linked");
      setLifeMessage("");
    } catch (error_) {
      const generic = "No se pudo vincular Vitalsy Life. Intente de nuevo.";
      let message: string;
      if (error_ instanceof ApiError) {
        message = error_.status === 429
          ? "Demasiados intentos. Espere un minuto e intente de nuevo."
          : lifeLinkErrorMessage(error_.code) ?? generic;
      } else {
        message = errorText(error_, generic);
      }
      setLifeStatus("failed");
      setLifeMessage(message);
    } finally {
      setLifePending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!signerName.trim()) next.signerName = "El nombre de quien firma es obligatorio.";
    if (!accepted) next.accepted = "Debe aceptar el consentimiento informado.";
    if (lifeUser) {
      const codeIssue = validateLinkCode(lifeCode);
      if (codeIssue) next.lifeCode = codeIssue;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const data = await api<{ consent: { status: string } }>("/api/v1/hospital-admission/informed-consents", {
        method: "POST",
        body: JSON.stringify({
          encounterId: activeEncounter.encounterId,
          signerName,
          relationship,
          accepted,
          lifeUser,
        }),
      });
      writeDraft(activeEncounter.encounterId, "consent", { signerName, relationship, accepted: true });
      setSigned(data.consent.status);
      setError("");
      if (lifeUser) await linkLife();
      if (activeEncounter.currentStep === "consentimiento") {
        const updated = await advanceEncounter(activeEncounter.encounterId, "consentimiento");
        applyEncounter(updated);
      }
      setAdvanced(true);
    } catch (error_) {
      setError(errorText(error_, "No se pudo registrar el consentimiento."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Admisión hospitalaria" title="Consentimiento informado" clinic="form">
      <p className="lead">
        Registre la declaración de aceptación del ingreso hospitalario y procedimientos médicos reglamentarios por parte del paciente o apoderado legal.
      </p>
      <div className="admit-callout">
        <strong>Marco de voluntariedad asistencial</strong>
        <p>El consentimiento autoriza exploraciones clínicas, administración terapéutica indicada en el plan inicial y monitoreo hemodinámico general. Se reserva consentimiento específico para procedimientos invasivos mayores.</p>
      </div>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField
          id="signer-name"
          label="Nombre de quien firma"
          value={signerName}
          onChange={(event) => setSignerName(event.target.value)}
          error={errors.signerName}
          hint="Titular identificado con documento oficial."
        />
        <SelectField id="relationship" label="Relación con el paciente" value={relationship} onChange={(event) => setRelationship(event.target.value)}>
          <option value="titular">Titular / propio paciente</option>
          <option value="familiar">Familiar</option>
          <option value="apoderado">Apoderado legal</option>
        </SelectField>
        <CheckField
          id="consent-accepted"
          className="admit-check"
          label="Acepto el consentimiento informado para atención médica y procedimientos hospitalarios"
          description="Declara haber sido instruido de forma clara e inequívoca respecto al régimen de internación, derechos del paciente y régimen de visitas."
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          error={errors.accepted}
        />
        <section className="life-panel" aria-labelledby="vitalsy-life-title">
          <header className="life-panel-head">
            <div>
              <h3 id="vitalsy-life-title"><LifeWordmark /></h3>
              <p>Vincular registros biométricos del paciente</p>
            </div>
            <span className="sheet-badge">Ecosistema conectado</span>
          </header>
          <CheckField
            id="vitalsy-life-user"
            className="admit-check"
            label="El paciente es usuario de la app Vitalsy Life"
            description="Permite la importación continua del historial ambulatorio previo a la cama hospitalaria."
            checked={lifeUser}
            onChange={(event) => {
              setLifeUser(event.target.checked);
              if (!event.target.checked) {
                setLifeStatus("idle");
                setLifeMessage("");
              }
            }}
          />
          {lifeUser ? (
            <div className="form-grid">
              <TextField
                id="vitalsy-life-code"
                label="Código o QR de autorización"
                value={lifeCode}
                onChange={(event) => setLifeCode(event.target.value.toUpperCase())}
                error={errors.lifeCode}
                hint="Formato VL-XXXX-XXXX"
              />
              <div className="field">
                <span className="field-label">Escanear</span>
                <BarcodeScanner label="Escanear código" onScan={(value) => setLifeCode(normalizeLinkCode(value))} />
              </div>
              <p className="hint form-span-2"><IconQrcode size={14} /> El código se vincula al registrar el consentimiento.</p>
            </div>
          ) : (
            <p className="hint">Si se desmarca: el ingreso continúa sin vincular la línea de base domiciliaria.</p>
          )}
          {lifeStatus === "linked" ? (
            <div>
              <Feedback tone="success">Línea de base importada</Feedback>
              {lifeMetrics.length > 0 ? <LifeBaselineMetrics metrics={lifeMetrics} /> : null}
            </div>
          ) : null}
          {lifeStatus === "failed" ? (
            <div>
              <Feedback tone="info">
                {lifeMessage} El ingreso continúa sin la línea de base domiciliaria.
              </Feedback>
              <Button variant="quiet" type="button" pending={lifePending} disabled={lifePending} onClick={() => void linkLife()}>
                Reintentar vinculación
              </Button>
            </div>
          ) : null}
        </section>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {signed ? <Feedback tone="success">Consentimiento {signed}.</Feedback> : null}
        <div className="form-actions-bar">
          <Button variant="quiet" type="button" onClick={() => printClinicalDocument("Consentimiento informado", `
            <dl>
              <dt>Paciente</dt><dd>${activeEncounter.patientName} · ${activeEncounter.documentType} ${activeEncounter.documentNumber}</dd>
              <dt>Quien firma</dt><dd>${signerName || "—"}</dd>
              <dt>Relación</dt><dd>${relationship}</dd>
              <dt>Declaración</dt><dd>Aceptación del ingreso hospitalario y procedimientos médicos reglamentarios.</dd>
            </dl>
          `)}>
            <IconPrinter size={16} /> Imprimir consentimiento físico
          </Button>
          <Button type="submit" pending={pending} disabled={pending || advanced}>
            <IconCheck size={16} /> Registrar consentimiento
          </Button>
        </div>
      </form>
      <StepNav role={role} encounter={activeEncounter} viewingStep="consentimiento" canContinue={advanced} />
    </Sheet>
  );
}
