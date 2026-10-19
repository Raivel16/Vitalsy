import { api } from "../../app/api";
import type { UserAccount, UserStatusFilter } from "./types";

export function listUsers(search: string, status: UserStatusFilter): Promise<{ data: UserAccount[] }> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (status !== "all") params.set("status", status);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return api(`/api/v1/users${suffix}`);
}

export function createUser(values: { name: string; email: string; role: string }) {
  return api<{ user: UserAccount; temporaryPassword: string }>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateUser(id: number, values: { name: string; email: string; role: string }) {
  return api<{ user: UserAccount }>(`/api/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function deactivateUser(id: number) {
  return api<{ user: UserAccount }>(`/api/v1/users/${id}/deactivate`, { method: "POST" });
}
