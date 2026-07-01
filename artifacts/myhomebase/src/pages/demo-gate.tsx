import { useState, FormEvent } from "react";
import { apiRequest } from "@/lib/queryClient";
import logoWhite from "@assets/my-homebase-logo-tm-final-white_1777417516350.png";

type Role = 'homeowner' | 'contractor' | 'agent';

function getRoleFromSearch(): Role {
  const params = new URLSearchParams(window.location.search);
  const r = params.get('role');
  if (r === 'contractor' || r === 'agent') return r;
  return 'homeowner';
}

const ROLE_LABEL: Record<Role, string> = {
  homeowner: 'Homeowner',
  contractor: 'Contractor',
  agent: 'Real Estate Agent',
};

export default function DemoGate() {
  const role = getRoleFromSearch();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const launch = async (leadData?: { name: string; email: string; zipcode: string }) => {
    setSubmitting(true);
    if (leadData) {
      try {
        await apiRequest('/api/demo-lead', 'POST', { ...leadData, role });
      } catch { }
    }
    // Navigate to the GET demo-login endpoint — it sets the session server-side
    // and issues a redirect, avoiding the proxy stripping Set-Cookie on AJAX responses.
    const endpoint =
      role === 'homeowner' ? '/api/auth/homeowner-demo-login' :
      role === 'contractor' ? '/api/auth/contractor-demo-login' :
      '/api/auth/agent-demo-login';
    window.location.href = endpoint;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    launch({ name, email, zipcode: zip });
  };

  const handleSkip = () => launch();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0a3e 0%, #2C0F5B 50%, #3C258E 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <a href="/" style={{ marginBottom: '32px', display: 'block' }}>
        <img src={logoWhite} alt="MyHomeBase" style={{ height: 36, display: 'block' }} />
      </a>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        {/* Accent bar */}
        <div style={{ height: 5, background: 'linear-gradient(90deg, #2C0F5B, #7c3aed)' }} />

        <div style={{ padding: '32px 36px 36px' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: '#7c3aed', margin: '0 0 6px',
          }}>
            Quick intro
          </p>
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: '#1a0a3e',
            margin: '0 0 6px', lineHeight: 1.2,
          }}>
            Before you explore the {ROLE_LABEL[role]} demo
          </h1>
          <p style={{
            fontSize: 13.5, color: '#6b6b8d', margin: '0 0 24px', lineHeight: 1.5,
          }}>
            Tell us a little about yourself — takes 10 seconds.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 11.5, fontWeight: 700,
                color: '#3C258E', marginBottom: 5, letterSpacing: '0.04em',
              }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                disabled={submitting}
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 11.5, fontWeight: 700,
                color: '#3C258E', marginBottom: 5, letterSpacing: '0.04em',
              }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={submitting}
                style={inputStyle}
              />
            </div>

            {/* ZIP */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 11.5, fontWeight: 700,
                color: '#3C258E', marginBottom: 5, letterSpacing: '0.04em',
              }}>
                ZIP Code
              </label>
              <input
                type="text"
                placeholder="90210"
                value={zip}
                onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                required
                disabled={submitting}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', marginTop: 8, padding: '13px 0',
                background: submitting ? '#9090b0' : 'linear-gradient(135deg, #3C258E, #7c3aed)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 14.5, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'opacity 0.2s',
              }}
            >
              {submitting ? 'Loading…' : 'Enter Demo →'}
            </button>
          </form>

          <button
            onClick={handleSkip}
            disabled={submitting}
            style={{
              display: 'block', width: '100%', textAlign: 'center',
              marginTop: 12, fontSize: 12, color: '#9090b0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'underline',
            }}
          >
            Skip and go straight to demo
          </button>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 24 }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back to homepage</a>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #e0daf5',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#1a0a3e',
  background: '#faf9ff',
  outline: 'none',
  boxSizing: 'border-box',
};
