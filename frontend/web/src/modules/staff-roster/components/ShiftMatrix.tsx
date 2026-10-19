import { type CellKind, type MatrixRow, cycleKind, daysOfMonth, weekdayOf } from "../domain/shiftMatrix";

const SHORT: Record<CellKind, string> = { D: "Diurno", N: "Noche", L: "Libre", R: "Retén" };

const LEGEND: Array<{ kind: CellKind; text: string }> = [
  { kind: "D", text: "Diurno (07:00–19:00)" },
  { kind: "N", text: "Noche (19:00–07:00)" },
  { kind: "L", text: "Libre" },
  { kind: "R", text: "Retén activo" },
];

/** Matriz colaborador × día del mes (frame 6A). Las celdas D/N/L se editan con un clic. */
export function ShiftMatrix({
  yearMonth,
  rows,
  onChange,
  onRemove,
}: Readonly<{
  yearMonth: string;
  rows: MatrixRow[];
  onChange: (rows: MatrixRow[]) => void;
  onRemove: (userId: number) => void;
}>) {
  const days = daysOfMonth(yearMonth);

  function toggle(userId: number, day: number) {
    onChange(
      rows.map((row) => {
        if (row.userId !== userId) return row;
        const next = cycleKind(row.cells[day] ?? "L");
        const cells = { ...row.cells };
        if (next === "L") delete cells[day];
        else cells[day] = next;
        return { ...row, cells };
      }),
    );
  }

  return (
    <div className="shift-matrix-block">
      <ul className="shift-legend" aria-label="Leyenda de turnos">
        {LEGEND.map((item) => (
          <li key={item.kind}>
            <span className={`shift-cell kind-${item.kind}`} aria-hidden>{item.kind}</span>
            {item.text}
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="hint">Agregue colaboradores con el buscador y marque sus turnos día a día.</p>
      ) : (
        <div className="shift-matrix-scroll">
          <table className="shift-matrix" aria-label={`Matriz de turnos ${yearMonth}`}>
            <thead>
              <tr>
                <th scope="col" className="shift-person">Colaborador</th>
                {days.map((day) => {
                  const weekday = weekdayOf(yearMonth, day);
                  return (
                    <th
                      key={day}
                      scope="col"
                      className={weekday.weekend ? "shift-day is-weekend" : "shift-day"}
                      aria-label={`${weekday.long} ${day}`}
                    >
                      <span className="shift-weekday" aria-hidden>{weekday.short}</span>
                      <span aria-hidden>{String(day).padStart(2, "0")}</span>
                    </th>
                  );
                })}
                <th scope="col"><span className="sr-only">Quitar</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId}>
                  <th scope="row" className="shift-person">
                    <strong>{row.name}</strong>
                    {row.email ? <span>{row.email}</span> : null}
                  </th>
                  {days.map((day) => {
                    const kind = row.cells[day] ?? "L";
                    const name = `${row.name}, día ${day}: ${SHORT[kind]}`;
                    return (
                      <td key={day} className={weekdayOf(yearMonth, day).weekend ? "shift-day is-weekend" : "shift-day"}>
                        <button
                          type="button"
                          className={`shift-cell kind-${kind}`}
                          aria-label={name}
                          disabled={kind === "R"}
                          onClick={() => toggle(row.userId, day)}
                        >
                          {kind}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <button type="button" className="shift-remove" aria-label={`Quitar a ${row.name}`} onClick={() => onRemove(row.userId)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
