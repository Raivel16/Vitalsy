import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router";
import { IconLogout } from "@tabler/icons-react";
import { AuthProvider, useAuth } from "./app/AuthProvider";
import { HomePage } from "./app/HomePage";
import { LoginPage } from "./app/LoginPage";
import { ChangePasswordPage } from "./app/ChangePasswordPage";
import { navFor, withIngreso, isAlertRole, ALERT_ROLES, ALERT_REPORT_ROLES, BED_ROLES, CLEANING_ROLES, DISCHARGE_ROLES, PATIENT_WORKLIST, STAFF_ROLES, ADMIN_ROLES, type NavItem } from "./app/navigation";
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
import { ClinicalVisitPage } from "./modules/clinical-visit/pages/ClinicalVisitPage";
import { MedicalEvolutionPage } from "./modules/medical-evolution/pages/MedicalEvolutionPage";
import { CpoePage } from "./modules/cpoe/pages/CpoePage";
import { VitalMonitoringPage } from "./modules/vital-monitoring/pages/VitalMonitoringPage";
import { EmarPage } from "./modules/e-mar/pages/EmarPage";
import { VitalControlsPage } from "./modules/vital-controls/pages/VitalControlsPage";
import { NursingEvolutionCarePage } from "./modules/nursing-care/pages/NursingEvolutionCarePage";
import { PatientChartPage } from "./modules/patient-chart/pages/PatientChartPage";
import { AlertInboxPage } from "./modules/clinical-alerts/pages/AlertInboxPage";
import { AlertDetailPage } from "./modules/clinical-alerts/pages/AlertDetailPage";
import { AlertReportsPage } from "./modules/clinical-alerts/pages/AlertReportsPage";
import { DeteriorationPage } from "./modules/clinical-alerts/pages/DeteriorationPage";
import { DischargeBoardPage } from "./modules/discharge/pages/DischargeBoardPage";
import { DischargeCasePage } from "./modules/discharge/pages/DischargeCasePage";
import { BedCensusPage } from "./modules/bed-management/pages/BedCensusPage";
import { CleaningOrdersPage } from "./modules/bed-management/pages/CleaningOrdersPage";
import { BedInfrastructurePage } from "./modules/bed-infrastructure/pages/BedInfrastructurePage";
import { UsersListPage } from "./modules/user-admin/pages/UsersListPage";
import { UserCreatePage } from "./modules/user-admin/pages/UserCreatePage";
import { UserEditPage } from "./modules/user-admin/pages/UserEditPage";
import { StaffBoardPage } from "./modules/staff-roster/pages/StaffBoardPage";
import { AlertNotifications } from "./modules/clinical-alerts/AlertNotifications";
import { ToastProvider } from "./shared/ui/toast/ToastProvider";
import { Button } from "./shared/ui/Button";
import { LoadingState } from "./shared/ui/LoadingState";
import { SealIcon } from "./shared/ui/Icons";
import type { ReactNode } from "react";

function Guard({ roles, requirement, children }: Readonly<{ roles: Role[]; requirement?: string; children: ReactNode }>) {
  const { user } = useAuth();
  if (user && roles.includes(user.role)) return children;
  return (
    <p className="banner banner-warning" role="alert">
      Esta vista no está disponible para su perfil. Se requiere {requirement ?? roles.map((item) => ROLE_LABEL[item]).join(" o ")}.
    </p>
  );
}

