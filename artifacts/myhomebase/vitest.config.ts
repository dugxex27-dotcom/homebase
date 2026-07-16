import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared/schema": path.resolve(import.meta.dirname, "..", "..", "lib", "db", "src", "schema", "index.ts"),
      "@shared": path.resolve(import.meta.dirname, "..", "api-server", "src", "shared"),
    },
  },
});
