import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  options: null as Record<string, unknown> | null,
  listened: [] as Array<{ channel: string; event: string }>,
  bound: new Map<string, Array<() => void>>(),
  left: [] as string[],
  disconnects: 0,
  connects: 0,
  failImport: false,
}));

vi.mock("laravel-echo", () => ({
  default: class FakeEcho {
    connector = {
      pusher: {
        connect: () => {
          state.connects += 1;
        },
        connection: {
          bind: (event: string, cb: () => void) => {
            state.bound.set(event, [...(state.bound.get(event) ?? []), cb]);
          },
          unbind: () => undefined,
        },
      },
    };

    constructor(options: Record<string, unknown>) {
      if (state.failImport) throw new Error("boom");
      state.options = options;
    }

    private(channel: string) {
      return {
        listen: (event: string) => {
          state.listened.push({ channel, event });
        },
      };
    }

    leave(channel: string) {
      state.left.push(channel);
    }

    disconnect() {
      state.disconnects += 1;
    }
  },
}));
vi.mock("pusher-js", () => ({ default: class FakePusher {} }));

import { ALERT_RAISED_EVENT, ALERT_UPDATED_EVENT, alertChannelName } from "./alertEvents";
import { createEchoClient } from "./realtimeClient";

const handlers = () => ({ onAlert: vi.fn(), onConnected: vi.fn(), onDisconnected: vi.fn() });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createEchoClient (RNF-01)", () => {
  beforeEach(() => {
    state.options = null;
    state.listened = [];
    state.bound = new Map();
    state.left = [];
    state.disconnects = 0;
    state.connects = 0;
    state.failImport = false;
    vi.stubEnv("VITE_REVERB_APP_KEY", "clave-publica");
    vi.stubEnv("VITE_REVERB_HOST", "ws.vitalsy.test");
    vi.stubEnv("VITE_REVERB_PORT", "443");
    vi.stubEnv("VITE_REVERB_SCHEME", "https");
    vi.stubEnv("VITE_API_URL", "https://api.vitalsy.test");
    document.cookie = "XSRF-TOKEN=tok%3D1";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("configura Echo para Reverb y escucha en alerts.{id} los eventos del backend", async () => {
    const client = createEchoClient();
    const h = handlers();
    client.subscribe(42, h);
    await tick();

    expect(state.options).toMatchObject({
      broadcaster: "reverb",
      key: "clave-publica",
      wsHost: "ws.vitalsy.test",
      wsPort: 443,
      wssPort: 443,
      forceTLS: true,
    });
    expect(state.listened).toEqual([
      { channel: alertChannelName(42), event: `.${ALERT_RAISED_EVENT}` },
      { channel: "alerts.42", event: `.${ALERT_UPDATED_EVENT}` },
    ]);
    state.bound.get("connected")?.forEach((cb) => cb());
    expect(h.onConnected).toHaveBeenCalled();
    state.bound.get("unavailable")?.forEach((cb) => cb());
    expect(h.onDisconnected).toHaveBeenCalled();
  });

  it("autoriza el canal con cookie de sesión y cabecera XSRF hacia el endpoint de broadcasting", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ auth: "k:sig" }) }));
    vi.stubGlobal("fetch", fetchMock);
    createEchoClient().subscribe(7, handlers());
    await tick();

    const auth = (state.options?.channelAuthorization as {
      customHandler: (p: { socketId: string; channelName: string }, cb: (e: Error | null, d: unknown) => void) => void;
    }).customHandler;
    const result = await new Promise<{ error: Error | null; data: unknown }>((resolve) => {
      auth({ socketId: "1.2", channelName: "private-alerts.7" }, (error, data) => resolve({ error, data }));
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.vitalsy.test/api/v1/broadcasting/auth");
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["X-XSRF-TOKEN"]).toBe("tok=1");
    expect(JSON.parse(String(init.body))).toEqual({ socket_id: "1.2", channel_name: "private-alerts.7" });
    expect(result).toEqual({ error: null, data: { auth: "k:sig" } });
  });

  it("reconnect fuerza connect() y dar de baja deja el canal y cierra la conexión", async () => {
    const client = createEchoClient();
    const unsubscribe = client.subscribe(1, handlers());
    await tick();

    client.reconnect();
    expect(state.connects).toBe(1);

    unsubscribe();
    expect(state.left).toEqual(["alerts.1"]);
    expect(state.disconnects).toBe(1);
  });

  it("no filtra el contador de suscriptores si Echo falla al crearse", async () => {
    state.failImport = true;
    const client = createEchoClient();
    const h = handlers();
    const unsubscribe = client.subscribe(1, h);
    await tick();
    expect(h.onDisconnected).toHaveBeenCalled();
    unsubscribe();

    state.failImport = false;
    const h2 = handlers();
    const second = client.subscribe(2, h2);
    await tick();
    second();

    // Si el contador se hubiera filtrado, la conexión nunca se cerraría.
    expect(state.disconnects).toBe(1);
  });
});
