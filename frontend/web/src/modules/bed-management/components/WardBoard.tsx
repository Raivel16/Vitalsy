import { Button } from "../../../shared/ui/Button";
import { StatusMark, bedTone } from "../../../shared/ui/clinical";
import { compatibleRequests, groupByRoom, occupiedDays, wardInitials } from "../domain/census";
import type { Bed, BedRequest, WardCensus } from "../types";

const STATE_DETAIL: Record<string, string> = {
  available: "Lecho limpio y desinfectado",
  cleaning: "Desinfección en curso",
  blocked: "Lecho bloqueado",
};

function BedCard({
  bed,
  canAssign,
  compatible,
  onAssign,
}: Readonly<{
  bed: Bed;
  canAssign: boolean;
  compatible: number;
  onAssign: (bed: Bed) => void;
}>) {
  const tone = bedTone(bed.status, bed.isolation);
  const code = `${bed.room}-${bed.bedCode}`;
  const days = occupiedDays(bed.occupant?.since);

  return (
    <article className={`bed-card bed-${tone}`}>
      <div className="bed-card-head">
        <h5 className="bed-card-code">{code}</h5>
        <StatusMark tone={tone} />
      </div>
      {bed.status === "occupied" ? (
        <div>
          <p className="bed-card-code">{bed.occupant?.patientName ?? "Paciente sin identificar"}</p>
          {days ? <p className="bed-card-detail">Día {days} de internación</p> : null}
        </div>
      ) : (
        <p className="bed-card-detail">
          {bed.isolation && bed.status === "available" ? "Lecho de aislamiento disponible" : (STATE_DETAIL[bed.status] ?? "")}
        </p>
      )}
      {canAssign && bed.status === "available" ? (
        <Button
          type="button"
          aria-label={`Asignar lecho ${code}`}
          disabled={compatible === 0}
          title={compatible === 0 ? "No hay solicitudes en espera compatibles con este lecho" : undefined}
          onClick={() => onAssign(bed)}
        >
          Asignar lecho
        </Button>
      ) : null}
    </article>
  );
}

/** Pabellones → habitaciones → camas, con los estados y el ocupante del diseño de censo. */
export function WardBoard({
  wards,
  waiting,
  canAssign,
  onAssign,
}: Readonly<{
  wards: WardCensus[];
  waiting: BedRequest[];
  canAssign: boolean;
  onAssign: (bed: Bed, ward: WardCensus) => void;
}>) {
  if (wards.length === 0) {
    return <p className="banner banner-info" role="status">No hay pabellones registrados en el catálogo de camas.</p>;
  }

  return (
    <div className="bed-board">
      {wards.map((ward) => (
        <section key={ward.code} className="bed-ward" aria-label={ward.name}>
          <div className="ward-head">
            <h3>{ward.name}</h3>
            <div className="chip-row">
              <StatusMark tone="available">{ward.available} disp.</StatusMark>
              <StatusMark tone="occupied">{ward.occupied} ocup.</StatusMark>
              <StatusMark tone="cleaning">{ward.cleaning} limp.</StatusMark>
              <span className="ward-initials" aria-hidden>{wardInitials(ward.name)}</span>
            </div>
          </div>
          <div className="room-grid">
            {groupByRoom(ward.beds).map(([room, beds]) => (
              <section key={room} className="room-card" aria-label={`Habitación ${room}`}>
                <h4>Habitación {room}</h4>
                <div className="bed-grid">
                  {beds.map((bed) => (
                    <BedCard
                      key={bed.id}
                      bed={bed}
                      canAssign={canAssign}
                      compatible={compatibleRequests(bed, ward, waiting).length}
                      onAssign={(target) => onAssign(target, ward)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
