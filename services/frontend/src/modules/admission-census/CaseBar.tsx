import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { api } from "../../app/api";
import { ROLE_LABEL } from "../../app/roles";
import { useAuth } from "../../app/AuthProvider";
import { errorText } from "../../app/userMessage";
import { Feedback } from "../../shared/ui/Sheet";
import { EncounterContext } from "./EncounterContext";
import type { Encounter } from "./domain/encounter";
import { STEP_PATH } from "./domain/steps";
import type { ReactNode } from "react";

export function CaseBar({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const ingreso = params.get("ingreso");
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!ingreso) {
      setEncounter(null);
      setError("");
      setNotice("");
      return undefined;
    }
    let active = true;
    api<{ encounter: Encounter }>(`/api/v1/hospital-admission/encounters/${encodeURIComponent(ingreso)}`)
      .then((data) => {
        if (active) setEncounter(data.encounter);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo abrir el ingreso."));
      });
    return () => {
      active = false;
    };
  }, [ingreso]);

  async function confirmStep() {
    if (!encounter) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ encounter: Encounter }>(
        `/api/v1/hospital-admission/encounters/${encodeURIComponent(encounter.encounterId)}/advance`,
        { method: "POST", body: JSON.stringify({ step: encounter.currentStep }) },
      );
      setEncounter(data.encounter);
      setNotice(data.encounter.nextRole
        ? `Paso registrado. Continúa ${ROLE_LABEL[data.encounter.nextRole]}.`
        : "Paso registrado. El ingreso queda a la espera de la cobertura.");
    } catch (caught) {
      setError(errorText(caught, "No se pudo registrar el paso."));
    } finally {
      setPending(false);
    }
  }

  const expectedPath = encounter ? STEP_PATH[encounter.currentStep] : undefined;
  const onStep = Boolean(encounter && expectedPath && location.pathname === expectedPath);
  const own = Boolean(encounter && user && encounter.nextRole === user.role);

  return (
    <EncounterContext.Provider value={encounter}>
      {ingreso ? (
        <section className="case-bar" aria-label="Ingreso en curso">
          {!encounter && !error ? <p role="status">Cargando el ingreso en curso.</p> : null}
          {error ? <Feedback tone="error">{error}</Feedback> : null}
          {notice ? <Feedback tone="success">{notice}</Feedback> : null}
          {encounter ? (
            <>
              <p>
                <strong>{encounter.patientName}</strong>
                <span>{encounter.statusLabel}. {encounter.currentStepLabel}.</span>
              </p>
              <div className="actions">
                <Link to={`/pacientes/${encounter.encounterId}`}>Ver ficha</Link>
                {own && onStep ? (
                  <button className="button" type="button" onClick={() => void confirmStep()} disabled={pending}>
                    Confirmar paso en el censo
                  </button>
                ) : null}
                {encounter.nextRole && user && encounter.nextRole !== user.role ? (
                  <span>Este paso corresponde a {ROLE_LABEL[encounter.nextRole]}.</span>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      ) : null}
      {children}
    </EncounterContext.Provider>
  );
}
