import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { api } from "../../app/api";
import { ROLE_LABEL } from "../../app/roles";
import { useAuth } from "../../app/AuthProvider";
import { isClinicalRole, primaryAttentionPath } from "../../app/navigation";
import { errorText } from "../../app/userMessage";
import { Feedback } from "../../shared/ui/Sheet";
import { LoadingState } from "../../shared/ui/LoadingState";
import { EncounterContext, type CoverageStatus } from "./EncounterContext";
import type { Encounter } from "./domain/encounter";
import { canActOnEncounter } from "./domain/steps";
import { AdmissionStepper } from "./ui/AdmissionStepper";

function asCoverage(status: string | null | undefined): CoverageStatus | null {
  if (status === "aprobada" || status === "pendiente" || status === "rechazada") return status;
  return null;
}

export function CaseBar({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus | null>(null);
  const [error, setError] = useState("");

  const hideAdmissionStepper =
    location.pathname.startsWith("/atencion") || encounter?.currentStep === "cerrado";

  useEffect(() => {
    if (!ingreso) {
      setEncounter(null);
      setCoverageStatus(null);
      setError("");
      sessionStorage.removeItem("vitalsy-ingreso");
      return undefined;
    }
    sessionStorage.setItem("vitalsy-ingreso", ingreso);
    let active = true;
    setEncounter(null);
    setError("");
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
      if (!next?.encounterId) return;
      setEncounter(next);
      setCoverageStatus(asCoverage(next.coverage.status));
    },
  }), [coverageStatus, encounter]);

  // Una sola carga global: no montar pantallas hasta tener el ingreso (evita dobles barras).
  if (ingreso && !encounter && !error) {
    return (
      <EncounterContext.Provider value={value}>
        <LoadingState label="Cargando…" />
      </EncounterContext.Provider>
    );
  }

  return (
    <EncounterContext.Provider value={value}>
      {ingreso && error ? <Feedback tone="error">{error}</Feedback> : null}
      {ingreso && encounter ? (
        <section className="case-bar" aria-label="Ingreso en curso">
          <p>
            <strong>{encounter.patientName}</strong>
            <span>{encounter.statusLabel}</span>
          </p>
          {!hideAdmissionStepper && encounter.progress ? (
            <AdmissionStepper
              steps={encounter.progress}
              role={user?.role}
              encounterId={encounter.encounterId}
              currentStep={encounter.currentStep}
            />
          ) : null}
          <div className="actions">
            <Link to={`/pacientes/${encounter.encounterId}`}>Ver ficha</Link>
            {isClinicalRole(user?.role ?? "admision") ? (
              <Link to={`/atencion/chart?ingreso=${encodeURIComponent(encounter.encounterId)}`}>
                Expediente clínico
              </Link>
            ) : null}
            {encounter.currentStep === "cerrado" && user && isClinicalRole(user.role) ? (
              <Link to={primaryAttentionPath(user.role, encounter.encounterId)}>Atención en piso</Link>
            ) : null}
            {encounter.nextRole && user && !canActOnEncounter(user.role, encounter) && encounter.currentStep !== "derivacion" ? (
              <span>Este paso corresponde a {ROLE_LABEL[encounter.nextRole]}.</span>
            ) : null}
          </div>
        </section>
      ) : null}
      {children}
    </EncounterContext.Provider>
  );
}
