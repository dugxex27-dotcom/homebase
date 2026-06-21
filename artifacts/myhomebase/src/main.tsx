import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

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
