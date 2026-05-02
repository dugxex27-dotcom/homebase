import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// In the Replit IDE the proxy hard-closes WebSocket connections every ~1.7 s.
// Vite's /@vite/client script creates a WebSocket and on disconnect enters
// "polling for restart" mode — polling /@vite/ping every ~1.8 s.  When the
// ping returns 200 Vite calls location.reload(), creating an infinite loop.
// @vitejs/plugin-react also injects `import { createHotContext } from
// "/@vite/client"` into every compiled module for React Fast Refresh, so
// simply stripping the <script> tag from the HTML is not enough.
//
// Fix (IDE only):
//   1. Use enforce:"pre" so our configureServer middleware is registered
//      BEFORE Vite core's own /@vite/client and /@vite/ping handlers.
//   2. Return the no-op stub for /@vite/client so no WebSocket is created.
//   3. Return 404 for /@vite/ping so the "server restarted" reload never fires.
//   4. Strip the <script src="/@vite/client"> tag from served HTML (belt+suspenders).
//
// None of this code runs in production builds.
const inReplitIDE =
  process.env.NODE_ENV !== "production" &&
  process.env.REPL_ID !== undefined;

// Minimal stub satisfying every import from /@vite/client without opening any
// WebSocket connections.
//
// CRITICAL: updateStyle / removeStyle must actually manipulate <style> tags.
// Every CSS module Vite compiles calls `__vite__updateStyle(id, cssText)`.
// If that is a no-op the entire stylesheet is silently dropped, breaking the UI.
const VITE_CLIENT_STUB = `
const __sheets__ = new Map();

export function updateStyle(id, content) {
  let el = __sheets__.get(id);
  if (!el) {
    el = document.createElement('style');
    el.setAttribute('type', 'text/css');
    el.setAttribute('data-vite-stub', id);
    document.head.appendChild(el);
    __sheets__.set(id, el);
  }
  el.textContent = content;
}

export function removeStyle(id) {
  const el = __sheets__.get(id);
  if (el) {
    el.remove();
    __sheets__.delete(id);
  }
}

export function createHotContext() {
  return {
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}

export function injectQuery(url) { return url; }
export const hmrClient = null;
`;

function replitIdeHmrKillerPlugin(): Plugin {
  return {
    name: "replit-ide-hmr-killer",
    // enforce:"pre" ensures configureServer runs BEFORE Vite core, so our
    // middleware is prepended to Connect before Vite registers its own handlers.
    enforce: "pre",

    // Strip the /@vite/client script tag from the HTML (belt-and-suspenders).
    // Use order:"post" so this transform runs AFTER Vite has injected the tag.
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        return html.replace(
          /<script\s[^>]*src="\/@vite\/client"[^>]*><\/script>/g,
          "",
        );
      },
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";

        // Intercept /@vite/client → serve no-op stub (no WebSocket created)
        if (url === "/@vite/client" || url.startsWith("/@vite/client?")) {
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-store");
          res.end(VITE_CLIENT_STUB);
          return;
        }

        // Intercept /@vite/ping → return 404 so the real (browser-cached)
        // Vite client never concludes the server has restarted and never calls
        // location.reload().
        if (url === "/@vite/ping" || url.startsWith("/@vite/ping?")) {
          res.statusCode = 404;
          res.end();
          return;
        }

        next();
      });
    },
  };
}

function onboardingRoutePlugin(): Plugin {
  return {
    name: "onboarding-route",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && (req.url === "/onboarding" || req.url.startsWith("/onboarding?") || req.url.startsWith("/onboarding/"))) {
          req.url = "/onboarding.html" + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");
        } else if (req.url && (req.url === "/welcome" || req.url.startsWith("/welcome?") || req.url.startsWith("/welcome/"))) {
          req.url = "/screen0.html" + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    onboardingRoutePlugin(),
    ...(inReplitIDE
      ? [replitIdeHmrKillerPlugin()]
      : [runtimeErrorOverlay()]),
    ...(inReplitIDE
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  css: {
    postcss: {
      plugins: [
        (await import("autoprefixer")).default(),
        (await import("tailwindcss")).default(),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      "@shared/schema": path.resolve(import.meta.dirname, "..", "..", "lib", "db", "src", "schema", "index.ts"),
      "@shared": path.resolve(import.meta.dirname, "..", "api-server", "src", "shared"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: false,
    },
    hmr: false,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
