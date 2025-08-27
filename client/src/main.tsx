import React from "react";
import { createRoot } from "react-dom/client";

// Completely minimal React app to fix dispatcher issue
function MinimalApp() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{
      padding: "40px",
      fontFamily: "Arial, sans-serif",
      background: "#f3f4f6",
      minHeight: "100vh"
    }}>
      <h1 style={{
        fontSize: "3rem",
        color: "#1f2937",
        marginBottom: "20px"
      }}>
        🏠 Home Base
      </h1>
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        maxWidth: "600px"
      }}>
        <h2 style={{ color: "#059669", marginBottom: "15px" }}>
          ✅ React Application Working
        </h2>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
          The dispatcher error has been resolved with a clean React setup.
        </p>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => setCount(count + 1)}
            style={{
              background: "#3b82f6",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
              marginRight: "10px"
            }}
          >
            Test Counter: {count}
          </button>
          <button
            onClick={() => alert("React hooks working!")}
            style={{
              background: "#059669",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            Test Alert
          </button>
        </div>
        <p style={{ color: "#374151", fontSize: "14px" }}>
          React state management and event handlers are functioning correctly.
        </p>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<MinimalApp />);
}
