import { Link } from "react-router";
import { ROLE_LABEL } from "./roles";
import { useAuth } from "./AuthProvider";
import { ButtonLink } from "../shared/ui/Button";

const GUIDE: Record<string, string> = {
  admision: "Abra el censo, continúe el paciente de su turno y registre cada actividad. También puede registrar un ingreso manual o recibir órdenes por la API de intake.",
  camillero: "Abra el censo y continúe solo los pacientes listos para traslado. Consulte habitación y lecho, y verifique el brazalete antes de movilizar.",
  enfermera_piso: "Abra el censo cuando el paciente llegue a piso. Confirme la recepción o registre una reubicación, y luego complete valoración, constantes, conciliación, escalas y Kardex.",
  auxiliar_enfermeria: "Abra el censo para apoyar la toma de constantes vitales basales y, en atención diaria, los cuidados directos del paciente hospitalizado.",
  medico_residente: "Abra el censo cuando la enfermera de piso cierre el Kardex. Revise la valoración y firme las indicaciones basales.",
  medico_tratante: "Consulte el censo de hospitalizados y el chart del paciente para la visita médica, la evolución consolidada y la prescripción electrónica.",
};

export function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "admision";

  return (
    <section className="home">
      <p className="kicker">Ingreso hospitalario</p>
      <h2>Admisión y recepción del paciente</h2>
      <p className="lead">{GUIDE[role]} Su perfil es {ROLE_LABEL[role]}.</p>
      <p><ButtonLink to="/pacientes">Ver pacientes en curso</ButtonLink></p>
      {role === "admision" ? (
        <p><Link to="/pacientes/nuevo">Registrar un ingreso manual</Link></p>
      ) : null}
    </section>
  );
}
