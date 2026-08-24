import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Proxy /api/* → Django backend on :8000
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
    // CRITICAL: exclude the Python venv and backend from the file watcher.
    // Without this, Vite tries to watch hundreds of thousands of Python files
    // inside django_backend/venv and crashes / reloads continuously.
    watch: {
      ignored: [
        "**/django_backend/**",
        "**/node_modules/**",
        "**/.git/**",
      ],
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
