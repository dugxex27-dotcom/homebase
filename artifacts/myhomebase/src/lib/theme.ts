export const theme = {

  font: {
    family: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    weight: { medium: 500, semibold: 600, bold: 700 },
    size: {
      micro: '9px',
      label: '10px',
      small: '11px',
      body: '12px',
      bodyStrong: '13px',
      cardTitle: '16px',
      sectionHeading: '20px',
      pageTitle: '24px',
    },
  },

  radius: {
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '14px',
    xxl: '16px',
    pill: '20px',
    circle: '50%',
  },

  homeowner: {
    primary: '#2C0F5B',
    accent: '#3C258E',
    accentLight: '#B6A6F4',
    fill: '#EEEDFE',
    background: '#f0eef8',
    muted: '#B6A6F4',
    border: 'rgba(60,37,142,0.1)',
    borderHover: 'rgba(60,37,142,0.35)',
    borderActive: '#3C258E',
    modalBackdrop: 'rgba(44,15,91,0.6)',
  },

  contractor: {
    primary: '#1560A2',
    accent: '#1560A2',
    accentLight: '#3798EF',
    fill: '#EAF4FD',
    background: '#F0F7FE',
    muted: '#518EBC',
    border: 'rgba(21,96,162,0.1)',
    borderHover: 'rgba(21,96,162,0.35)',
    borderActive: '#1560A2',
    modalBackdrop: 'rgba(21,96,162,0.6)',
  },

  agent: {
    primary: '#09694A',
    accent: '#079669',
    accentLight: '#D4EBDE',
    fill: '#E8F5EE',
    background: '#F0F8F3',
    muted: '#079669',
    border: 'rgba(7,150,105,0.1)',
    borderHover: 'rgba(7,150,105,0.35)',
    borderActive: '#079669',
    modalBackdrop: 'rgba(9,105,74,0.6)',
  },

  status: {
    good:    { bg: '#EAF3DE', text: '#3B6D11', dot: '#4a9e2f' },
    aging:   { bg: '#FAEEDA', text: '#854F0B', dot: '#e8a020' },
    replace: { bg: '#FCEBEB', text: '#A32D2D', dot: '#e03e3e' },
    unknown: { bg: '#EEEDFE', text: '#3C258E', dot: '#c4c1e0' },
  },

  global: {
    white: '#ffffff',
    surface: '#f5f4f2',
    textPrimary: '#0f0e0d',
    textMuted: '#888780',
    border: 'rgba(0,0,0,0.07)',
    modalBackdrop: {
      homeowner: 'rgba(45,31,110,0.6)',
      contractor: 'rgba(4,44,83,0.6)',
      agent: 'rgba(23,52,4,0.6)',
    },
  },
} as const;

export type ThemeRole = 'homeowner' | 'contractor' | 'agent';

export function getTheme(role: ThemeRole) {
  return theme[role];
}
