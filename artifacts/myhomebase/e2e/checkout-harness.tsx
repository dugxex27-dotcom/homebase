import React from "react";
import { createRoot } from "react-dom/client";
import { CheckoutModal } from "../src/components/CheckoutModal";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CheckoutModal
      plan="keyboard-visibility-test"
      trialMode={false}
      onClose={() => undefined}
    />
  </React.StrictMode>,
);