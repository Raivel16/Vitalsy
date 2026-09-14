import { Link } from "react-router";
import { ROLE_LABEL } from "./roles";
import { navFor } from "./navigation";
import { useAuth } from "./AuthProvider";

const GUIDE: Record<string, string> = {
  admision: "Subproceso 1.1. Consulte la orden, valide la filiación y la cobertura. Si la cobertura no está aprobada, derive el trámite y detenga el ingreso. Si está aprobada, emita el brazalete, aperture el expediente y registre el consentimiento.",
  celador: "Subproceso 1.2. Traslade solo pacientes cuya admisión ya cerró. Consulte la habitación y el lecho, y confirme el brazalete antes de mover al paciente.",
  enfermeria: "Cierre del subproceso 1.2 y subproceso 1.3. Confirme la recepción o registre una reubicación si el lecho no coincide. Después registre la valoración, las constantes, la conciliación y las escalas. El Kardex cierra ese tramo.",
  medico: "Cierre del subproceso 1.3. Revise la valoración y la conciliación del ingreso, y firme las indicaciones basales.",
};

export function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const steps = navFor(role).flatMap((group) => group.items).filter((item) => item.to !== "/" && item.to !== "/pacientes");

  return (
    <section className="home">
      <p className="kicker">Proceso 1</p>
      <h2>Admisión y recepción del paciente hospitalizado</h2>
      <p className="lead">{GUIDE[role]} Su perfil es {ROLE_LABEL[role]}.</p>
      <p><Link className="button" to="/pacientes">Ver pacientes en curso</Link></p>
      <h3>Orden de su tramo</h3>
      <ol className="lanes">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.to} className="lane">
              <span>{index + 1}</span>
              <div>
                <h3>
                  <Icon size={20} stroke={1.75} aria-hidden />
                  {step.label}
                </h3>
                {step.alternate ? <p>Use esta opción solo si el camino principal no puede continuar.</p> : null}
                <Link to={step.to}>Abrir {step.label.toLowerCase()}</Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
