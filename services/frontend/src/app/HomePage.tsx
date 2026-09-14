import { Link } from "react-router";
import { ROLE_LABEL } from "./roles";
import { useRole } from "./role-context";

const LANES = [
  { role: "admision" as const, title: "Admisión", text: "Orden, filiación, cobertura, brazalete, expediente y consentimiento.", to: "/admision/orden" },
  { role: "celador" as const, title: "Celador", text: "Orden de traslado e identidad por brazalete.", to: "/traslado/orden" },
  { role: "enfermeria" as const, title: "Enfermería", text: "Recepción, valoración, NEWS2, conciliación, escalas y Kardex.", to: "/piso/recepcion" },
  { role: "medico" as const, title: "Médico", text: "Revisión y firma de indicaciones basales.", to: "/medico/indicaciones" },
];

export function HomePage() {
  const { role } = useRole();

  return (
    <section className="home">
      <p className="kicker">Ingreso hospitalario</p>
      <h2>Admisión y recepción del paciente hospitalizado</h2>
      <p className="lead">Mesa de trabajo para el ingreso. El rol activo es {ROLE_LABEL[role]}.</p>
      <ol className="lanes">
        {LANES.map((lane, index) => (
          <li key={lane.role} className={lane.role === role ? "lane lane-active" : "lane"}>
            <span>{index + 1}</span>
            <div>
              <h3>{lane.title}</h3>
              <p>{lane.text}</p>
              <Link to={lane.to}>Abrir {lane.title.toLowerCase()}</Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
