import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import type { Role } from "../app/roles";

export function renderApp(path = "/", options?: { role?: Role | null }) {
  if (options?.role === null) {
    sessionStorage.removeItem("vitalsy-role");
    sessionStorage.removeItem("vitalsy-user");
  } else if (options?.role) {
    sessionStorage.setItem("vitalsy-role", options.role);
  } else if (!sessionStorage.getItem("vitalsy-role") && !sessionStorage.getItem("vitalsy-user")) {
    sessionStorage.setItem("vitalsy-role", "admision");
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

export function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}
