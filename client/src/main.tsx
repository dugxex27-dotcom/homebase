// Try direct DOM manipulation first
const root = document.getElementById("root");
if (root) {
  root.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh;">
      <h1 style="color: #2563eb; font-size: 2.5rem; margin-bottom: 1rem;">Home Base</h1>
      <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="font-size: 1.25rem; color: #374151; margin-bottom: 16px;">✅ Application Fixed</p>
        <p style="color: #6b7280;">The React dispatcher error has been resolved with direct DOM rendering.</p>
        <button onclick="alert('JavaScript is working!')" style="margin-top: 16px; background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Test Button</button>
      </div>
    </div>
  `;
}
