import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { TextAreaField, TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { type DischargeCase } from "../domain/discharge";

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

  return (
    <Sheet kicker="Alta y egreso" title="Conciliación, educación e informe de alta" wide>
      <p className="lead">{item.patientName} · {item.location ?? "Ubicación no registrada"}</p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success" label="Resultado del egreso">{notice}</Feedback> : null}
      <Panel title="Entregables del egreso">
        <ul className="deliverables">
          {item.deliverables.map((deliverable) => (
            <li key={deliverable.id} className={deliverable.done ? "done" : undefined}>
              <span>{deliverable.label}</span>
              <strong>{deliverable.done ? "Listo" : "Pendiente"}</strong>
            </li>
          ))}
        </ul>
      </Panel>

      {(role === "medico_tratante" || role === "medico_residente") && !item.order ? (
        <form className="stack" onSubmit={(event) => { event.preventDefault(); void submit(`/api/v1/discharge/encounters/${encounterId}/order`, {}, "Orden digital de alta registrada. Trabajo social ya fue notificado."); }}>
          <p>Si el paciente cumple criterios de estabilidad, autorice el egreso.</p>
          <Button type="submit" pending={pending}>Registrar orden de alta</Button>
        </form>
      ) : null}

      {role === "medico_residente" && item.order && !item.epicrisis ? (
        <form className="stack" onSubmit={(event: FormEvent) => {
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
        <form className="stack" onSubmit={(event: FormEvent) => {
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
        <form className="stack" onSubmit={(event: FormEvent) => {
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
        <form className="stack" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/reconciliation`, { notes: form.notes ?? "" }, "Conciliación farmacéutica al alta registrada.");
        }}>
          {item.epicrisis ? <p>Epicrisis: {item.epicrisis.diagnoses}</p> : <p className="hint">La epicrisis aún no está disponible.</p>}
          <TextAreaField id="notes" label="Resultado de la conciliación" value={form.notes ?? ""} onChange={onField("notes")} />
          <Button type="submit" pending={pending}>Registrar conciliación</Button>
        </form>
      ) : null}

      {role === "enfermera_piso" && item.reconciliation && !item.nursingReport ? (
        <form className="stack" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/nursing-report`, {
            instructions: form.instructions ?? "",
            alarmSigns: form.alarmSigns ?? "",
            homeCare: form.homeCare ?? "",
          }, "Informe digital de alta de enfermería generado.");
        }}>
          <TextAreaField id="instructions" label="Indicaciones de medicamentos" value={form.instructions ?? ""} onChange={onField("instructions")} />
          <TextAreaField id="alarmSigns" label="Signos de alarma" value={form.alarmSigns ?? ""} onChange={onField("alarmSigns")} />
          <TextAreaField id="homeCare" label="Cuidados domiciliarios" value={form.homeCare ?? ""} onChange={onField("homeCare")} />
          <Button type="submit" pending={pending}>Generar informe</Button>
        </form>
      ) : null}

      {role === "enfermera_piso" && item.nursingReport && !item.indicationReceipt ? (
        <form className="stack" onSubmit={(event: FormEvent) => {
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
        <form className="stack" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/account`, { status: "conforme" }, "Estado de cuenta verificado.");
        }}>
          <p>Verifique el pago o la cobertura antes de emitir el pase.</p>
          <Button type="submit" pending={pending}>Marcar liquidación conforme</Button>
        </form>
      ) : null}

      {role === "altas_caja" && item.account?.status === "conforme" && !item.exitPass ? (
        <form className="stack" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit(`/api/v1/discharge/encounters/${encounterId}/exit-pass`, {}, "Pase de salida digital emitido.");
        }}>
          <Button type="submit" pending={pending}>Emitir pase de salida</Button>
        </form>
      ) : null}

      {role === "camillero" && item.exitPass && !item.exit ? (
        <Feedback tone="info">La salida está autorizada. Traslade al paciente y avise a enfermería para registrar la salida efectiva.</Feedback>
      ) : null}

      {role === "enfermera_piso" && item.exitPass && !item.exit ? (
        <form className="stack" onSubmit={(event: FormEvent) => {
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
