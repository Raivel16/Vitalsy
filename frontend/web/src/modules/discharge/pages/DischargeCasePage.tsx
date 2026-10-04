import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel, StatusPill } from "../../../shared/ui/clinical";
import { TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { handoffLines, type DischargeCase } from "../domain/discharge";

const PERSPECTIVES = [
  { id: "medico_tratante", label: "Médico tratante" },
  { id: "medico_residente", label: "Médico residente" },
  { id: "trabajo_social", label: "Trabajo social" },
  { id: "enfermera_piso", label: "Enfermera de piso" },
  { id: "altas_caja", label: "Altas y caja" },
  { id: "camillero", label: "Camillero" },
];

export function DischargeCasePage() {
  const { encounterId = "" } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [item, setItem] = useState<DischargeCase | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [life, setLife] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ case: DischargeCase }>(`/api/v1/discharge/encounters/${encounterId}`);
      setItem(data.case);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo cargar la ficha de egreso."));
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if ((error || notice) && typeof bannerRef.current?.scrollIntoView === "function") {
      bannerRef.current.scrollIntoView({ block: "center" });
    }
  }, [error, notice]);

  async function submit(path: string, body: Record<string, unknown>, success: string) {
    setPending(true);
    setError("");
    try {
      const data = await api<{ case: DischargeCase }>(path, { method: "POST", body: JSON.stringify(body) });
      setItem(data.case);
      setNotice(success);
      setForm({});
    } catch (caught) {
      setError(errorText(caught, "No se pudo guardar el entregable."));
    } finally {
      setPending(false);
    }
  }

  function onField(id: string) {
    return (event: { target: { value: string } }) => setForm((current) => ({ ...current, [id]: event.target.value }));
  }

  if (loading) return <LoadingState label="Cargando ficha de egreso…" />;
  if (!item) return <Feedback tone="error">{error || "No se encontró el ingreso."}</Feedback>;

  const done = item.deliverables.filter((deliverable) => deliverable.done).length;
  const next = handoffLines(item);
  const lifeNote = life === "usuario"
    ? "Vitalsy Life: el paciente ya es usuario. Sincronizar el plan de seguimiento."
    : life === "invitacion"
      ? `Vitalsy Life: invitación ${encounterId}.`
      : life === "rechaza"
        ? "Vitalsy Life: el paciente rechaza el seguimiento digital."
        : "";

  return (
    <Sheet kicker="Alta y egreso" title={item.patientName} wide clinic="file" className="floor-care ops-board">
      <div className="ops-identity">
        <p>{item.location ?? "Ubicación no registrada"}</p>
        <StatusPill tone={item.exit ? "success" : "info"}>{item.exit ? "Egresó" : "Proceso de alta"}</StatusPill>
      </div>
      <section className="ops-next" aria-label="Quién sigue">
        <h3>Quién sigue</h3>
        <ul>
          {next.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>
      <Panel title="Cadena de entregables" aside={`${done} de ${item.deliverables.length}`}>
        <ul className="deliverables">
          {item.deliverables.map((deliverable, index) => (
            <li key={deliverable.id} className={deliverable.done ? "done" : undefined}>
              <span>{index + 1}. {deliverable.label}</span>
              <strong>{deliverable.done ? "Listo" : "Pendiente"}</strong>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="ops-roles" aria-label="Perspectiva operativa">
        {PERSPECTIVES.map((perspective) => (
          <span key={perspective.id} className={role === perspective.id ? "is-active" : undefined}>
            {perspective.label}
          </span>
        ))}
      </div>
      <div ref={bannerRef} className="ops-banner">
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        {notice ? <Feedback tone="success" label="Resultado del egreso">{notice}</Feedback> : null}
      </div>

      {(role === "medico_tratante" || role === "medico_residente") && !item.order ? (
        <form className="stack ops-form" onSubmit={(event) => { event.preventDefault(); void submit(`/api/v1/discharge/encounters/${encounterId}/order`, {}, "Orden digital de alta registrada. Sigue el médico residente con la epicrisis. Trabajo social y enfermería avanzan en paralelo."); }}>
          <p>Si el paciente cumple criterios de estabilidad, autorice el egreso.</p>
          <Button type="submit" pending={pending}>Registrar orden de alta</Button>
        </form>
      ) : null}

      {role === "medico_residente" && item.order && !item.epicrisis ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/epicrisis`, {
            diagnoses: form.diagnoses ?? "",
            procedures: form.procedures ?? "",
            evolution: form.evolution ?? "",
          }, "Epicrisis electrónica registrada.");
        }}>
          <TextAreaField id="diagnoses" label="Diagnósticos" value={form.diagnoses ?? ""} onChange={onField("diagnoses")} />
          <TextAreaField id="procedures" label="Procedimientos" value={form.procedures ?? ""} onChange={onField("procedures")} />
          <TextAreaField id="evolution" label="Evolución" value={form.evolution ?? ""} onChange={onField("evolution")} />
          <Button type="submit" pending={pending}>Guardar epicrisis</Button>
        </form>
      ) : null}

      {role === "medico_residente" && item.epicrisis && !item.prescriptions ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/prescriptions`, {
            items: [{
              drug: form.drug ?? "",
              dose: form.dose ?? "",
              route: form.route ?? "",
              frequency: form.frequency ?? "",
              days: Number(form.days || 0),
            }],
          }, "Recetas ambulatorias emitidas.");
        }}>
          <TextField id="drug" label="Medicamento" value={form.drug ?? ""} onChange={onField("drug")} />
          <TextField id="dose" label="Dosis" value={form.dose ?? ""} onChange={onField("dose")} />
          <TextField id="route" label="Vía" value={form.route ?? ""} onChange={onField("route")} />
          <TextField id="frequency" label="Frecuencia" value={form.frequency ?? ""} onChange={onField("frequency")} />
          <TextField id="days" label="Días" inputMode="numeric" value={form.days ?? ""} onChange={onField("days")} />
          <Button type="submit" pending={pending}>Emitir receta</Button>
        </form>
      ) : null}

      {role === "trabajo_social" && item.order && !item.socialAssessment ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/social-assessment`, {
            report: form.report ?? "",
            validated: form.validated === "si",
          }, "Valoración social registrada.");
        }}>
          <TextAreaField id="report" label="Informe de valoración social" value={form.report ?? ""} onChange={onField("report")} />
          <TextField id="validated" label="¿Entorno adecuado? (si/no)" value={form.validated ?? ""} onChange={onField("validated")} />
          <Button type="submit" pending={pending}>Guardar valoración</Button>
        </form>
      ) : null}

      {role === "enfermera_piso" && item.order && !item.reconciliation ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/reconciliation`, { notes: form.notes ?? "" }, "Conciliación farmacéutica al alta registrada.");
        }}>
          {item.epicrisis ? <p>Epicrisis: {item.epicrisis.diagnoses}</p> : <p className="hint">La epicrisis aún no está disponible.</p>}
          <TextAreaField id="notes" label="Resultado de la conciliación" value={form.notes ?? ""} onChange={onField("notes")} />
          <Button type="submit" pending={pending}>Registrar conciliación</Button>
        </form>
      ) : null}

      {role === "enfermera_piso" && item.reconciliation && !item.nursingReport ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (!lifeNote) {
            setError("Indique el seguimiento en Vitalsy Life.");
            return;
          }
          void submit(`/api/v1/discharge/encounters/${encounterId}/nursing-report`, {
            instructions: form.instructions ?? "",
            alarmSigns: form.alarmSigns ?? "",
            homeCare: [form.homeCare ?? "", lifeNote].filter(Boolean).join("\n"),
          }, "Informe digital de alta de enfermería generado.");
        }}>
          <TextAreaField id="instructions" label="Indicaciones de medicamentos" value={form.instructions ?? ""} onChange={onField("instructions")} />
          <TextAreaField id="alarmSigns" label="Signos de alarma" value={form.alarmSigns ?? ""} onChange={onField("alarmSigns")} />
          <TextAreaField id="homeCare" label="Cuidados domiciliarios" value={form.homeCare ?? ""} onChange={onField("homeCare")} />
          <VitalsyLifeCard encounterId={encounterId} life={life} onChange={setLife} />
          <Button type="submit" pending={pending}>Generar informe</Button>
        </form>
      ) : null}

      {item.nursingReport?.homeCare?.includes("Vitalsy Life") ? (
        <VitalsyLifeCard
          encounterId={encounterId}
          savedLine={item.nursingReport.homeCare.split("\n").find((line) => line.includes("Vitalsy Life"))}
        />
      ) : null}

      {role === "enfermera_piso" && item.nursingReport && !item.indicationReceipt ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/indication-receipt`, {
            receivedByName: form.receivedByName ?? "",
          }, "Recepción de indicaciones confirmada.");
        }}>
          <TextField id="receivedByName" label="Nombre de quien recibe" value={form.receivedByName ?? ""} onChange={onField("receivedByName")} />
          <Button type="submit" pending={pending}>Confirmar recepción</Button>
        </form>
      ) : null}

      {role === "altas_caja" && item.order && item.account?.status !== "conforme" ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/account`, { status: "conforme" }, "Estado de cuenta verificado.");
        }}>
          <p>Verifique el pago o la cobertura antes de emitir el pase.</p>
          <Button type="submit" pending={pending}>Marcar liquidación conforme</Button>
        </form>
      ) : null}

      {role === "altas_caja" && item.account?.status === "conforme" && !item.exitPass ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/exit-pass`, {}, "Pase de salida digital emitido.");
        }}>
          <Button type="submit" pending={pending}>Emitir pase de salida</Button>
        </form>
      ) : null}

      {role === "camillero" && item.exitPass && !item.exit ? (
        <section className="ops-form">
          <p>El pase de salida ya está emitido. Traslade al paciente. La salida efectiva la registra una sola persona: la enfermera de piso.</p>
        </section>
      ) : null}

      {role === "enfermera_piso" && item.exitPass && !item.exit ? (
        <form className="stack ops-form" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/exit`, {}, "Salida efectiva registrada. La cama queda vacante.");
        }}>
          <Button type="submit" pending={pending}>Registrar salida efectiva</Button>
        </form>
      ) : null}

      {item.exit ? <Feedback tone="success">El paciente ya egresó.</Feedback> : null}
    </Sheet>
  );
}

