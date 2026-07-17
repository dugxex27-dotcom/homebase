import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function ReferralEntry() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);

  const nextPath = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("next") || "/dashboard";
  })();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setCode(ref.toUpperCase());
  }, []);

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) { navigate(nextPath); return; }
    setError("");
    setApplying(true);
    try {
      const res = await fetch("/api/apply-referral-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Invalid referral code");
      }
      navigate(nextPath);
    } catch (err: any) {
      setError(err.message || "Failed to apply code");
    } finally {
      setApplying(false);
    }
  };

  const handleSkip = () => navigate(nextPath);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #2C0F5B 0%, #3C258E 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        padding: "44px 36px",
        maxWidth: 420,
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        textAlign: "center",
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3C258E, #6B4FBB)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 28,
        }}>🎁</div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#2C0F5B", margin: "0 0 10px" }}>
          Were you referred by a friend?
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 28px", lineHeight: 1.6 }}>
          Enter their referral code and they'll get credit — completely optional.
        </p>

        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleApply()}
          placeholder="REFERRAL CODE"
          maxLength={20}
          autoFocus
          style={{
            width: "100%",
            padding: "14px 16px",
            border: `2px solid ${error ? "#ef4444" : "#e2e8f0"}`,
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            textAlign: "center",
            letterSpacing: 3,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "monospace",
            marginBottom: error ? 6 : 20,
            color: "#1a1a1a",
          }}
        />
        {error && (
          <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 16px", textAlign: "left" }}>{error}</p>
        )}

        <button
          onClick={handleApply}
          disabled={applying}
          style={{
            width: "100%",
            background: applying ? "#9ca3af" : "linear-gradient(135deg, #3C258E, #5A3FBF)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "15px 0",
            fontSize: 15,
            fontWeight: 700,
            cursor: applying ? "not-allowed" : "pointer",
            marginBottom: 12,
            fontFamily: "inherit",
          }}
        >
          {applying ? "Applying…" : code.trim() ? "Apply Code & Continue" : "Continue →"}
        </button>

        <button
          onClick={handleSkip}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "4px 8px",
            textDecoration: "underline",
          }}
        >
          Skip — I don't have a referral code
        </button>
      </div>
    </div>
  );
}
