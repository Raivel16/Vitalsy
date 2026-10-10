import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { listCoverage, listMembers } from "../staffApi";
import type { CoverageRequest, StaffMember } from "../types";

export function useStaffMembers(enabled: boolean) {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    listMembers()
      .then((data) => {
        if (active) setMembers(data);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo cargar el listado de personal."));
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { members, error };
}

export function useCoverage(enabled: boolean) {
  const [requests, setRequests] = useState<CoverageRequest[] | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    listCoverage()
      .then((data) => {
        if (!active) return;
        setRequests(data);
        setError("");
      })
      .catch((caught) => {
        if (!active) return;
        setRequests([]);
        setError(errorText(caught, "No se pudo cargar las solicitudes de cobertura."));
      });
    return () => {
      active = false;
    };
  }, [enabled, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { requests, error, reload };
}
