import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { bedApi } from "../bedApi";
import type { CleaningOrder } from "../types";

type CleaningState = {
  orders: CleaningOrder[];
  loadedAt: string | null;
  loading: boolean;
  error: string;
};

/** Órdenes de limpieza del turno; `reload` conserva la lista previa si el servidor falla. */
export function useCleaningOrders() {
  const [state, setState] = useState<CleaningState>({ orders: [], loadedAt: null, loading: true, error: "" });

  const reload = useCallback(async () => {
    try {
      const data = await bedApi.cleaningOrders();
      setState({ orders: data.orders, loadedAt: new Date().toISOString(), loading: false, error: "" });
    } catch (error_) {
      setState((current) => ({
        ...current,
        loading: false,
        error: errorText(error_, "No se pudieron cargar las órdenes de limpieza."),
      }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
