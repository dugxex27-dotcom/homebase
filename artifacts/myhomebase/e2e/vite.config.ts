import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname, ".."),
  plugins: [react()],
  resolve: {
    alias: {
      "@stripe/stripe-js": path.resolve(import.meta.dirname, "mocks/stripe-js.ts"),
      "@stripe/react-stripe-js": path.resolve(
        import.meta.dirname,
        "mocks/react-stripe-js.tsx",
      ),
      "@": path.resolve(import.meta.dirname, "..", "src"),
    },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: ["react", "react-dom/client"],
  },
  server: {
    port: 4174,
    strictPort: true,
  },
});