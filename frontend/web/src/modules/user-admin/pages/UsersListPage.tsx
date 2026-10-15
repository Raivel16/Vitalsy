import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { errorText } from "../../../app/userMessage";
import { Button, ButtonLink } from "../../../shared/ui/Button";
import { Panel, StatusPill } from "../../../shared/ui/clinical";
import { TextField } from "../../../shared/ui/Field";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { statusLabel } from "../domain/userForm";
import type { UserAccount, UserStatusFilter } from "../types";
import { listUsers } from "../userApi";

const FILTERS: Array<{ id: UserStatusFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "inactive", label: "Inactivos" },
];

export function UsersListPage() {
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserAccount[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await listUsers(search, status);
      setUsers(data.data);
      setError("");
    } catch (error_) {
      setError(errorText(error_, "No se pudo cargar el listado de cuentas."));
      setUsers([]);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  return (
    <Sheet
      kicker="Administración"
      title="Usuarios y accesos"
      clinic="board"
      className="floor-care ops-board"
      aside={<ButtonLink to="/usuarios/nuevo">Nuevo usuario</ButtonLink>}
    >
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <Panel
        title="Cuentas"
        aside={
          <fieldset className="filter-row" aria-label="Filtrar por estado">
            {FILTERS.map((filter) => (
              <Button
                key={filter.id}
                type="button"
                variant={status === filter.id ? "primary" : "quiet"}
                aria-pressed={status === filter.id}
                onClick={() => setStatus(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </fieldset>
        }
      >
        <TextField
          id="user-search"
          label="Buscar por nombre o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {users === null ? (
          <LoadingState label="Cargando cuentas…" />
        ) : users.length === 0 ? (
          <p className="hint">No hay cuentas que coincidan con el filtro.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>{account.roleLabel}</td>
                  <td>
                    <StatusPill tone={account.isActive ? "success" : "neutral"}>{statusLabel(account.isActive)}</StatusPill>
                  </td>
                  <td><Link to={`/usuarios/${account.id}`}>Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Sheet>
  );
}
