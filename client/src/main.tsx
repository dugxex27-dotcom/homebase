import React from "react";
import { createRoot } from "react-dom/client";

// Simple test component to verify React is working
function TestApp() {
  const [count, setCount] = React.useState(0);
  
  return React.createElement("div", {
    style: {
      padding: "40px",
      fontFamily: "Arial, sans-serif",
      background: "#f0f9ff",
      minHeight: "100vh"
    }
  }, [
    React.createElement("h1", { 
      key: "title",
      style: { fontSize: "3rem", color: "#1f2937", marginBottom: "20px" }
    }, "🏠 Home Base - Testing"),
    React.createElement("div", {
      key: "content",
      style: {
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        maxWidth: "600px"
      }
    }, [
      React.createElement("h2", {
        key: "status",
        style: { color: "#059669", marginBottom: "15px" }
      }, "✅ React Working"),
      React.createElement("p", {
        key: "description",
        style: { color: "#6b7280", marginBottom: "20px" }
      }, "React hooks and state management are functioning correctly."),
      React.createElement("button", {
        key: "counter",
        onClick: () => setCount(count + 1),
        style: {
          background: "#3b82f6",
          color: "white",
          padding: "12px 24px",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
          marginRight: "10px"
        }
      }, `Counter: ${count}`),
      React.createElement("button", {
        key: "alert",
        onClick: () => alert("React hooks working perfectly!"),
        style: {
          background: "#059669",
          color: "white",
          padding: "12px 24px",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer"
        }
      }, "Test Alert")
    ])
  ]);
}

// Initialize the React application
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(React.createElement(TestApp));
} else {
  console.error("Root element not found");
}
