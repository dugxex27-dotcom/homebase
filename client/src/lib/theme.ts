export const theme = {

  font: {
    family: "'Quicksand', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
    primary: '#2d1f6e',
    accent: '#534AB7',
    accentLight: '#7F77DD',
    fill: '#EEEDFE',
    background: '#f0eef8',
    muted: '#9b97c4',
    border: 'rgba(83,74,183,0.1)',
    borderHover: 'rgba(83,74,183,0.35)',
    borderActive: '#534AB7',
    modalBackdrop: 'rgba(45,31,110,0.6)',
  },

  contractor: {
    primary: '#042C53',
    accent: '#185FA5',
    accentLight: '#378ADD',
    fill: '#E6F1FB',
    background: '#eef4fc',
    muted: '#7badd4',
    border: 'rgba(24,95,165,0.1)',
    borderHover: 'rgba(24,95,165,0.35)',
    borderActive: '#185FA5',
    modalBackdrop: 'rgba(4,44,83,0.6)',
  },

  agent: {
    primary: '#173404',
    accent: '#3B6D11',
    accentLight: '#639922',
    fill: '#EAF3DE',
    background: '#f0f7e8',
    muted: '#7aaa4a',
    border: 'rgba(59,109,17,0.1)',
    borderHover: 'rgba(59,109,17,0.35)',
    borderActive: '#3B6D11',
    modalBackdrop: 'rgba(23,52,4,0.6)',
  },

  status: {
    good:    { bg: '#EAF3DE', text: '#3B6D11', dot: '#4a9e2f' },
    aging:   { bg: '#FAEEDA', text: '#854F0B', dot: '#e8a020' },
    replace: { bg: '#FCEBEB', text: '#A32D2D', dot: '#e03e3e' },
    unknown: { bg: '#EEEDFE', text: '#534AB7', dot: '#c4c1e0' },
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
