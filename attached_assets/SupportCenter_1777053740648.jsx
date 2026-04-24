import { useState, useEffect } from "react";

// Load Inter from Google Fonts
const interLink = document.createElement("link");
interLink.rel = "stylesheet";
interLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
document.head.appendChild(interLink);

// ─── BRAND TOKENS ─────────────────────────────────────────────────────────────
const ROLES = {
  homeowner: {
    label: "Homeowner",
    icon: "🏠",
    dark:    "#2C0F5B",
    mid:     "#3C258E",
    bright:  "#3798EF",
    light:   "#B6A6F4",
    tint:    "#EEEDFE",
    border:  "#CECBF6",
    text:    "#3C3489",
    tag:     "My Home",
    greeting: "How can we help you with your home?",
    sub:      "Search FAQs, open a ticket, or chat with our AI assistant.",
    faqs: [
      { q: "How is my Home Wellness Score™ calculated?", a: "Your Home Wellness Score™ starts at 1,000 points and depreciates based on the age of your home systems (HVAC, roof, plumbing, etc.), overdue maintenance tasks, and completed repairs. Staying on top of tasks keeps your score healthy." },
      { q: "How do I add a property to my account?", a: "Go to your Dashboard and tap 'Add Property.' Enter your address and your HIN™ (Home Identification Number) will be generated automatically. You can manage up to 2 properties on the Base Plan." },
      { q: "What is the DIY Savings Tracker?", a: "Every time you complete a maintenance task yourself instead of hiring a contractor, the estimated contractor cost is logged as savings. It's a running total of money you've kept in your pocket." },
      { q: "Can I share my home records with a buyer or agent?", a: "Yes. From your Records tab, tap 'Generate Report' to create a shareable Home Wellness Report. This is one of the most valuable features when selling your home." },
      { q: "How do I connect with a contractor through the app?", a: "Navigate to the Contractor Directory, filter by trade and distance, and tap 'Connect.' The contractor receives a notification and can respond through the platform." },
      { q: "What happens to my data if I cancel my subscription?", a: "Your home records are retained for 90 days after cancellation. You can export a full PDF report at any time from your Account settings before canceling." },
    ],
    contactOptions: [
      "Home Wellness Score question",
      "Property setup help",
      "Maintenance scheduling",
      "Billing & subscription",
      "DIY Savings Tracker",
      "Technical issue",
      "Other",
    ],
  },
  contractor: {
    label: "Contractor",
    icon: "🔧",
    dark:    "#0C3460",
    mid:     "#1560A2",
    bright:  "#3798EF",
    light:   "#AFD6F9",
    tint:    "#E6F1FB",
    border:  "#B5D4F4",
    text:    "#0C447C",
    tag:     "Pro Portal",
    greeting: "Contractor support, built for the trades.",
    sub:      "Get help with your Pro account, leads, and billing.",
    faqs: [
      { q: "How do homeowners find my profile in the directory?", a: "Your profile appears in the Contractor Directory filtered by trade category and geographic radius. Homeowners search by service type and location — keeping your profile complete and your response rate high improves your ranking." },
      { q: "How does the referral program work for contractors?", a: "Every homeowner you refer to MyHomeBase™ reduces your $20/month subscription by $1. Refer 20 homeowners and your subscription is completely free for as long as they remain paid subscribers." },
      { q: "How do I receive and respond to job requests?", a: "When a homeowner connects with you through the directory, you'll receive a push notification and in-app message. You can accept, decline, or send a quote directly through the platform." },
      { q: "Can I track my service history with homeowners?", a: "Yes. Every completed job logged through the platform is stored in both your Pro record and the homeowner's maintenance history. This builds your verified track record over time." },
      { q: "What does 'Verified Badge' mean and how do I get one?", a: "The Verified Badge indicates your license, insurance, and identity have been confirmed by MyHomeBase™. Submit your credentials in your Profile settings and our team reviews within 48 hours." },
      { q: "How do I update my service area and trade categories?", a: "Go to your Profile → Services & Coverage. You can set a radius in miles from your base location and select up to 10 trade categories." },
    ],
    contactOptions: [
      "Profile & directory listing",
      "Job requests & leads",
      "Referral program",
      "Verified Badge application",
      "Billing & subscription",
      "Technical issue",
      "Other",
    ],
  },
  agent: {
    label: "RE Agent",
    icon: "🏡",
    dark:    "#09694A",
    mid:     "#079669",
    bright:  "#22C55E",
    light:   "#D4EBDE",
    tint:    "#F0FAF4",
    border:  "#A7D7B8",
    text:    "#065F46",
    tag:     "Agent Hub",
    greeting: "Support for real estate professionals.",
    sub:      "Get help with listings, Home Wellness Reports, and your agent account.",
    faqs: [
      { q: "How do I access a home's Wellness Report for a listing?", a: "If the homeowner has shared their report with you, it appears under your Agent Hub → Shared Reports. You can also request access directly from a homeowner by sending them a report share request through the platform." },
      { q: "Can I use Home Wellness Reports in my listing marketing?", a: "Yes. A strong Home Wellness Score™ is a powerful differentiator in listings. You can embed the score badge and link to the shareable report in your MLS listings, property websites, and marketing materials." },
      { q: "How does MyHomeBase help with buyer confidence?", a: "Buyers can see a verified, time-stamped maintenance history for a property — similar to a Carfax report for a car. This reduces inspection anxiety and can accelerate time to close." },
      { q: "Can I recommend MyHomeBase to my seller clients?", a: "Absolutely — and we encourage it. Sellers who build a strong Home Wellness Score™ before listing typically command higher offers and smoother inspections. Share your agent referral link from your Agent Hub." },
      { q: "Is there a commission or referral fee for agents?", a: "Yes. When a homeowner signs up through your referral link and becomes a paid subscriber, you receive a referral credit. Details are in your Agent Hub under Referrals & Earnings." },
      { q: "How do I add multiple listings to track?", a: "From your Agent Hub dashboard, tap 'Add Listing' and enter the property address. If the homeowner is already on MyHomeBase™, you can request to link to their existing account." },
    ],
    contactOptions: [
      "Accessing a Wellness Report",
      "Listing & marketing use",
      "Referral & commission",
      "Buyer or seller guidance",
      "Account & billing",
      "Technical issue",
      "Other",
    ],
  },
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);
const TicketIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
  </svg>
);
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const WrenchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const AgentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>
  </svg>
);



// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a, role, index }) {
  const [open, setOpen] = useState(false);
  const r = ROLES[role];
  return (
    <div
      style={{
        borderRadius: "12px", overflow: "hidden",
        border: `0.5px solid ${open ? r.border : "rgba(0,0,0,0.08)"}`,
        background: open ? r.tint : "#fff",
        transition: "all 0.2s",
        animationDelay: `${index * 60}ms`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "14px 16px", background: "transparent",
          border: "none", cursor: "pointer", display: "flex",
          justifyContent: "space-between", alignItems: "center", gap: "12px",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a2e", lineHeight: "1.4" }}>{q}</span>
        <span style={{
          color: r.mid, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s",
        }}>
          <ChevronDown />
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", fontSize: "13px", color: "#4a5568", lineHeight: "1.7" }}>
          {a}
        </div>
      )}
    </div>
  );
}

// ─── TICKET FORM ──────────────────────────────────────────────────────────────
function TicketForm({ role }) {
  const r = ROLES[role];
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", category: "", message: "" });

  if (submitted) return (
    <div style={{
      textAlign: "center", padding: "40px 20px",
      background: r.tint, borderRadius: "16px", border: `0.5px solid ${r.border}`,
    }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
      <p style={{ fontSize: "15px", fontWeight: "600", color: r.text, margin: "0 0 6px" }}>Ticket submitted!</p>
      <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>We'll respond within 24 hours to <strong>{form.email}</strong></p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {[
        { label: "Your name", key: "name", type: "text", placeholder: "Jane Smith" },
        { label: "Email address", key: "email", type: "email", placeholder: "jane@email.com" },
      ].map(({ label, key, type, placeholder }) => (
        <div key={key}>
          <label style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>{label}</label>
          <input
            type={type} placeholder={placeholder} value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: "10px", fontSize: "14px",
              border: `1px solid ${r.border}`, background: "#fff", color: "#1a1a2e",
              outline: "none", boxSizing: "border-box",
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>
      ))}
      <div>
        <label style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Category</label>
        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          style={{
            width: "100%", padding: "11px 14px", borderRadius: "10px", fontSize: "14px",
            border: `1px solid ${r.border}`, background: "#fff", color: form.category ? "#1a1a2e" : "#9ca3af",
            outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", cursor: "pointer",
          }}
        >
          <option value="">Select a topic...</option>
          {r.contactOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Message</label>
        <textarea
          placeholder="Describe your issue or question..."
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          rows={4}
          style={{
            width: "100%", padding: "11px 14px", borderRadius: "10px", fontSize: "14px",
            border: `1px solid ${r.border}`, background: "#fff", color: "#1a1a2e",
            outline: "none", boxSizing: "border-box", resize: "vertical",
            fontFamily: "'Inter', sans-serif", lineHeight: "1.6",
          }}
        />
      </div>
      <button
        onClick={() => form.name && form.email && form.category && form.message && setSubmitted(true)}
        style={{
          width: "100%", padding: "13px", borderRadius: "10px", border: "none",
          background: `linear-gradient(135deg, ${r.dark}, ${r.mid})`,
          color: "#fff", fontSize: "14px", fontWeight: "600",
          cursor: "pointer", letterSpacing: "0.3px", fontFamily: "'Inter', sans-serif",
        }}
      >
        Submit Ticket →
      </button>
    </div>
  );
}