function VitalsyLifeCard({
  encounterId,
  life = "",
  onChange,
  savedLine,
}: {
  encounterId: string;
  life?: string;
  onChange?: (value: string) => void;
  savedLine?: string;
}) {
  const invitation = life === "invitacion" || Boolean(savedLine?.includes("invitación"));
  const showQr = onChange ? life !== "usuario" && life !== "rechaza" : invitation;

  return (
    <section className="ops-life-card" aria-label="Vitalsy Life">
      <header className="ops-life-head">
        <span className="ops-life-mark" aria-hidden="true">VL</span>
        <div>
          <strong>Vitalsy Life</strong>
          <span>App de Continuidad Ambulatoria</span>
        </div>
      </header>
      <p>
        Permite al paciente y a sus cuidadores consultar el plan de alta, los signos de alarma y los recordatorios de medicación.
      </p>
      {showQr ? (
        <div className="ops-life-code">
          <LifeQr value={encounterId} />
          <strong>Código de invitación</strong>
          <span>{encounterId}</span>
          <small>El paciente lo escanea para vincular la app.</small>
        </div>
      ) : null}
      {onChange ? (
        <div className="ops-life-options" role="radiogroup" aria-label="Seguimiento en Vitalsy Life">
          <label>
            <input type="radio" name="life" value="usuario" checked={life === "usuario"} onChange={() => onChange("usuario")} />
            <span>Ya es usuario: sincronizar el plan domiciliario</span>
          </label>
          <label>
            <input type="radio" name="life" value="invitacion" checked={life === "invitacion"} onChange={() => onChange("invitacion")} />
            <span>No es usuario: generar invitación</span>
          </label>
          <label>
            <input type="radio" name="life" value="rechaza" checked={life === "rechaza"} onChange={() => onChange("rechaza")} />
            <span>Rechaza el seguimiento digital</span>
          </label>
        </div>
      ) : (
        <p className="ops-life-saved">{savedLine}</p>
      )}
    </section>
  );
}

function LifeQr({ value }: { value: string }) {
  const [markup, setMarkup] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      width: 144,
      color: { dark: "#1B2228", light: "#FFFFFF" },
    }).then((svg) => {
      if (active) setMarkup(svg);
    }).catch(() => {
      if (active) setMarkup("");
    });
    return () => {
      active = false;
    };
  }, [value]);

  if (!markup) return <div className="ops-life-qr" aria-hidden="true" />;
  return <div className="ops-life-qr" role="img" aria-label={`Código QR ${value}`} dangerouslySetInnerHTML={{ __html: markup }} />;
}
