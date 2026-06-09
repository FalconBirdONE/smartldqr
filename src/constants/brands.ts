/**
 * Brand canvases for Smart LDQR Gen 2.
 *
 * Each merchant scenario carries one dominant brand colour applied to the
 * full-bleed canvas surfaces (IDLE, QSR welcome/confirmation). The functional
 * rail palette (`design.ts`) is layered on top and never re-skinned.
 *
 * The active device runs the HOUSE brand by default; the reference scenarios
 * (Decathlon / Zara / Chai Point) are kept so the same system can be themed
 * per merchant without code changes.
 */

export type Brand = {
  id: string;
  /** Display name shown on idle / welcome surfaces. */
  name: string;
  /** Short label under the wordmark, e.g. "Smart LDQR · Gen 2". */
  tagline: string;
  /** VPA shown on the QR card, e.g. "smartldqr.bgr1@hdfc". */
  vpa: string;
  /** Dominant brand colour for the canvas. */
  brand: string;
  /** Deeper shade for the canvas gradient bottom / pressed states. */
  brandDeep: string;
  /** A second accent for the canvas gradient (kept subtle). */
  brandAccent: string;
  /** Text/icon colour that reads on the brand canvas. */
  onBrand: string;
  /** Muted text colour on the brand canvas. */
  onBrandMuted: string;
  /** Per-merchant loyalty programme label (footer relabels to this). */
  loyaltyLabel: string;
  /** Warm one-line greeting for idle / welcome (the brand voice). */
  greeting: string;
};

/** Smart LDQR house canvas — NPCI R&D reference device (indigo/teal). */
export const HOUSE_BRAND: Brand = {
  id: 'house',
  name: 'Smart LDQR',
  tagline: 'Gen 2 · NPCI R&D',
  vpa: 'smartldqr.bgr1@hdfc',
  brand: '#4338CA', // indigo
  brandDeep: '#312E81',
  brandAccent: '#0D9488', // teal accent
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255,255,255,0.72)',
  loyaltyLabel: 'Rewards',
  greeting: 'Welcome — pay in a tap.',
};

/** Reference scenarios — same system, themed per merchant. */
export const REFERENCE_BRANDS: Record<string, Brand> = {
  decathlon: {
    id: 'decathlon',
    name: 'Decathlon',
    tagline: 'Sports · Self-checkout',
    vpa: 'decathlon.bgr1@hdfc',
    brand: '#0A2C6B',
    brandDeep: '#06205A',
    brandAccent: '#1763E5',
    onBrand: '#FFFFFF',
    onBrandMuted: 'rgba(255,255,255,0.70)',
    loyaltyLabel: 'Decathlon Club',
    greeting: 'Stay dry, stay moving.',
  },
  chaipoint: {
    id: 'chaipoint',
    name: 'Chai Point',
    tagline: 'QSR · Self-order',
    vpa: 'chaipoint.bgr1@hdfc',
    brand: '#6B1F2A',
    brandDeep: '#4A1018',
    brandAccent: '#F59E0B',
    onBrand: '#FFFFFF',
    onBrandMuted: 'rgba(255,255,255,0.74)',
    loyaltyLabel: 'Chai Club',
    greeting: 'Hi! Hungry?',
  },
};
