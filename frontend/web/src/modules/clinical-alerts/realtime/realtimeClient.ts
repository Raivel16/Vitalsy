import { ALERT_RAISED_EVENT, ALERT_UPDATED_EVENT, alertChannelName } from "./alertEvents";

/**
 * RNF-01 / RNF-12: transporte en tiempo real de alertas. El hook depende de
 * esta interfaz (inyectable) y no de Echo/Pusher, para poder probar la
 * reconexión con un cliente falso. La bandeja de la API sigue siendo la
 * fuente de verdad: un evento solo indica «vuelva a consultar».
 */
export type RealtimeHandlers = {
  /** Llegó una alerta nueva o cambió el estado de una existente. */
  onAlert: () => void;
  onConnected: () => void;
  onDisconnected: () => void;
};

export interface RealtimeClient {
  /** Suscribe al canal privado del usuario; devuelve la función de baja. */
  subscribe(userId: number, handlers: RealtimeHandlers): () => void;
  /** Fuerza un intento de conexión inmediato (no-op si ya está conectado). */
  reconnect(): void;
}

// El punto inicial hace que Echo use el nombre tal cual (sin namespace de aplicación).
const ALERT_EVENTS = [`.${ALERT_RAISED_EVENT}`, `.${ALERT_UPDATED_EVENT}`] as const;

function xsrfToken(): string {
  const match = /(?:^|; )XSRF-TOKEN=([^;]*)/.exec(document.cookie);
  return match ? decodeURIComponent(match[1]) : "";
}

type EchoLike = {
  private(channel: string): { listen(event: string, callback: () => void): unknown };
  leave(channel: string): void;
  disconnect(): void;
  connector: {
    pusher: {
      connect(): void;
      connection: { bind(event: string, callback: () => void): void; unbind(event: string, callback?: () => void): void };
    };
  };
};

const CONNECTED_EVENTS = ["connected"] as const;
const DISCONNECTED_EVENTS = ["disconnected", "unavailable", "failed", "connecting"] as const;

/**
 * Cliente real sobre Laravel Echo + pusher-js (Laravel Reverb habla el
 * protocolo Pusher). La autorización del canal privado usa la misma sesión
 * Sanctum (cookie + XSRF) que el resto de la API.
 */
export function createEchoClient(): RealtimeClient {
  let echo: EchoLike | null = null;
  let subscribers = 0;

  async function ensure(): Promise<EchoLike> {
    if (echo) return echo;
    const [{ default: Echo }, { default: Pusher }] = await Promise.all([import("laravel-echo"), import("pusher-js")]);
    (window as unknown as { Pusher: unknown }).Pusher = Pusher;

    const env = import.meta.env;
    const baseUrl = String(env.VITE_API_URL ?? "").replace(/\/$/, "");
    const scheme = String(env.VITE_REVERB_SCHEME ?? window.location.protocol.replace(":", ""));
    const forceTLS = scheme === "https";
    const port = Number(env.VITE_REVERB_PORT || window.location.port || (forceTLS ? 443 : 80));

    const options = {
      broadcaster: "reverb",
      key: String(env.VITE_REVERB_APP_PUBLIC ?? ""),
      wsHost: String(env.VITE_REVERB_HOST || window.location.hostname),
      wsPort: port,
      wssPort: port,
      forceTLS,
      enabledTransports: ["ws", "wss"],
      disableStats: true,
      channelAuthorization: {
        endpoint: `${baseUrl}/api/v1/broadcasting/auth`,
        transport: "ajax",
        customHandler: (
          params: { socketId: string; channelName: string },
          callback: (error: Error | null, data: unknown) => void,
        ) => {
          fetch(`${baseUrl}/api/v1/broadcasting/auth`, {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
              ...(xsrfToken() ? { "X-XSRF-TOKEN": xsrfToken() } : {}),
            },
            body: JSON.stringify({ socket_id: params.socketId, channel_name: params.channelName }),
          })
            .then(async (response) => {
              if (!response.ok) throw new Error(`broadcast auth ${response.status}`);
              callback(null, await response.json());
            })
            .catch((error: Error) => callback(error, null));
        },
      },
    };

    echo = new (Echo as unknown as new (config: unknown) => EchoLike)(options);
    return echo;
  }

  return {
    subscribe(userId, handlers) {
      let cancelled = false;
      let released = false;
      let cleanup: (() => void) | null = null;
      subscribers += 1;

      // Libera exactamente una vez (baja normal o fallo de ensure()); evita fugas del contador.
      const release = () => {
        if (released) return;
        released = true;
        subscribers = Math.max(0, subscribers - 1);
        if (subscribers === 0 && echo) {
          echo.disconnect();
          echo = null;
        }
      };

      void ensure()
        .then((instance) => {
          if (cancelled) return;
          const channel = alertChannelName(userId);
          const onAlert = () => handlers.onAlert();
          const connection = instance.connector.pusher.connection;
          const onConnected = () => handlers.onConnected();
          const onDisconnected = () => handlers.onDisconnected();

          const subscription = instance.private(channel);
          ALERT_EVENTS.forEach((name) => subscription.listen(name, onAlert));
          CONNECTED_EVENTS.forEach((name) => connection.bind(name, onConnected));
          DISCONNECTED_EVENTS.forEach((name) => connection.bind(name, onDisconnected));

          cleanup = () => {
            CONNECTED_EVENTS.forEach((name) => connection.unbind(name, onConnected));
            DISCONNECTED_EVENTS.forEach((name) => connection.unbind(name, onDisconnected));
            instance.leave(channel);
          };
        })
        .catch(() => {
          release();
          handlers.onDisconnected();
        });

      return () => {
        cancelled = true;
        cleanup?.();
        release();
      };
    },

    reconnect() {
      echo?.connector.pusher.connect();
    },
  };
}
