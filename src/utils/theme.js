/**
 * Design tokens — light mode only (dark mode removed).
 *
 * Color naming convention:
 *   bg  = background surfaces (bg < bg2 < bg3 < bg4, lightest to slightly darker)
 *   t1  = primary text  |  t2 = secondary  |  t3 = tertiary  |  t4 = disabled/hint
 *   mint / red / blue / yellow = semantic accent colors
 */

export const lightColors = {
  bg:     '#F7F8FA',   // page background
  bg2:    '#FFFFFF',   // card surface
  bg3:    '#F0F2F5',   // input / chip background
  bg4:    '#E4E7ED',   // progress track / divider

  t1:     '#0D1117',   // primary text — very dark for contrast
  t2:     '#3D4350',   // secondary text
  t3:     '#7B8394',   // tertiary / labels
  t4:     '#B0B8C4',   // disabled / hints

  mint:   '#00A651',   // income / positive (darker green → WCAG AA)
  red:    '#D92D2D',   // expense / negative
  blue:   '#1A6FD4',   // interactive / info
  yellow: '#B45309',   // warning (dark amber for contrast on white)

  border: 'rgba(0,0,0,0.08)',
};

// Kept for API compatibility (never used in light-only mode)
export const darkColors = lightColors;

export const lightChartColors = [
  '#1A6FD4', // blue
  '#00A651', // green
  '#D97706', // amber
  '#7C3AED', // violet
  '#D92D2D', // red
  '#0891B2', // cyan
  '#BE185D', // pink
  '#047857', // emerald
  '#92400E', // brown
  '#6B7280', // gray
];

// Kept for API compatibility
export const darkChartColors = lightChartColors;
