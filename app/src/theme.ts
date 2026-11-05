// ─────────────── MAIN THEME ───────────────
// orange background, the fonts, the gradient direction.

export const colors = {
  gradientLight: '#FFE1CA',
  gradientMain: '#FFB67E',
  text: '#1A1A1A',
};

//linear gradient direction
export const gradientStops = [0.32, 0.61] as const;

export const gradientDirection = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

// exact names from useFonts in App.tsx
export const fonts = {
  logo: 'DynaPuff_400Regular',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
  heading: 'Baloo2_600SemiBold',
  headingBold: 'Baloo2_700Bold',
};

// ─────────────── GENERAL THEME ───────────────
// shadows and the user-selectable backgrounds.

export const shadows = {
  raised: {
    boxShadow: '0px 4px 4px rgba(0,0,0,0.25), inset 0px 4px 4px rgba(0,0,0,0.25)',
  },
  inset: {
    boxShadow: 'inset 0px 4px 4px rgba(0,0,0,0.25)',
  },
};

// the 12 background colours users can pick for their modes
export const backgroundColors = [
  '#A59BE7', '#6677B2', '#D982A5', '#9FC5B0',
  '#000000', '#E8B94F', '#E9933A', '#B7A18A',
  '#D39984', '#55415F', '#E84F4F', '#499496',
];