function ShellNavLink({ item }: Readonly<{ item: NavItem }>) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end || item.ownSubroutes?.includes(pathname)}
      onClick={(event) => {
        if (!item.needsIngreso) return;
        const next = withIngreso(item.to);
        if (next === item.to) return;
        event.preventDefault();
        void navigate(next);
      }}
    >
      <Icon size={20} stroke={1.75} aria-hidden />
      {item.label}
    </NavLink>
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
          <div className="brand-lockup">
            <h1>Vitalsy</h1>
            <SealIcon />
            <p>Gestión clínica hospitalaria</p>
          </div>
        </div>
        <div className="session-box">
          <AlertNotifications enabled={isAlertRole(role)} userId={user?.id ?? null} />
          <p>{user?.name}<span>{ROLE_LABEL[role]}</span></p>
          <Button variant="quiet" type="button" onClick={() => void logout()}>
            <IconLogout size={18} stroke={1.75} aria-hidden />
            Cerrar sesión
          </Button>
        </div>
      </header>
      <div className="layout">
        <nav aria-label="Menú principal">
          {groups.map((group) => (
            <div className="nav-group" key={group.id}>
              <p>{group.label}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.to}>
                    <ShellNavLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <main id="contenido">
          <CaseBar>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/pacientes"
                element={
                  <Guard roles={PATIENT_WORKLIST} requirement="un perfil que atienda pacientes en curso">
                    <CensusPage />
                  </Guard>
                }
              />
              <Route path="/pacientes/nuevo" element={<Guard roles={["admision"]}><PatientRegistrationPage /></Guard>} />
              <Route
                path="/pacientes/:encounterId"
                element={
                  <Guard roles={PATIENT_WORKLIST} requirement="un perfil que atienda pacientes en curso">
                    <EncounterFilePage />
                  </Guard>
                }
              />
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
              <Route path="/medico/indicaciones" element={<Guard roles={["medico_residente", "medico_tratante"]}><MedicalOrdersPage /></Guard>} />
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
              <Route
                path="/atencion/chart"
                element={
                  <Guard roles={["medico_residente", "medico_tratante", "enfermera_piso", "auxiliar_enfermeria"]}>
                    <PatientChartPage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/visita"
                element={
                  <Guard roles={["medico_residente", "medico_tratante"]}>
                    <ClinicalVisitPage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/evolucion"
                element={
                  <Guard roles={["medico_residente", "medico_tratante"]}>
                    <MedicalEvolutionPage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/cpoe"
                element={
                  <Guard roles={["medico_tratante"]}>
                    <CpoePage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/constantes"
                element={
                  <Guard roles={["enfermera_piso", "auxiliar_enfermeria"]}>
                    <VitalMonitoringPage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/emar"
                element={
                  <Guard roles={["enfermera_piso"]}>
                    <EmarPage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/controles"
                element={
                  <Guard roles={["enfermera_piso", "auxiliar_enfermeria", "enfermera_supervisora"]}>
                    <VitalControlsPage />
                  </Guard>
                }
              />
              <Route
                path="/atencion/cuidados"
                element={
                  <Guard roles={["enfermera_piso", "auxiliar_enfermeria"]}>
                    <NursingEvolutionCarePage />
                  </Guard>
                }
              />
              <Route
                path="/alertas"
                element={<Guard roles={ALERT_ROLES} requirement="un perfil del proceso de alertas"><AlertInboxPage /></Guard>}
              />
              <Route
                path="/alertas/deterioro"
                element={
                  <Guard roles={["auxiliar_enfermeria", "enfermera_piso", "enfermera_supervisora"]}>
                    <DeteriorationPage />
                  </Guard>
                }
              />
              <Route
                path="/alertas/reportes"
                element={<Guard roles={ALERT_REPORT_ROLES} requirement="supervisión o jefatura de enfermería"><AlertReportsPage /></Guard>}
              />
              <Route
                path="/alertas/:alertId"
                element={<Guard roles={ALERT_ROLES} requirement="un perfil del proceso de alertas"><AlertDetailPage /></Guard>}
              />
              <Route
                path="/egreso"
                element={<Guard roles={DISCHARGE_ROLES} requirement="un perfil del proceso de alta"><DischargeBoardPage /></Guard>}
              />
              <Route
                path="/egreso/:encounterId"
                element={<Guard roles={DISCHARGE_ROLES} requirement="un perfil del proceso de alta"><DischargeCasePage /></Guard>}
              />
              <Route
                path="/camas"
                element={<Guard roles={BED_ROLES} requirement="gestión de camas o supervisión"><BedCensusPage /></Guard>}
              />
              <Route
                path="/camas/limpieza"
                element={<Guard roles={CLEANING_ROLES} requirement="limpieza, auxiliar o supervisión"><CleaningOrdersPage /></Guard>}
              />
              <Route
                path="/personal"
                element={<Guard roles={STAFF_ROLES} requirement="un perfil de gestión del personal"><StaffBoardPage /></Guard>}
              />
              <Route path="/infraestructura" element={<Guard roles={ADMIN_ROLES} requirement="administrador de accesos"><BedInfrastructurePage /></Guard>} />
              <Route path="/usuarios" element={<Guard roles={ADMIN_ROLES} requirement="administrador de accesos"><UsersListPage /></Guard>} />
              <Route path="/usuarios/nuevo" element={<Guard roles={ADMIN_ROLES} requirement="administrador de accesos"><UserCreatePage /></Guard>} />
              <Route path="/usuarios/:userId" element={<Guard roles={ADMIN_ROLES} requirement="administrador de accesos"><UserEditPage /></Guard>} />
            </Routes>
          </CaseBar>
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingState label="Cargando sesión…" />;
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <ChangePasswordPage />;
  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}
