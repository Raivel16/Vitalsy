import { useCallback, useEffect, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { bedApi } from "../bedApi";
import { capabilitiesFor } from "../domain/access";
import type { AssignmentNotification, Bed, BedRequest, Projection, WardCensus } from "../types";

export type WaitingItem = { request: BedRequest; suggestion: Bed | null };

type BoardState = {
  wards: WardCensus[];
  waiting: WaitingItem[];
  notifications: AssignmentNotification[];
  projections: Projection[];
  toEnable: number;
  loadedAt: string | null;
  loading: boolean;
  error: string;
};

const INITIAL: BoardState = {
  wards: [], waiting: [], notifications: [], projections: [], toEnable: 0, loadedAt: null, loading: true, error: "",
};

/** Carga el censo y, según el rol, lista de espera con sugerencias, proyecciones y notificaciones. */
export function useBedBoard(role: string) {
  const [state, setState] = useState<BoardState>(INITIAL);

  const load = useCallback(async () => {
    const caps = capabilitiesFor(role);
    try {
      const [census, waiting, projections, notifications, orders] = await Promise.all([
        bedApi.census(),
        caps.seesWaitingList ? loadWaiting() : Promise.resolve<WaitingItem[]>([]),
        caps.seesProjections ? bedApi.projections() : Promise.resolve({ projections: [] as Projection[] }),
        caps.seesNotifications ? bedApi.notifications() : Promise.resolve({ notifications: [] as AssignmentNotification[] }),
        caps.tracksEnablement ? bedApi.cleaningOrders() : Promise.resolve({ orders: [] }),
      ]);
      setState({
        wards: census.wards,
        waiting,
        projections: projections.projections,
        notifications: notifications.notifications,
        toEnable: orders.orders.filter((order) => order.status === "equipada").length,
        loadedAt: new Date().toISOString(),
        loading: false,
        error: "",
      });
    } catch (caught) {
      setState((current) => ({
        ...current,
        loading: false,
        error: errorText(caught, "No se pudo cargar el censo de camas."),
      }));
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}

async function loadWaiting(): Promise<WaitingItem[]> {
  const { requests } = await bedApi.requests("pendiente,en_espera");
  return Promise.all(
    requests.map(async (request) => {
      const { suggestions } = await bedApi.suggestions(request.id).catch(() => ({ suggestions: [] as Bed[] }));
      return { request, suggestion: suggestions[0] ?? null };
    }),
  );
}