// ─── SUPPORT CENTER ───────────────────────────────────────────────────────────
function SupportCenter({ role }) {
  const r = ROLES[role];
  const [tab, setTab] = useState("faqs");
  const [search, setSearch] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const filteredFaqs = r.faqs.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  const handleAsk = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are the MyHomeBase™ AI Support Assistant for ${r.label}s. MyHomeBase is a home management platform featuring the Home Wellness Score™, maintenance scheduling, contractor directory, and service record tracking. Answer support questions helpfully and concisely in 2-4 sentences. Stay focused on ${r.label}-relevant topics. Be warm, professional, and solution-oriented.`,
          messages: [{ role: "user", content: aiInput }],
        }),
      });
      const data = await res.json();
      setAiResponse(data.content?.[0]?.text || "I couldn't find an answer. Please open a support ticket and our team will help you shortly.");
    } catch {
      setAiResponse("Something went wrong. Please try again or open a support ticket.");
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = ["faqs", "ticket", "contact"];
  const tabLabels = { faqs: "FAQs", ticket: "Open Ticket", contact: "Contact" };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "420px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${r.dark} 0%, ${r.mid} 100%)`,
        borderRadius: "20px 20px 0 0", padding: "22px 22px 24px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "160px", height: "160px", borderRadius: "50%",
          background: `radial-gradient(circle, ${r.bright}30 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />


        <p style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase", color: `${r.light}`, margin: "0 0 6px" }}>Help & Support</p>
        <h1 style={{ fontSize: "24px", fontWeight: "normal", color: "#fff", margin: "0 0 6px", lineHeight: "1.2" }}>Support Center</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: "0 0 22px", lineHeight: "1.5" }}>{r.greeting}</p>

        {/* Stats */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
          {[
            { val: r.faqs.length, label: "FAQs" },
            { val: "0", label: "My Tickets" },
            { val: "24h", label: "Response", color: r.light },
          ].map(({ val, label, color }) => (
            <div key={label} style={{
              flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: "10px",
              padding: "10px", textAlign: "center",
            }}>
              <p style={{ fontSize: "18px", fontWeight: "600", color: color || "#fff", margin: "0 0 2px" }}>{val}</p>
              <p style={{ fontSize: "9px", letterSpacing: "1px", color: "rgba(255,255,255,0.6)", margin: 0, textTransform: "uppercase" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)" }}>
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setTab("faqs"); }}
            placeholder="Search FAQs..."
            style={{
              width: "100%", padding: "12px 14px 12px 42px", borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.12)",
              color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box",
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ background: "#f8f9fa", borderRadius: "0 0 20px 20px", padding: "20px 22px 28px", border: `0.5px solid ${r.border}`, borderTop: "none" }}>

        {/* AI Assistant */}
        <div style={{
          background: `linear-gradient(135deg, ${r.dark}, ${r.mid})`,
          borderRadius: "14px", padding: "14px 16px", marginBottom: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <span style={{ color: r.light }}><SparkleIcon /></span>
            <div>
              <p style={{ fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: r.light, margin: 0 }}>AI Assistant</p>
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#fff", margin: 0 }}>Ask anything about your {r.label.toLowerCase()} account</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAsk()}
              placeholder="Type your question..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.15)",
                color: "#fff", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif",
              }}
            />
            <button
              onClick={handleAsk}
              style={{
                padding: "10px 16px", borderRadius: "8px", border: "none",
                background: r.light, color: r.dark, fontSize: "13px",
                fontWeight: "600", cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0,
              }}
            >
              {aiLoading ? "..." : "Ask →"}
            </button>
          </div>
          {aiResponse && (
            <div style={{
              marginTop: "12px", padding: "12px", borderRadius: "8px",
              background: "rgba(255,255,255,0.12)", fontSize: "13px",
              color: "rgba(255,255,255,0.9)", lineHeight: "1.6",
            }}>
              {aiResponse}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", background: "#fff", borderRadius: "10px",
          padding: "3px", marginBottom: "18px", border: `0.5px solid ${r.border}`,
        }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: tab === t ? r.mid : "transparent",
                color: tab === t ? "#fff" : "#6b7280",
                fontSize: "12px", fontWeight: tab === t ? "600" : "400",
                transition: "all 0.2s", fontFamily: "'Inter', sans-serif",
              }}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* FAQs Tab */}
        {tab === "faqs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 10px" }}>
              {search ? `${filteredFaqs.length} result${filteredFaqs.length !== 1 ? "s" : ""} for "${search}"` : "Frequently Asked"}
            </p>
            {filteredFaqs.length > 0
              ? filteredFaqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} role={role} index={i} />)
              : <p style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center", padding: "20px" }}>No FAQs match your search. Try opening a ticket.</p>
            }
          </div>
        )}

        {/* Ticket Tab */}
        {tab === "ticket" && (
          <div>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 16px" }}>Open a Support Ticket</p>
            <TicketForm role={role} />
          </div>
        )}

        {/* Contact Tab */}
        {tab === "contact" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 6px" }}>Get in Touch</p>
            {[
              { icon: "📧", label: "Email Support", val: `${role}s@gotohomebase.com`, sub: "Response within 24 hours" },
              { icon: "💬", label: "Live Chat", val: "Available 9am–6pm EST", sub: "Mon–Fri" },
              { icon: "📞", label: "Phone", val: "1-800-MHB-HOME", sub: "For urgent issues only" },
            ].map(({ icon, label, val, sub }) => (
              <div key={label} style={{
                background: "#fff", borderRadius: "12px", padding: "14px 16px",
                border: `0.5px solid ${r.border}`, display: "flex", gap: "12px", alignItems: "center",
              }}>
                <span style={{ fontSize: "20px", flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a2e", margin: "0 0 2px" }}>{label}</p>
                  <p style={{ fontSize: "13px", color: r.text, margin: "0 0 1px" }}>{val}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState("homeowner");
  const r = ROLES[role];

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${r.dark}22 0%, #f0f0f5 50%)`,
      padding: "24px 16px 48px",
      transition: "background 0.4s ease",
    }}>
      {/* Dev role switcher — remove in production, use auth role instead */}
      <div style={{
        maxWidth: "420px", margin: "0 auto 16px",
        background: "rgba(0,0,0,0.06)", borderRadius: "10px", padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.5px" }}>
          Preview as:
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          {Object.keys(ROLES).map(key => (
            <button
              key={key}
              onClick={() => setRole(key)}
              style={{
                padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer",
                background: role === key ? ROLES[key].mid : "rgba(0,0,0,0.08)",
                color: role === key ? "#fff" : "#6b7280",
                fontSize: "11px", fontFamily: "'Inter', sans-serif", fontWeight: role === key ? "600" : "400",
                transition: "all 0.2s",
              }}
            >
              {ROLES[key].label}
            </button>
          ))}
        </div>
      </div>

      <SupportCenter role={role} key={role} />
    </div>
  );
}
