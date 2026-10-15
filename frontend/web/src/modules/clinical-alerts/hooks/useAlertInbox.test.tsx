import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimeClient, RealtimeHandlers } from "../realtime/realtimeClient";

const apiMock = vi.fn();
vi.mock("../../../app/api", () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import { useAlertInbox } from "./useAlertInbox";

class FakeClient implements RealtimeClient {
  handlers: RealtimeHandlers | null = null;
  userId: number | null = null;
  unsubscribed = 0;
  reconnects = 0;

  subscribe(userId: number, handlers: RealtimeHandlers) {
    this.userId = userId;
    this.handlers = handlers;
    return () => {
      this.unsubscribed += 1;
      this.handlers = null;
    };
  }

  reconnect() {
    this.reconnects += 1;
  }
}

const alertRow = (id: number, needsSiren: boolean) => ({ id, needsSiren, status: "abierta" });

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useAlertInbox con canal en tiempo real (RNF-01, RNF-12, RF-53)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.setItem("vitalsy-alert-inbox", "1");
    apiMock.mockReset();
    apiMock.mockResolvedValue({ alerts: [alertRow(1, true)], pending: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it("se suscribe al canal del usuario y refresca la bandeja al instante cuando llega una alerta", async () => {
    const client = new FakeClient();
    const { result } = renderHook(() => useAlertInbox(true, { userId: 42, client }));
    await flush();

    expect(client.userId).toBe(42);
    const before = apiMock.mock.calls.length;
    apiMock.mockResolvedValue({ alerts: [alertRow(1, true), alertRow(2, true)], pending: 2 });

    await act(async () => {
      client.handlers?.onAlert();
    });
    await flush();

    expect(apiMock.mock.calls.length).toBe(before + 1);
    expect(result.current.alerts.map((alert) => alert.id)).toEqual([1, 2]);
  });

  it("la bandeja de la API manda: un evento no enciende la sirena por sí solo", async () => {
    const client = new FakeClient();
    apiMock.mockResolvedValue({ alerts: [alertRow(1, false)], pending: 0 });
    const { result } = renderHook(() => useAlertInbox(true, { userId: 42, client }));
    await flush();

    await act(async () => {
      client.handlers?.onAlert();
    });
    await flush();

    expect(result.current.pending).toBe(0);
  });

  it("conectado sondea cada 60 s como respaldo; desconectado, cada 15 s", async () => {
    const client = new FakeClient();
    renderHook(() => useAlertInbox(true, { userId: 42, client }));
    await flush();
    act(() => client.handlers?.onConnected());
    await flush();
    const connectedBase = apiMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(apiMock.mock.calls.length).toBe(connectedBase);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31000);
    });
    expect(apiMock.mock.calls.length).toBe(connectedBase + 1);

    act(() => client.handlers?.onDisconnected());
    await flush();
    const offlineBase = apiMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15500);
    });
    expect(apiMock.mock.calls.length).toBeGreaterThan(offlineBase);
  });

  it("tras desconexión reintenta en 5 s o menos y al reconectar hace un refresh completo", async () => {
    const client = new FakeClient();
    renderHook(() => useAlertInbox(true, { userId: 42, client }));
    await flush();
    act(() => client.handlers?.onConnected());
    await flush();

    act(() => client.handlers?.onDisconnected());
    const reconnectsBefore = client.reconnects;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(client.reconnects).toBeGreaterThan(reconnectsBefore);

    const callsBefore = apiMock.mock.calls.length;
    await act(async () => {
      client.handlers?.onConnected();
    });
    await flush();
    expect(apiMock.mock.calls.length).toBe(callsBefore + 1);
    expect(String(apiMock.mock.calls.at(-1)?.[0])).toContain("/clinical-alerts/inbox");
  });

  it("reintenta con espera creciente 1 s, 2 s, 4 s y luego fija en 5 s, y la reinicia al conectar", async () => {
    const client = new FakeClient();
    renderHook(() => useAlertInbox(true, { userId: 42, client }));
    await flush();
    act(() => client.handlers?.onDisconnected());

    const at = async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
      return client.reconnects;
    };
    expect(await at(999)).toBe(0);
    expect(await at(1)).toBe(1); // t=1 s
    expect(await at(1999)).toBe(1);
    expect(await at(1)).toBe(2); // t=3 s
    expect(await at(4000)).toBe(3); // t=7 s
    expect(await at(5000)).toBe(4); // t=12 s
    expect(await at(5000)).toBe(5); // t=17 s (tope fijo de 5 s)

    act(() => client.handlers?.onConnected());
    await flush();
    act(() => client.handlers?.onDisconnected());
    expect(await at(1000)).toBe(6); // vuelve a empezar en 1 s
  });

  it("reintenta de inmediato cuando el navegador vuelve a estar en línea", async () => {
    const client = new FakeClient();
    renderHook(() => useAlertInbox(true, { userId: 42, client }));
    await flush();
    act(() => client.handlers?.onDisconnected());
    const before = client.reconnects;

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(client.reconnects).toBe(before + 1);
  });

  it("cancela la suscripción y los temporizadores al desmontar", async () => {
    const client = new FakeClient();
    const { unmount } = renderHook(() => useAlertInbox(true, { userId: 42, client }));
    await flush();
    act(() => client.handlers?.onDisconnected());

    unmount();
    const calls = apiMock.mock.calls.length;
    const reconnects = client.reconnects;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(client.unsubscribed).toBe(1);
    expect(apiMock.mock.calls.length).toBe(calls);
    expect(client.reconnects).toBe(reconnects);
  });

  it("sin canal en tiempo real mantiene el sondeo de 15 s", async () => {
    renderHook(() => useAlertInbox(true));
    await flush();
    const base = apiMock.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15500);
    });

    expect(apiMock.mock.calls.length).toBe(base + 1);
  });
});
