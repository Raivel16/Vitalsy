import { Link } from "react-router";
import { ROLE_LABEL, type Role } from "./roles";
import { useAuth } from "./AuthProvider";
import { isClinicalRole } from "./navigation";
import { ButtonLink } from "../shared/ui/Button";

const GUIDE: Record<Role, string> = {
  admision: "Abra el censo, continúe el paciente de su turno y registre cada actividad. También puede registrar un ingreso manual o recibir órdenes por la API de intake.",
  camillero: "Abra el censo y continúe solo los pacientes listos para traslado. Consulte habitación y lecho, y verifique el brazalete antes de movilizar.",
  enfermera_piso: "Abra Pacientes, elija un hospitalizado y use Atención en piso (e-MAR, constantes y cuidados). El menú lateral abre cada pantalla del turno.",
  auxiliar_enfermeria: "Abra Pacientes, elija un hospitalizado y registre constantes o cuidados desde Atención en piso.",
  medico_residente: "Abra Pacientes, elija un hospitalizado y use Visita médica, laboratorio, imágenes o evolución desde el menú Atención en piso.",
  medico_tratante: "Abra Pacientes: firme indicaciones de admisión si corresponden, o use Visita médica, laboratorio, imágenes, evolución y CPOE en Atención en piso.",
};

export function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "admision";

  return (
    <section className="home">
      <p className="kicker">{isClinicalRole(role) ? "Atención hospitalaria" : "Ingreso hospitalario"}</p>
      <h2>{isClinicalRole(role) ? "Atención y seguimiento en piso" : "Admisión y recepción del paciente"}</h2>
      <p className="lead">{GUIDE[role]} Su perfil es {ROLE_LABEL[role]}.</p>
      <p><ButtonLink to="/pacientes">Ver pacientes en curso</ButtonLink></p>
      {role === "admision" ? (
        <p><Link to="/pacientes/nuevo">Registrar un ingreso manual</Link></p>
      ) : null}
      {isClinicalRole(role) ? (
        <p className="hint">Primero abra un paciente hospitalizado; el menú lateral conservará ese ingreso al cambiar de pantalla.</p>
      ) : null}
    </section>
  );
}
