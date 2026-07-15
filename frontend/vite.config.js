import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Dev server proxies API + WebSocket traffic to the Flask/SocketIO
// backend on :5000, so `npm run dev` and `python app.py` can run side
// by side without CORS juggling. In production, `npm run build`
// outputs to frontend/dist, which Flask serves directly on the same
// origin — no proxy needed at demo time.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
      },
      "/api": {
        target: "http://localhost:5000",
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
