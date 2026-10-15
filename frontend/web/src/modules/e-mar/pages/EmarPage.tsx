import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { errorText } from "../../../app/userMessage";
import { useEncounter } from "../../admission-census/EncounterContext";
import { Button } from "../../../shared/ui/Button";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { StatusPill, type ClinicalTone } from "../../../shared/ui/clinical";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { BarcodeScanner } from "../../../shared/ui/BarcodeScanner";
import { formatDateTime } from "../../../shared/datetime/format";

type Dose = {
  id: number;
  drugName: string;
  dose: string;
  route: string;
  status: string;
  scheduledAt?: string | null;
  administeredAt?: string | null;
  expectedPatientBarcode: string | null;
  expectedDrugBarcode: string;
};

function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDateTime(iso);
  return `${date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false })} hrs`;
}

function isOverdue(dose: Dose): boolean {
  if (dose.status !== "pendiente" || !dose.scheduledAt) return false;
  return new Date(dose.scheduledAt).getTime() < Date.now();
}

function doseTone(dose: Dose): ClinicalTone {
  if (dose.status === "administrado") return "success";
  if (isOverdue(dose)) return "warning";
  if (dose.status === "pendiente") return "info";
  return "neutral";
}

function doseStatusLabel(dose: Dose): string {
  if (dose.status === "administrado") return "Administrada";
  if (isOverdue(dose)) return "Vencida";
  if (dose.status === "pendiente") return "Pendiente";
  return dose.status;
}

