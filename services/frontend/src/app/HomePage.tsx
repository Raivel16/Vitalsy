import { Link } from "react-router";
import { ROLE_LABEL, type Role } from "./roles";
import { useAuth } from "./AuthProvider";
import { canOpenPatientWorklist, isBedRole, isClinicalRole, isDischargeRole, isStaffRole } from "./navigation";
import { ButtonLink } from "../shared/ui/Button";

const GUIDE: Record<Role, string> = {
  admision: "Abra el censo, continúe el paciente de su turno y registre cada actividad. También puede registrar un ingreso manual o recibir órdenes por la API de intake.",
  camillero: "Abra el censo y continúe solo los pacientes listos para traslado. Consulte habitación y lecho, y verifique el brazalete antes de movilizar.",
  enfermera_piso: "Abra Pacientes, elija un hospitalizado y use Atención en piso (e-MAR, constantes y cuidados). El menú lateral abre cada pantalla del turno.",
  auxiliar_enfermeria: "Abra Pacientes, elija un hospitalizado y registre constantes o cuidados desde Atención en piso.",
  medico_residente: "Abra Pacientes, elija un hospitalizado y use Visita médica, laboratorio, imágenes o evolución desde el menú Atención en piso.",
  medico_tratante: "Abra Pacientes: firme indicaciones de admisión si corresponden, o use Visita médica, laboratorio, imágenes, evolución y CPOE en Atención en piso.",
  enfermera_supervisora: "Supervise el piso: atenderá los escalamientos de alertas, las proyecciones de alta y la asignación diaria del personal.",
  equipo_respuesta_rapida: "Atienda las intervenciones especializadas: registrará la evaluación del paciente y la orden de traslado a cuidados intensivos.",
  trabajo_social: "Registre la valoración social previa al egreso de los pacientes con orden de alta.",
  altas_caja: "Verifique la cuenta hospitalaria y emita el pase de salida de los pacientes con alta autorizada.",
  gestion_camas: "Reciba las solicitudes de cama, consulte el censo de lechos y confirme las asignaciones.",
  servicios_generales: "Reciba las órdenes de limpieza terminal y registre la desinfección de cada unidad.",
  jefatura_enfermeria: "Publique el rol mensual de turnos y apruebe las convocatorias de personal de retén.",
  recursos_humanos: "Valide las justificaciones y autorice las coberturas extraordinarias del personal asistencial.",
};

function area(role: Role): { kicker: string; title: string } {
  if (isClinicalRole(role)) {
    return { kicker: "Atención hospitalaria", title: "Atención y seguimiento en piso" };
  }
  if (role === "admision" || role === "camillero") {
    return { kicker: "Ingreso hospitalario", title: "Admisión y recepción del paciente" };
  }
  return { kicker: "Apoyo hospitalario", title: "Coordinación y soporte asistencial" };
}

export function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const { kicker, title } = area(role);

  return (
    <section className="home">
      <p className="kicker">{kicker}</p>
      <h2>{title}</h2>
      <p className="lead">{GUIDE[role]} Su perfil es {ROLE_LABEL[role]}.</p>
      {canOpenPatientWorklist(role) ? (
        <p><ButtonLink to="/pacientes">Ver pacientes en curso</ButtonLink></p>
      ) : null}
      {isDischargeRole(role) ? (
        <p><ButtonLink to="/egreso">Abrir altas y egresos</ButtonLink></p>
      ) : null}
      {isBedRole(role) ? (
        <p><ButtonLink to={role === "servicios_generales" || role === "auxiliar_enfermeria" ? "/camas/limpieza" : "/camas"}>Abrir gestión de camas</ButtonLink></p>
      ) : null}
      {isStaffRole(role) ? (
        <p><ButtonLink to="/personal">Abrir turnos y cobertura</ButtonLink></p>
      ) : null}
      {!canOpenPatientWorklist(role) && !isDischargeRole(role) && !isBedRole(role) && !isStaffRole(role) ? (
        <p className="hint">Su espacio de trabajo estará disponible cuando se publique su módulo.</p>
      ) : null}
      {role === "admision" ? (
        <p><Link to="/pacientes/nuevo">Registrar un ingreso manual</Link></p>
      ) : null}
      {isClinicalRole(role) ? (
        <p className="hint">Primero abra un paciente hospitalizado; el menú lateral conservará ese ingreso al cambiar de pantalla.</p>
      ) : null}
    </section>
  );
}
