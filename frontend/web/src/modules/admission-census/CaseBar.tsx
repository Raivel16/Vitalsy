import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { IconNotes, IconClipboardList, IconStethoscope } from "@tabler/icons-react";
import { api } from "../../app/api";
import { useAuth } from "../../app/AuthProvider";
import { isClinicalRole, primaryAttentionPath } from "../../app/navigation";
import { errorText } from "../../app/userMessage";
import { Feedback } from "../../shared/ui/Sheet";
import { LoadingState } from "../../shared/ui/LoadingState";
import type { Role } from "../../app/roles";
import { EncounterContext, type CoverageStatus } from "./EncounterContext";
import type { Encounter } from "./domain/encounter";
import { AdmissionStepper } from "./ui/AdmissionStepper";

function asCoverage(status: string | null | undefined): CoverageStatus | null {
  if (status === "aprobada" || status === "pendiente" || status === "rechazada") return status;
  return null;
}

function isAdmitted(encounter: Encounter): boolean {
  return encounter.currentStep === "cerrado" || /hospitalizado/i.test(encounter.statusLabel);
}

function statusText(encounter: Encounter): string {
  return isAdmitted(encounter) ? encounter.statusLabel : "En trámite";
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function admissionMeta(encounter: Encounter): string {
  return [
    encounter.orderNumber,
    encounter.originService,
    encounter.location.room ? `Habitación ${encounter.location.room}` : null,
    encounter.location.bed ? `Cama ${encounter.location.bed}` : null,
  ].filter(Boolean).join(" · ") || "Sin ubicación";
}

function floorPlace(encounter: Encounter): string {
  return [
    encounter.location.room ? `Habitación ${encounter.location.room}` : null,
    encounter.location.bed ? `Lecho ${encounter.location.bed}` : null,
  ].filter(Boolean).join(" · ") || "Sin ubicación";
}

function fileIdFrom(routeEncounterId: string | undefined, pathname: string): string | null {
  if (routeEncounterId && routeEncounterId !== "nuevo") return routeEncounterId;
  const pathId = /^\/pacientes\/([^/]+)$/.exec(pathname)?.[1];
  if (pathId && pathId !== "nuevo") return pathId;
  return null;
}

function StatusBadge({ encounter }: Readonly<{ encounter: Encounter }>) {
  return (
    <span className={`case-bar-status${isAdmitted(encounter) ? " is-hosp" : ""}`}>
      {statusText(encounter)}
    </span>
  );
}

function CaseBarIdentity({ encounter, floorContext }: Readonly<{ encounter: Encounter; floorContext: boolean }>) {
  const meta = floorContext
    ? (encounter.location.service ?? encounter.originService ?? "Hospitalización")
    : admissionMeta(encounter);
  return (
    <>
      <div className="case-bar-avatar" aria-hidden>
        {initialsOf(encounter.patientName)}
      </div>
      <div className="case-bar-identity">
        <p className="case-bar-name">
          <strong>{encounter.patientName}</strong>
          {floorContext ? (
            <span className="case-bar-doc">{encounter.documentType} {encounter.documentNumber}</span>
          ) : (
            <StatusBadge encounter={encounter} />
          )}
        </p>
        <p className="case-bar-meta">{meta}</p>
      </div>
      {floorContext ? (
        <>
          <StatusBadge encounter={encounter} />
          <div className="case-bar-place">
            <strong>{floorPlace(encounter)}</strong>
            <span>{encounter.location.service ?? encounter.originService ?? "Servicio no registrado"}</span>
          </div>
        </>
      ) : null}
    </>
  );
}

function CaseBarActions({
  encounter,
  role,
  pathname,
}: Readonly<{ encounter: Encounter; role: Role | undefined; pathname: string }>) {
  const clinical = isClinicalRole(role ?? "admision");
  const canOpenAttention = encounter.currentStep === "cerrado" && role && isClinicalRole(role) && !pathname.startsWith("/atencion");
  return (
    <div className="actions case-bar-actions">
      <Link className="button button-quiet case-bar-btn" to={`/pacientes/${encounter.encounterId}`}>
        <IconNotes size={16} /> <span>Ver ficha de admisión</span>
      </Link>
      {clinical ? (
        <Link
          className={pathname.startsWith("/atencion/chart") ? "button case-bar-btn is-current" : "button button-quiet case-bar-btn"}
          to={`/atencion/chart?ingreso=${encodeURIComponent(encounter.encounterId)}`}
        >
          <IconClipboardList size={16} /> <span>Expediente clínico</span>
        </Link>
      ) : null}
      {canOpenAttention ? (
        <Link className="button button-quiet case-bar-btn" to={primaryAttentionPath(role, encounter.encounterId)}>
          <IconStethoscope size={16} /> <span>Atención en piso</span>
        </Link>
      ) : null}
    </div>
  );
}

function useCaseEncounter(ingreso: string | null) {
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus | null>(null);
  const [error, setError] = useState("");

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

  return { encounter, setEncounter, coverageStatus, setCoverageStatus, error };
}

export function CaseBar({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const { encounterId: routeEncounterId } = useParams();
  const fileId = fileIdFrom(routeEncounterId, location.pathname);
  const ingreso = params.get("ingreso") ?? fileId;
  const { encounter, setEncounter, coverageStatus, setCoverageStatus, error } = useCaseEncounter(ingreso);

  const onAttention = location.pathname.startsWith("/atencion");
  const onAlerts = location.pathname.startsWith("/alertas");
  const floorContext = onAttention || onAlerts;
  const hideAdmissionStepper = onAttention || encounter?.currentStep === "cerrado";

  const value = useMemo(() => ({
    encounter,
    coverageStatus,
    setCoverageStatus,
    applyEncounter: (next: Encounter) => {
      if (!next?.encounterId) return;
      setEncounter(next);
      setCoverageStatus(asCoverage(next.coverage.status));
    },
  }), [coverageStatus, encounter, setCoverageStatus, setEncounter]);

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
                <CaseBarIdentity encounter={encounter} floorContext={floorContext} />
              </div>
            </div>
            <CaseBarActions encounter={encounter} role={user?.role} pathname={location.pathname} />
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
