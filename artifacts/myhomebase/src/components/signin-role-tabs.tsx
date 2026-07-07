import { useLocation } from "wouter";

export type SignInRole = 'homeowner' | 'contractor' | 'agent';

const ROLE_CONFIG: Record<SignInRole, { label: string; path: string; active: string }> = {
  homeowner: { label: 'Homeowner', path: '/signin/homeowner', active: '#3C258E' },
  contractor: { label: 'Contractor', path: '/signin/contractor', active: '#1560A2' },
  agent: { label: 'Real Estate Agent', path: '/signin/agent', active: '#079669' },
};

const ROLE_ORDER: SignInRole[] = ['homeowner', 'contractor', 'agent'];

interface SignInRoleTabsProps {
  activeRole?: SignInRole;
  activeTab?: 'login' | 'register';
}

export function SignInRoleTabs({ activeRole, activeTab }: SignInRoleTabsProps) {
  const [, setLocation] = useLocation();

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }} data-testid="signin-role-tabs">
      {ROLE_ORDER.map((role) => {
        const cfg = ROLE_CONFIG[role];
        const isActive = role === activeRole;
        return (
          <button
            key={role}
            type="button"
            data-testid={`role-tab-${role}`}
            aria-pressed={isActive}
            onClick={() => {
              if (isActive) return;
              const qs = activeTab === 'register' ? '?tab=register' : '';
              setLocation(`${cfg.path}${qs}`);
            }}
            style={{
              flex: 1,
              padding: '9px 4px',
              borderRadius: 10,
              border: `1.5px solid ${isActive ? cfg.active : 'rgba(0,0,0,0.1)'}`,
              background: isActive ? cfg.active : '#fff',
              color: isActive ? '#fff' : '#8a8f99',
              fontSize: 11,
              fontWeight: 700,
              cursor: isActive ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
