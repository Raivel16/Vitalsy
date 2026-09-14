import { NavLink, Route, Routes } from "react-router";
import { HomePage } from "./app/HomePage";
import { RoleProvider } from "./app/RoleProvider";
import { useRole } from "./app/role-context";
import { ROLE_LABEL, ROLES, type Role } from "./app/roles";
import { KardexPage } from "./modules/admission-kardex/pages/KardexPage";
import { AdmissionOrderPage } from "./modules/admission/pages/AdmissionOrderPage";
import { CoveragePage, ReferralPage } from "./modules/admission/pages/CoveragePages";
import { FiliationPage } from "./modules/admission/pages/FiliationPage";
import { ConsentPage, RecordPage, WristbandPage } from "./modules/admission/pages/IdentityPages";
import { MedicalOrdersPage } from "./modules/medical-orders/pages/MedicalOrdersPage";
import { ReconciliationPage } from "./modules/medication-reconciliation/pages/ReconciliationPage";
import { NursingAssessmentPage, VitalSignsPage } from "./modules/nursing-assessment/pages/NursingPages";
import { FloorReceptionPage, RelocationPage, TransferOrderPage, WristbandVerifyPage } from "./modules/patient-transfer/pages/TransferPages";
import { RiskScalesPage } from "./modules/risk-assessment/pages/RiskPages";
import { PulseIcon, SealIcon } from "./shared/ui/Icons";
import type { ReactNode } from "react";

const NAV: Array<{ to: string; label: string; roles: Role[] }> = [
  { to: "/", label: "Inicio", roles: [...ROLES] },
  { to: "/admision/orden", label: "Orden de internamiento", roles: ["admision"] },
  { to: "/admision/filiacion", label: "Filiación", roles: ["admision"] },
  { to: "/admision/cobertura", label: "Cobertura", roles: ["admision"] },
  { to: "/admision/brazalete", label: "Brazalete", roles: ["admision"] },
  { to: "/admision/expediente", label: "Expediente", roles: ["admision"] },
  { to: "/admision/consentimiento", label: "Consentimiento", roles: ["admision"] },
  { to: "/traslado/orden", label: "Orden de traslado", roles: ["celador"] },
  { to: "/traslado/identidad", label: "Identidad", roles: ["celador"] },
  { to: "/piso/recepcion", label: "Recepción en piso", roles: ["enfermeria"] },
  { to: "/piso/reubicacion", label: "Reubicación", roles: ["enfermeria"] },
  { to: "/enfermeria/valoracion", label: "Valoración", roles: ["enfermeria"] },
  { to: "/enfermeria/constantes", label: "Constantes", roles: ["enfermeria"] },
  { to: "/enfermeria/conciliacion", label: "Conciliación", roles: ["enfermeria"] },
  { to: "/enfermeria/riesgos", label: "Escalas de riesgo", roles: ["enfermeria"] },
  { to: "/enfermeria/kardex", label: "Kardex", roles: ["enfermeria"] },
  { to: "/medico/indicaciones", label: "Indicaciones médicas", roles: ["medico"] },
];

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role } = useRole();
  if (roles.includes(role)) return children;
  return (
    <p className="banner banner-warning" role="alert">
      Esta vista no está disponible para el rol activo. Se requiere el rol {roles.map((item) => ROLE_LABEL[item]).join(" o ")}.
    </p>
  );
}

function Shell() {
  const { role, setRole } = useRole();
  const links = NAV.filter((item) => item.roles.includes(role));

  return (
    <div className="ward">
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <header className="topbar">
        <div className="brand">
          <SealIcon />
          <div>
            <h1>Vitalsy</h1>
            <p>Admisión hospitalaria</p>
          </div>
        </div>
        <label className="role-switch">
          Rol activo
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {ROLES.map((item) => (
              <option key={item} value={item}>{ROLE_LABEL[item]}</option>
            ))}
          </select>
        </label>
      </header>
      <div className="layout">
        <nav aria-label="Ingreso hospitalario">
          <p className="nav-kicker"><PulseIcon /> Turno de ingreso</p>
          <ul>
            {links.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === "/"}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="contenido">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admision/orden" element={<Guard roles={["admision"]}><AdmissionOrderPage /></Guard>} />
            <Route path="/admision/filiacion" element={<Guard roles={["admision"]}><FiliationPage /></Guard>} />
            <Route path="/admision/cobertura" element={<Guard roles={["admision"]}><CoveragePage /></Guard>} />
            <Route path="/admision/cobertura/derivacion" element={<Guard roles={["admision"]}><ReferralPage /></Guard>} />
            <Route path="/admision/brazalete" element={<Guard roles={["admision"]}><WristbandPage /></Guard>} />
            <Route path="/admision/expediente" element={<Guard roles={["admision"]}><RecordPage /></Guard>} />
            <Route path="/admision/consentimiento" element={<Guard roles={["admision"]}><ConsentPage /></Guard>} />
            <Route path="/traslado/orden" element={<Guard roles={["celador"]}><TransferOrderPage /></Guard>} />
            <Route path="/traslado/identidad" element={<Guard roles={["celador"]}><WristbandVerifyPage /></Guard>} />
            <Route path="/piso/recepcion" element={<Guard roles={["enfermeria"]}><FloorReceptionPage /></Guard>} />
            <Route path="/piso/reubicacion" element={<Guard roles={["enfermeria"]}><RelocationPage /></Guard>} />
            <Route path="/enfermeria/valoracion" element={<Guard roles={["enfermeria"]}><NursingAssessmentPage /></Guard>} />
            <Route path="/enfermeria/constantes" element={<Guard roles={["enfermeria"]}><VitalSignsPage /></Guard>} />
            <Route path="/enfermeria/conciliacion" element={<Guard roles={["enfermeria"]}><ReconciliationPage /></Guard>} />
            <Route path="/enfermeria/riesgos" element={<Guard roles={["enfermeria"]}><RiskScalesPage /></Guard>} />
            <Route path="/enfermeria/kardex" element={<Guard roles={["enfermeria"]}><KardexPage /></Guard>} />
            <Route path="/medico/indicaciones" element={<Guard roles={["medico"]}><MedicalOrdersPage /></Guard>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <Shell />
    </RoleProvider>
  );
}
