/**
 * Smart LDQR Gen 2 — design system tokens.
 *
 * Ground-truth palette/typography for the merchant payment DEVICE (landscape
 * 10" kiosk). This is intentionally separate from the Expo-template `theme.ts`
 * (which stays untouched). Screens read everything visual from here.
 *
 * Two layers of colour:
 *   • Per-merchant BRAND CANVAS (see `brands.ts`) — one dominant brand colour.
 *   • FUNCTIONAL palette below — layered on top, consistent across every
 *     merchant so the payment rails read the same everywhere:
 *       amber  = primary interactive + Tap & Pay
 *       teal   = UPI Lite zone + default Tap & Pay tab
 *       green  = success
 *       indigo = EMI / Credit Line on UPI
 *       pink   = loyalty / tap-to-join
 */

/** Functional rail colours — never re-skinned per merchant. */
export const Palette = {
  // Surfaces
  canvas: '#F4F5FB', // light neutral split-panel background
  card: '#FFFFFF',
  cardMuted: '#F8FAFC',
  border: '#E6E8F0',
  borderStrong: '#D5D9E6',
  scrim: 'rgba(15, 23, 42, 0.55)', // backdrop dim for trays/sheets

  // Text
  ink: '#0F172A',
  inkSecondary: '#475569',
  inkMuted: '#94A3B8',
  onColor: '#FFFFFF',

  // Amber — primary interactive + Tap & Pay
  amber: '#F59E0B',
  amberStrong: '#D97706', // solid-on-detect
  amberSoft: '#FEF3C7',
  amberInk: '#92400E',

  // Teal — UPI Lite + default Tap & Pay tab
  teal: '#0D9488',
  tealStrong: '#0F766E',
  tealSoft: '#CCFBF1',
  tealInk: '#115E59',

  // Green — success
  green: '#16A34A',
  greenStrong: '#15803D',
  greenSoft: '#DCFCE7',
  greenDeep: '#064E3B', // palm full-screen background

  // Indigo / violet — EMI / Credit Line on UPI
  indigo: '#4F46E5',
  indigoStrong: '#4338CA',
  indigoSoft: '#E0E7FF',
  indigoInk: '#3730A3',

  // Pink — loyalty / tap-to-join
  pink: '#DB2777',
  pinkStrong: '#BE185D',
  pinkSoft: '#FCE7F3',
  pinkInk: '#9D174D',

  // Status
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
} as const;

/** Corner radii — kiosk UI runs soft, generous corners. */
export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** 4pt spacing scale. */
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

/** Horizontal gutter for split-panel screens on the 10" tablet. */
export const SCREEN_GUTTER = 28;

/** Type scale. Sans-serif throughout; the amount/token are the big elements. */
export const Type = {
  token: 132, // QSR order token — the single largest element on its screen
  amountHero: 64, // "Pay this total ₹X,XXX"
  amount: 44,
  display: 34,
  title: 26,
  heading: 20,
  body: 16,
  bodySmall: 14,
  caption: 13,
  micro: 11,
} as const;

/** Spaced, small-caps section eyebrow ("PICK OF THE WEEK"). */
export const eyebrowStyle = {
  fontSize: Type.micro,
  fontWeight: '700' as const,
  letterSpacing: 1.6,
  textTransform: 'uppercase' as const,
  color: Palette.inkMuted,
};

/** Soft elevation for white cards on the neutral canvas. */
export const cardShadow = {
  shadowColor: '#1E293B',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

/** Stronger lift for raised trays / floating sheets. */
export const trayShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.2,
  shadowRadius: 28,
  shadowOffset: { width: 0, height: -6 },
  elevation: 16,
} as const;

/** EMI eligibility threshold (₹). Banner appears once the basket crosses it. */
export const EMI_THRESHOLD = 3000;

/** UPI Lite ceiling (₹) — no PIN for orders under this. */
export const UPI_LITE_LIMIT = 500;
