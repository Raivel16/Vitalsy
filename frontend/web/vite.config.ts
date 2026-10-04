import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:8000";
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT;
const port = Number(process.env.PORT || 4200);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port,
    allowedHosts: true,
    proxy: {
      "/api": { target: proxyTarget, changeOrigin: true },
      "/sanctum": { target: proxyTarget, changeOrigin: true },
      "/up": { target: proxyTarget, changeOrigin: true },
    },
    hmr: hmrClientPort ? { clientPort: Number(hmrClientPort) } : undefined,
    watch: process.env.CHOKIDAR_USEPOLLING === "true" ? { usePolling: true } : undefined,
  },
  preview: {
    host: "0.0.0.0",
    port,
  },
});
