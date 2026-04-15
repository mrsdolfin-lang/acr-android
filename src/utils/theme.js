// src/utils/theme.js
export const lightColors = {
  bg:      '#ffffff',
  bg2:     '#f5f5f5',
  bg3:     '#eeeeee',
  bg4:     '#e0e0e0',
  bg5:     '#d0d0d0',
  border:  'rgba(0,0,0,0.08)',
  border2: 'rgba(0,0,0,0.12)',
  t1:      '#0d0d0d',
  t2:      '#444444',
  t3:      '#777777',
  t4:      '#aaaaaa',
  mint:    '#00b85c',
  mint2:   '#009e4f',
  mintBg:  'rgba(0,184,92,0.08)',
  mintBdr: 'rgba(0,184,92,0.25)',
  red:     '#e53935',
  redBg:   'rgba(229,57,53,0.08)',
  redBdr:  'rgba(229,57,53,0.25)',
  blue:    '#1976d2',
  blueBg:  'rgba(25,118,210,0.08)',
  yellow:  '#f57c00',
  yellowBg:'rgba(245,124,0,0.08)',
  purple:  '#7b1fa2',
};

export const darkColors = {
  bg:      '#0d0d0d',
  bg2:     '#161616',
  bg3:     '#1e1e1e',
  bg4:     '#262626',
  bg5:     '#2e2e2e',
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.12)',
  t1:      '#f0f0f0',
  t2:      '#888888',
  t3:      '#555555',
  t4:      '#333333',
  mint:    '#5effa0',
  mint2:   '#3de085',
  mintBg:  'rgba(94,255,160,0.08)',
  mintBdr: 'rgba(94,255,160,0.20)',
  red:     '#ff5c5c',
  redBg:   'rgba(255,92,92,0.08)',
  redBdr:  'rgba(255,92,92,0.20)',
  blue:    '#5c9eff',
  blueBg:  'rgba(92,158,255,0.08)',
  yellow:  '#ffd166',
  yellowBg:'rgba(255,209,102,0.08)',
  purple:  '#c084fc',
};

// Default export (will be overridden by ThemeContext)
export const theme = { colors: darkColors };

export const chartColors = [
  '#5effa0','#60a5fa','#ffd166','#c084fc','#ff5c5c',
  '#34d399','#fb923c','#facc15','#38bdf8','#94a3b8',
];

export const chartColorsDark = [
  '#5effa0','#60a5fa','#ffd166','#c084fc','#ff5c5c',
  '#34d399','#fb923c','#facc15','#38bdf8','#94a3b8',
];

export const chartColorsLight = [
  '#00b85c','#1976d2','#f57c00','#7b1fa2','#e53935',
  '#00897b','#e65100','#f9a825','#0288d1','#546e7a',
];
