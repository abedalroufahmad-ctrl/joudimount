import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("leaflet") || id.includes("react-leaflet")) {
            return "vendor-leaflet";
          }
          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }
          if (id.includes("bootstrap")) return "vendor-bootstrap";
          if (id.includes("socket.io")) return "vendor-socket";
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:4000", changeOrigin: true },
      "/uploads": { target: "http://127.0.0.1:4000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:4000", changeOrigin: true },
      "/socket.io": { target: "http://127.0.0.1:4000", ws: true },
    },
  },
});
