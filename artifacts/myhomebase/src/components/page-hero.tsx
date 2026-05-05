import { ReactNode } from 'react';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHero({ eyebrow, title, subtitle, action }: PageHeroProps) {
  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--theme-gradient-start) 0%, var(--theme-gradient-end) 100%)',
      padding: '22px 28px 24px',
    }}>
      {/* Radial decoration */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 220,
        height: 220,
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {(eyebrow || action) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          position: 'relative',
        }}>
          {eyebrow ? (
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--theme-eyebrow)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              {eyebrow}
            </div>
          ) : <span />}
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{
        position: 'relative',
        fontSize: 22,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.4px',
        lineHeight: 1.15,
        fontFamily: 'var(--font-sans)',
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{
          position: 'relative',
          fontSize: 12,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.52)',
          marginTop: 5,
          fontFamily: 'var(--font-sans)',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
