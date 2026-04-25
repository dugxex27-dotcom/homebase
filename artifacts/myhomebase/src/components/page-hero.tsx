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
      background: 'var(--theme-primary)',
      padding: '16px 18px 20px',
    }}>
      {(eyebrow || action) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          {eyebrow ? (
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--theme-eyebrow)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              {eyebrow}
            </div>
          ) : <span />}
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '-0.3px',
        lineHeight: 1.2,
        fontFamily: 'var(--font-sans)',
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          marginTop: 4,
          fontFamily: 'var(--font-sans)',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
