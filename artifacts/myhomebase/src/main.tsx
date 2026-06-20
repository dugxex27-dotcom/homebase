import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

if (Capacitor.isNativePlatform()) {
  const nativeApiBase = (import.meta.env.VITE_API_BASE_URL as string) || "https://gotohomebase.com";

  document.documentElement.classList.add("native-shell");
  document.body.classList.add("native-shell");

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && (input.startsWith("/api/") || input.startsWith("/auth/"))) {
      return originalFetch(`${nativeApiBase}${input}`, init);
    }

    if (input instanceof URL && (input.pathname.startsWith("/api/") || input.pathname.startsWith("/auth/"))) {
      return originalFetch(new URL(`${nativeApiBase}${input.pathname}${input.search}`), init);
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

void import("@capacitor/splash-screen")
  .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 0 }))
  .catch(() => {
    // Web/PWA builds do not have a native splash screen to hide.
  });
