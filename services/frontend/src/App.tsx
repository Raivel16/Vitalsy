import { NavLink, Route, Routes } from "react-router";
import { IconLogout } from "@tabler/icons-react";
import { AuthProvider, useAuth } from "./app/AuthProvider";
import { HomePage } from "./app/HomePage";
import { LoginPage } from "./app/LoginPage";
import { navFor } from "./app/navigation";
import { ROLE_LABEL, type Role } from "./app/roles";
import { KardexPage } from "./modules/admission-kardex/pages/KardexPage";
import { CensusPage, EncounterFilePage } from "./modules/admission-census/pages/CensusPages";
import { PatientRegistrationPage } from "./modules/admission-census/pages/PatientRegistrationPage";
import { CaseBar } from "./modules/admission-census/CaseBar";
import { AdmissionOrderPage } from "./modules/admission/pages/AdmissionOrderPage";
import { CoveragePage, ReferralPage } from "./modules/admission/pages/CoveragePages";
import { FiliationPage } from "./modules/admission/pages/FiliationPage";
import { ConsentPage, RecordPage, WristbandPage } from "./modules/admission/pages/IdentityPages";
import { MedicalOrdersPage } from "./modules/medical-orders/pages/MedicalOrdersPage";
import { ReconciliationPage } from "./modules/medication-reconciliation/pages/ReconciliationPage";
import { NursingAssessmentPage, VitalSignsPage } from "./modules/nursing-assessment/pages/NursingPages";
import { FloorReceptionPage, RelocationPage, TransferOrderPage, WristbandVerifyPage } from "./modules/patient-transfer/pages/TransferPages";
import { RiskScalesPage } from "./modules/risk-assessment/pages/RiskPages";
import { LabResultsPage } from "./modules/lab-results/pages/LabResultsPage";
import { ImagingReportsPage } from "./modules/imaging-reports/pages/ImagingReportsPage";
import { Button } from "./shared/ui/Button";
import { SealIcon } from "./shared/ui/Icons";
import type { ReactNode } from "react";

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (user && roles.includes(user.role)) return children;
  return (
    <p className="banner banner-warning" role="alert">
      Esta vista no está disponible para su perfil. Se requiere {roles.map((item) => ROLE_LABEL[item]).join(" o ")}.
    </p>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const role = user?.role ?? "admision";
  const groups = navFor(role);

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
        <div className="session-box">
          <p>{user?.name}<span>{ROLE_LABEL[role]}</span></p>
          <Button variant="quiet" type="button" onClick={() => void logout()}>
            <IconLogout size={18} stroke={1.75} aria-hidden />
            Cerrar sesión
          </Button>
        </div>
      </header>
      <div className="layout">
        <nav aria-label="Ingreso hospitalario">
          {groups.map((group) => (
            <div className="nav-group" key={group.id}>
              <p>{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink to={item.to} end={item.end}>
                        <Icon size={20} stroke={1.75} aria-hidden />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <main id="contenido">
          <CaseBar>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/pacientes" element={<CensusPage />} />
              <Route path="/pacientes/nuevo" element={<Guard roles={["admision"]}><PatientRegistrationPage /></Guard>} />
              <Route path="/pacientes/:encounterId" element={<EncounterFilePage />} />
              <Route path="/admision/orden" element={<Guard roles={["admision"]}><AdmissionOrderPage /></Guard>} />
              <Route path="/admision/filiacion" element={<Guard roles={["admision"]}><FiliationPage /></Guard>} />
              <Route path="/admision/cobertura" element={<Guard roles={["admision"]}><CoveragePage /></Guard>} />
              <Route path="/admision/cobertura/derivacion" element={<Guard roles={["admision"]}><ReferralPage /></Guard>} />
              <Route path="/admision/brazalete" element={<Guard roles={["admision"]}><WristbandPage /></Guard>} />
              <Route path="/admision/expediente" element={<Guard roles={["admision"]}><RecordPage /></Guard>} />
              <Route path="/admision/consentimiento" element={<Guard roles={["admision"]}><ConsentPage /></Guard>} />
              <Route path="/traslado/orden" element={<Guard roles={["camillero"]}><TransferOrderPage /></Guard>} />
              <Route path="/traslado/identidad" element={<Guard roles={["camillero"]}><WristbandVerifyPage /></Guard>} />
              <Route path="/piso/recepcion" element={<Guard roles={["enfermera_piso"]}><FloorReceptionPage /></Guard>} />
              <Route path="/piso/reubicacion" element={<Guard roles={["enfermera_piso"]}><RelocationPage /></Guard>} />
              <Route path="/enfermeria/valoracion" element={<Guard roles={["enfermera_piso"]}><NursingAssessmentPage /></Guard>} />
              <Route path="/enfermeria/constantes" element={<Guard roles={["enfermera_piso", "auxiliar_enfermeria"]}><VitalSignsPage /></Guard>} />
              <Route path="/enfermeria/conciliacion" element={<Guard roles={["enfermera_piso"]}><ReconciliationPage /></Guard>} />
              <Route path="/enfermeria/riesgos" element={<Guard roles={["enfermera_piso"]}><RiskScalesPage /></Guard>} />
              <Route path="/enfermeria/kardex" element={<Guard roles={["enfermera_piso"]}><KardexPage /></Guard>} />
              <Route path="/medico/indicaciones" element={<Guard roles={["medico_residente"]}><MedicalOrdersPage /></Guard>} />
              <Route
                path="/atencion/laboratorio"
                element={
                  <Guard roles={["medico_residente", "medico_tratante", "enfermera_piso"]}>
                    <LabResultsPage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/imagenes"
                element={
                  <Guard roles={["medico_residente", "medico_tratante", "enfermera_piso"]}>
                    <ImagingReportsPage />
                  </Guard>
                }
              />
            </Routes>
          </CaseBar>
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { user, ready } = useAuth();
  if (!ready) return <p role="status">Cargando sesión.</p>;
  if (!user) return <LoginPage />;
  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
