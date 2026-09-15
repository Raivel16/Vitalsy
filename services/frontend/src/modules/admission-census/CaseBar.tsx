import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../app/api";
import { ROLE_LABEL } from "../../app/roles";
import { useAuth } from "../../app/AuthProvider";
import { errorText } from "../../app/userMessage";
import { Feedback } from "../../shared/ui/Sheet";
import { EncounterContext, type CoverageStatus } from "./EncounterContext";
import type { Encounter } from "./domain/encounter";
import { AdmissionStepper } from "./ui/AdmissionStepper";

function asCoverage(status: string | null | undefined): CoverageStatus | null {
  if (status === "aprobada" || status === "pendiente" || status === "rechazada") return status;
  return null;
}

export function CaseBar({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ingreso) {
      setEncounter(null);
      setCoverageStatus(null);
      setError("");
      return undefined;
    }
    let active = true;
    api<{ encounter: Encounter }>(`/api/v1/hospital-admission/encounters/${encodeURIComponent(ingreso)}`)
      .then((data) => {
        if (!active) return;
        setEncounter(data.encounter);
        setCoverageStatus(asCoverage(data.encounter.coverage.status));
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo abrir el ingreso."));
      });
    return () => {
      active = false;
    };
  }, [ingreso]);

  const value = useMemo(() => ({
    encounter,
    coverageStatus,
    setCoverageStatus,
    applyEncounter: (next: Encounter) => {
      setEncounter(next);
      setCoverageStatus(asCoverage(next.coverage.status));
    },
  }), [coverageStatus, encounter]);

  return (
    <EncounterContext.Provider value={value}>
      {ingreso ? (
        <section className="case-bar" aria-label="Ingreso en curso">
          {!encounter && !error ? <p role="status">Cargando el ingreso en curso.</p> : null}
          {error ? <Feedback tone="error">{error}</Feedback> : null}
          {encounter ? (
            <>
              <p>
                <strong>{encounter.patientName}</strong>
                <span>{encounter.statusLabel}. {encounter.currentStepLabel}.</span>
              </p>
              {encounter.progress ? <AdmissionStepper steps={encounter.progress} /> : null}
              <div className="actions">
                <Link to={`/pacientes/${encounter.encounterId}`}>Ver ficha</Link>
                {encounter.nextRole && user && encounter.nextRole !== user.role && encounter.currentStep !== "derivacion" ? (
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