export function EmarPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const encounter = useEncounter();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [hasActivePrescription, setHasActivePrescription] = useState(true);
  const [shiftLabel, setShiftLabel] = useState("");
  const [selected, setSelected] = useState<Dose | null>(null);
  const [patientBarcode, setPatientBarcode] = useState("");
  const [drugBarcode, setDrugBarcode] = useState("");
  const [sign, setSign] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const discrepancyRef = useRef<HTMLElement>(null);
  const [nowLabel, setNowLabel] = useState(() =>
    new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false }),
  );

  function load() {
    if (!ingreso) return;
    api<{ doses: Dose[]; hasActivePrescription?: boolean; shiftStart?: string; shiftEnd?: string }>(
      `/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/emar`,
    )
      .then((data) => {
        setDoses(data.doses);
        setHasActivePrescription(data.hasActivePrescription ?? true);
        if (data.shiftStart && data.shiftEnd) {
          setShiftLabel(`${formatDateTime(data.shiftStart)} – ${formatDateTime(data.shiftEnd)}`);
        }
      })
      .catch((error_) => setError(errorText(error_, "No se pudo cargar el e-MAR.")));
  }

  useEffect(() => {
    load();
  }, [ingreso]);

  useEffect(() => {
    if (!error || !selected || typeof discrepancyRef.current?.scrollIntoView !== "function") return;
    discrepancyRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [error, selected]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowLabel(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false }));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const patientOk = Boolean(
    selected?.expectedPatientBarcode && patientBarcode.trim() === selected.expectedPatientBarcode,
  );
  const drugOk = drugBarcode.trim() === selected?.expectedDrugBarcode;

  const activeCount = useMemo(
    () => doses.filter((dose) => dose.status === "pendiente").length,
    [doses],
  );

  async function onAdminister(event: SyntheticEvent) {
    event.preventDefault();
    if (!ingreso || !selected) return;
    setError("");
    setNotice("");
    try {
      await api(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/emar/${selected.id}/administer`, {
        method: "POST",
        body: JSON.stringify({ patientBarcode, drugBarcode, sign }),
      });
      setNotice("Dosis administrada y firmada.");
      setSelected(null);
      setPatientBarcode("");
      setDrugBarcode("");
      load();
    } catch (error_) {
      setError(errorText(error_, "No se pudo administrar la dosis."));
    }
  }

  if (!ingreso) {
    return (
      <Sheet kicker="Administración verificada" title="e-MAR del turno" wide clinic="file" className="floor-care">
        <EmptyEncounter message="Abra un paciente hospitalizado para consultar el e-MAR." />
      </Sheet>
    );
  }

  return (
    <Sheet
      kicker="Administración verificada"
      title="e-MAR del turno"
      wide
      clinic="file"
      className="floor-care"
      aside={(
        <aside className="emar-clock" aria-label="Hora de estación">
          <span className="emar-clock-label">Hora actual de estación</span>
          <strong>{nowLabel} hrs</strong>
        </aside>
      )}
    >
      <p className="lead">
        Dosis del turno
        {encounter ? ` para ${encounter.patientName}` : ""}
        {shiftLabel ? (
          <>
            {" · "}
            <strong>Turno {shiftLabel}</strong>
          </>
        ) : null}
        . Verifique los cinco correctos antes de firmar.
      </p>

      {error && !selected ? (
        <aside className="state-card state-danger" role="alert">
          <div>
            <p className="state-card-title">Discrepancia detectada <span className="status-pill pill-danger">Bloqueante</span></p>
            <p>{error}</p>
          </div>
        </aside>
      ) : null}
      {notice ? (
        <output className="state-card state-success" aria-label="Resultado de administración">
          <div>
            <p className="state-card-title">Dosis administrada y firmada digitalmente <span className="status-pill pill-success">Sincronizado</span></p>
            <p>{notice}</p>
          </div>
        </output>
      ) : null}

      {!hasActivePrescription ? (
        <Feedback tone="info">
          No hay prescripción CPOE activa. El médico tratante debe registrar el plan en CPOE.
        </Feedback>
      ) : null}

      {hasActivePrescription && doses.length === 0 ? (
        <Feedback tone="info">No hay dosis programadas en el turno vigente para el plan activo.</Feedback>
      ) : null}

      {doses.length > 0 ? (
        <section className="emar-kardex" aria-label="Kardex horario del paciente">
          <header className="emar-kardex-head">
            <div>
              <h3>Kardex Horario del Paciente</h3>
              <StatusPill tone="info">{activeCount} pendientes</StatusPill>
            </div>
            <p className="hint">CPOE sincronizado con el plan activo del ingreso</p>
          </header>
          <div className="table-wrap">
            <table className="emar-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Dosis / Dilución</th>
                  <th>Vía</th>
                  <th>Hora prog.</th>
                  <th>Estado y trazabilidad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {doses.map((dose) => {
                  const active = selected?.id === dose.id;
                  const overdue = isOverdue(dose);
                  return (
                    <tr key={dose.id} className={active ? "emar-row-active" : undefined}>
                      <td>
                        <div className="emar-drug">
                          {active ? <span className="emar-drug-bar" aria-hidden /> : null}
                          <div>
                            <strong>{dose.drugName}</strong>
                            {overdue ? <StatusPill tone="warning">Prioritaria</StatusPill> : null}
                          </div>
                        </div>
                      </td>
                      <td>{dose.dose}</td>
                      <td><span className="emar-route">{dose.route}</span></td>
                      <td className="tabular-nums">{timeLabel(dose.scheduledAt)}</td>
                      <td>
                        <div className="emar-status">
                          <StatusPill tone={doseTone(dose)}>{doseStatusLabel(dose)}</StatusPill>
                          {dose.status === "administrado" && dose.administeredAt ? (
                            <span className="hint">{timeLabel(dose.administeredAt)}</span>
                          ) : null}
                          {dose.status === "pendiente" && !overdue ? (
                            <span className="hint">Dosis en ventana</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="col-action">
                        {dose.status === "pendiente" ? (
                          <Button
                            type="button"
                            variant={active || overdue ? "primary" : "quiet"}
                            onClick={() => {
                              setSelected(dose);
                              setPatientBarcode("");
                              setDrugBarcode("");
                              setError("");
                              setNotice("");
                            }}
                          >
                            {overdue ? "Justificar / Administrar" : "Verificar y administrar"}
                          </Button>
                        ) : (
                          <span className="hint">Registrada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {selected ? (
        <form className="emar-verify" onSubmit={onAdminister} noValidate>
          <header className="emar-verify-head">
            <div>
              <h3>Verificación de Seguridad al Pie de Cama · 5 Correctos</h3>
              <p className="hint">
                Validación de cabecera para {selected.drugName} {selected.dose} ({timeLabel(selected.scheduledAt)})
              </p>
              <p className="hint">
                Código esperado del medicamento: <code>{selected.expectedDrugBarcode}</code>
                {selected.expectedPatientBarcode ? (
                  <> · Brazalete paciente: <code>{selected.expectedPatientBarcode}</code></>
                ) : null}
              </p>
            </div>
          </header>

          <div className="emar-scan-grid">
            <div className={`emar-scan-card${patientOk ? " is-ok" : ""}`}>
              <TextField
                id="patient-bc"
                label="Código paciente (brazalete)"
                value={patientBarcode}
                onChange={(e) => setPatientBarcode(e.target.value)}
                required
              />
              <BarcodeScanner label="Escanear brazalete" onScan={(code) => setPatientBarcode(code)} />
              {patientOk ? <p className="emar-ok">Validado</p> : <p className="hint">Escanee o escriba el código de la pulsera</p>}
            </div>
            <div className={`emar-scan-card${drugOk ? " is-ok" : ""}`}>
              <TextField
                id="drug-bc"
                label="Código medicamento"
                value={drugBarcode}
                onChange={(e) => setDrugBarcode(e.target.value)}
                required
              />
              <BarcodeScanner label="Escanear medicamento" onScan={(code) => setDrugBarcode(code)} />
              {drugOk ? <p className="emar-ok">Validado</p> : <p className="hint">Escanee o escriba el código del fármaco</p>}
            </div>
          </div>

          <div className="emar-five" aria-label="Auditoría de los 5 correctos">
            <p className="kicker">Auditoría de los 5 correctos (OMS / JCI)</p>
            <ul>
              <li className={patientOk ? "is-ok" : undefined}>
                <strong>1. Paciente</strong>
                <span>{encounter?.patientName ?? "Pendiente"}</span>
              </li>
              <li className={drugOk ? "is-ok" : undefined}>
                <strong>2. Fármaco</strong>
                <span>{selected.drugName}</span>
              </li>
              <li className={drugOk ? "is-ok" : undefined}>
                <strong>3. Dosis</strong>
                <span>{selected.dose}</span>
              </li>
              <li className={drugOk ? "is-ok" : undefined}>
                <strong>4. Vía</strong>
                <span>{selected.route}</span>
              </li>
              <li className={patientOk && drugOk ? "is-ok" : undefined}>
                <strong>5. Hora</strong>
                <span>{timeLabel(selected.scheduledAt)}</span>
              </li>
            </ul>
          </div>

          <label className="check">
            <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} />
            {" "}
            Confirmo la administración según indicación médica y validación del e-MAR.
          </label>

          {error ? (
            <aside ref={discrepancyRef} className="state-card state-danger" role="alert">
              <div>
                <p className="state-card-title">Discrepancia detectada <span className="status-pill pill-danger">Bloqueante</span></p>
                <p>{error}</p>
              </div>
            </aside>
          ) : null}

          <div className="form-actions-bar">
            <Button
              type="button"
              variant="quiet"
              onClick={() => {
                setSelected(null);
                setPatientBarcode("");
                setDrugBarcode("");
              }}
            >
              Cancelar / Posponer
            </Button>
            <Button type="submit">Confirmar administración</Button>
          </div>
        </form>
      ) : null}
    </Sheet>
  );
}
