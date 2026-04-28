import { Link } from "wouter";
import logoWhite from "@assets/my-homebase-logo-tm-final-white_1777417516350.png";

export default function ComingSoon() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #130a2e 0%, #2C0F5B 55%, #3C258E 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: "'Inter', 'Inter', system-ui, sans-serif",
      textAlign: 'center',
      color: '#fff',
    }}>
      <img
        src={logoWhite}
        alt="MyHomeBase"
        style={{ height: 32, width: 'auto', objectFit: 'contain', marginBottom: 40 }}
      />
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 24,
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        backdropFilter: 'blur(8px)',
      }}>
        <p style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#a78bfa',
          margin: '0 0 16px',
        }}>Coming Soon</p>
        <h1 style={{
          fontSize: 'clamp(26px, 5vw, 38px)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#fff',
          margin: '0 0 16px',
          lineHeight: 1.2,
        }}>This page is coming soon.</h1>
        <p style={{
          fontSize: 16,
          lineHeight: 1.65,
          color: 'rgba(255,255,255,0.65)',
          margin: '0 0 36px',
        }}>
          We're still building this out. Check back soon — good things are on the way.
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          background: '#fff',
          color: '#2C0F5B',
          textDecoration: 'none',
          padding: '13px 32px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          transition: 'transform 0.15s',
        }}>
          ← Return to homepage
        </Link>
      </div>
      <p style={{
        marginTop: 32,
        fontSize: 12,
        color: 'rgba(255,255,255,0.25)',
        fontStyle: 'italic',
      }}>
        Your home has a record. Now it has a score.
      </p>
    </div>
  );
}
