import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { IconNotes, IconClipboardList, IconStethoscope } from "@tabler/icons-react";
import { api } from "../../app/api";
import { useAuth } from "../../app/AuthProvider";
import { isClinicalRole, primaryAttentionPath } from "../../app/navigation";
import { errorText } from "../../app/userMessage";
import { Feedback } from "../../shared/ui/Sheet";
import { LoadingState } from "../../shared/ui/LoadingState";
import { EncounterContext, type CoverageStatus } from "./EncounterContext";
import type { Encounter } from "./domain/encounter";
import { AdmissionStepper } from "./ui/AdmissionStepper";

function asCoverage(status: string | null | undefined): CoverageStatus | null {
  if (status === "aprobada" || status === "pendiente" || status === "rechazada") return status;
  return null;
}

export function CaseBar({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const { encounterId: routeEncounterId } = useParams();
  const pathId = location.pathname.match(/^\/pacientes\/([^/]+)$/)?.[1];
  const fileId = routeEncounterId && routeEncounterId !== "nuevo"
    ? routeEncounterId
    : pathId && pathId !== "nuevo"
      ? pathId
      : null;
  const fromFile = fileId;
  const ingreso = params.get("ingreso") ?? fromFile;
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus | null>(null);
  const [error, setError] = useState("");

  const onAttention = location.pathname.startsWith("/atencion");
  const onAlerts = location.pathname.startsWith("/alertas");
  const floorContext = onAttention || onAlerts;
  const hideAdmissionStepper = onAttention || encounter?.currentStep === "cerrado";

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
      .catch((error_) => {
        if (active) setError(errorText(error_, "No se pudo abrir el ingreso."));
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
        <section className={floorContext ? "case-bar case-bar-clinical case-bar-floor" : "case-bar case-bar-clinical"} aria-label="Ingreso en curso">
            <div className="case-bar-top">
              <div className="case-bar-main">
                <div className={floorContext ? "case-bar-cluster" : undefined}>
                <div className="case-bar-avatar" aria-hidden>
                  {encounter.patientName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("")}
                </div>
                <div className="case-bar-identity">
                  <p className="case-bar-name">
                    <strong>{encounter.patientName}</strong>
                    {floorContext ? (
                      <span className="case-bar-doc">{encounter.documentType} {encounter.documentNumber}</span>
                    ) : null}
                    {!floorContext ? (
                      <span className={`case-bar-status${encounter.currentStep === "cerrado" || /hospitalizado/i.test(encounter.statusLabel) ? " is-hosp" : ""}`}>
                        {encounter.currentStep === "cerrado" || /hospitalizado/i.test(encounter.statusLabel)
                          ? encounter.statusLabel
                          : "En trámite"}
                      </span>
                    ) : null}
                  </p>
                  <p className="case-bar-meta">
                    {floorContext
                      ? (encounter.location.service ?? encounter.originService ?? "Hospitalización")
                      : ([
                        encounter.orderNumber,
                        encounter.originService,
                        encounter.location.room ? `Habitación ${encounter.location.room}` : null,
                        encounter.location.bed ? `Cama ${encounter.location.bed}` : null,
                      ].filter(Boolean).join(" · ") || "Sin ubicación")}
                  </p>
                </div>
                {floorContext ? (
                  <>
                    <span className={`case-bar-status${encounter.currentStep === "cerrado" || /hospitalizado/i.test(encounter.statusLabel) ? " is-hosp" : ""}`}>
                      {encounter.currentStep === "cerrado" || /hospitalizado/i.test(encounter.statusLabel)
                        ? encounter.statusLabel
                        : "En trámite"}
                    </span>
                    <div className="case-bar-place">
                      <strong>
                        {[
                          encounter.location.room ? `Habitación ${encounter.location.room}` : null,
                          encounter.location.bed ? `Lecho ${encounter.location.bed}` : null,
                        ].filter(Boolean).join(" · ") || "Sin ubicación"}
                      </strong>
                      <span>{encounter.location.service ?? encounter.originService ?? "Servicio no registrado"}</span>
                    </div>
                  </>
                ) : null}
                </div>
              </div>
              <div className="actions case-bar-actions">
                <Link className="button button-quiet case-bar-btn" to={`/pacientes/${encounter.encounterId}`}>
                  <IconNotes size={16} /> <span>Ver ficha de admisión</span>
                </Link>
                {isClinicalRole(user?.role ?? "admision") ? (
                  <Link
                    className={location.pathname.startsWith("/atencion/chart") ? "button case-bar-btn is-current" : "button button-quiet case-bar-btn"}
                    to={`/atencion/chart?ingreso=${encodeURIComponent(encounter.encounterId)}`}
                  >
                    <IconClipboardList size={16} /> <span>Expediente clínico</span>
                  </Link>
                ) : null}
                {encounter.currentStep === "cerrado" && user && isClinicalRole(user.role) && !location.pathname.startsWith("/atencion") ? (
                  <Link className="button button-quiet case-bar-btn" to={primaryAttentionPath(user.role, encounter.encounterId)}>
                    <IconStethoscope size={16} /> <span>Atención en piso</span>
                  </Link>
                ) : null}
              </div>
            </div>
            {!hideAdmissionStepper && encounter.progress ? (
              <div className="case-bar-steps">
                <AdmissionStepper
                  steps={encounter.progress}
                  role={user?.role}
                  encounterId={encounter.encounterId}
                  currentStep={encounter.currentStep}
                />
              </div>
            ) : null}
          </section>
      ) : null}
      {children}
    </EncounterContext.Provider>
  );
}
