const LABEL_ARTERIAL = "Presi\u00f3n arterial";
const LABEL_SYSTOLIC = "Presi\u00f3n sist\u00f3lica";
const LABEL_DIASTOLIC = "Presi\u00f3n diast\u00f3lica";

export function BloodPressureField({
  systolicId = "sbp",
  diastolicId = "dbp",
  systolic,
  diastolic,
  onSystolic,
  onDiastolic,
  systolicError,
  diastolicError,
}: Readonly<{
  systolicId?: string;
  diastolicId?: string;
  systolic: string;
  diastolic: string;
  onSystolic: (value: string) => void;
  onDiastolic: (value: string) => void;
  systolicError?: string;
  diastolicError?: string;
}>) {
  const error = systolicError || diastolicError;

  return (
    <div className={["field field-compact bp-field", error ? "has-error" : ""].filter(Boolean).join(" ")}>
      <span className="bp-label">
        <span>{LABEL_ARTERIAL}</span>
        <span className="field-aside">Sist / Diast</span>
      </span>
      <div className="bp-control">
        <label htmlFor={systolicId} className="sr-only">{LABEL_SYSTOLIC}</label>
        <input
          id={systolicId}
          inputMode="numeric"
          value={systolic}
          onChange={(event) => onSystolic(event.target.value)}
          aria-invalid={Boolean(systolicError)}
        />
        <span className="bp-slash" aria-hidden>/</span>
        <label htmlFor={diastolicId} className="sr-only">{LABEL_DIASTOLIC}</label>
        <input
          id={diastolicId}
          inputMode="numeric"
          value={diastolic}
          onChange={(event) => onDiastolic(event.target.value)}
          aria-invalid={Boolean(diastolicError)}
        />
        <span className="bp-unit">mmHg</span>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
