import { useId, useMemo, useState } from "react";
import { ROLE_LABEL, isRole } from "../../../app/roles";
import type { StaffMember } from "../types";

function roleLabel(role: string): string {
  return isRole(role) ? ROLE_LABEL[role] : role;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Combobox para elegir a una persona por nombre, correo o rol (no una lista de roles). */
export function PersonPicker({
  id,
  label,
  members,
  excludeIds = [],
  selected = null,
  onClear,
  error,
  onPick,
}: Readonly<{
  id: string;
  label: string;
  members: StaffMember[];
  excludeIds?: number[];
  selected?: StaffMember | null;
  onClear?: () => void;
  error?: string;
  onPick: (member: StaffMember) => void;
}>) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${index}`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const term = normalize(query.trim());
    return members
      .filter((member) => !excludeIds.includes(member.id))
      .filter((member) => {
        if (!term) return true;
        const haystack = normalize(`${member.name} ${member.email ?? ""} ${roleLabel(member.role)}`);
        return haystack.includes(term);
      })
      .slice(0, 8);
  }, [members, excludeIds, query]);

  function pick(member: StaffMember) {
    onPick(member);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.min(current + 1, Math.max(matches.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && open && matches[active]) {
      event.preventDefault();
      pick(matches[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  if (selected) {
    return (
      <div className="field person-picker">
        <span className="person-picker-label">{label}</span>
        <p className="person-picker-selected">
          <strong>{selected.name}</strong>
          {selected.email ? <span> · {selected.email}</span> : null}
          <span> · {roleLabel(selected.role)}</span>
          {onClear ? <button type="button" className="link-button" onClick={onClear}>Cambiar</button> : null}
        </p>
      </div>
    );
  }

  return (
    <div className="field person-picker">
      <label htmlFor={id}><span>{label}</span></label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && matches[active] ? optionId(active) : undefined}
        aria-autocomplete="list"
        placeholder="Nombre, correo o rol"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <ul id={listId} role="listbox" className="person-picker-list" aria-label={`Resultados de ${label}`}>
          {matches.length === 0 ? (
            <li className="person-picker-empty">Ninguna persona coincide con la búsqueda.</li>
          ) : (
            matches.map((member, index) => (
              <li
                key={member.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className={index === active ? "is-active" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(member)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    pick(member);
                  }
                }}
              >
                <strong>{member.name}</strong>
                {member.email ? <span> · {member.email}</span> : null}
                <span> · {roleLabel(member.role)}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
