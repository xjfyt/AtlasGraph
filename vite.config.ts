import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // NVL layout-workers uses SharedWorker with new URL(..., import.meta.url).
  // Vite's dep optimizer breaks these URLs, so exclude the package.
  // Its CJS dependencies must be explicitly included so Vite converts them to ESM.
  optimizeDeps: {
    exclude: ["@neo4j-nvl/layout-workers"],
    include: [
      "cytoscape",
      "cytoscape-cose-bilkent",
      "cose-base",
      "graphlib",
      "@neo4j-bloom/dagre",
      "bin-pack",
    ],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
