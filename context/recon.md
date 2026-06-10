# LDQR recon manifest

> Updated 2026-06-10, after the nav/basket refactor (bottom nav removed, basket lifted to a root provider, floating Settings button added). Re-run P0 only if files or routes structurally change again.

## 1. Root container + navigator config

- `src/app/_layout.tsx` — root layout: `MerchantSetupProvider` → `BrandProvider` → `BasketProvider` → `ThemeProvider` → headerless `Stack` (`onboarding`, `(tabs)`, `qsr`) with the floating `SettingsButton` overlaid top-right.
- `src/app/(tabs)/_layout.tsx` — onboarding gate + headerless `Stack`. **No bottom tab bar** (the `NativeTabs` bar was removed; screens navigate programmatically).
- `src/app/qsr/_layout.tsx` — `QsrOrderProvider` + `Stack` (`index` → `menu` → `review` → `token`).
- Bottom-nav/sidebar components mounted at container level: **none**. `src/components/ldqr/persistent-footer.tsx` is a payment-rail footer that mounts only inside `CheckoutScreen` (screen-internal payment UI, not navigation).

## 2. Modules

- **U1 · Cashier-led** — entry `src/screens/CheckoutScreen.tsx`, route `/checkout` (`src/app/(tabs)/checkout.tsx`). Flow: basket → QR / Tap & Pay → UPI-Lite or palm/PIN gate → `/confirmation`. Renders `QrCard`, `TapAndPayZone`, `BasketPanel`, `EmiBanner`/`EmiTray`, `LoyaltyCard`, `PalmConfirm`, `PersistentFooter`.
- **U2 · Self-checkout** — entry `src/screens/CatalogScreen.tsx`, route `/catalog`. SKU CRUD (SQLite `SkuStore`) + add-to-basket; checkout happens via U1's screen.
- **U4 · QSR self-order** — entry `src/app/qsr/index.tsx`, routes `/qsr` → `/qsr/menu` → `/qsr/review` → `/qsr/token`. Order state in `src/context/qsr-order.tsx` (in-memory, separate from the retail basket by design).
- Mode select — `src/screens/HomeScreen.tsx`, route `/` (`src/app/(tabs)/index.tsx`): mode cards + "Resume your basket" card.

## 3. Basket / queue state

- `src/context/basket.tsx` — **single top-level owner** (`BasketProvider`, mounted in the root layout). Hydrates once from SQLite on mount; `addItem`/`clearBasket` write through to `src/services/basket-store.ts` (`basket_items` table via `src/services/db.ts`, db `ldqr.db`). Shape: `BasketItem` (`src/types/basket.ts`) — unchanged.
- "Resume basket": rows persist in SQLite, so the card on Home survives navigation, re-renders, and app restarts. Home/Catalog/Checkout read via `useBasket()`; nothing reads `BasketStore` directly except the provider.
- QSR queue: `src/context/qsr-order.tsx` — in-memory only, U4-internal.

## 4. Camera / scanner

- None. No camera or barcode library is installed. QR is render-only via `react-native-qrcode-svg` (`src/components/ldqr/qr-card.tsx`); "scan" is simulated.

## 5. Checkout / payment

- `src/screens/CheckoutScreen.tsx` — all rails simulated; `TransactionStore.logTransaction` writes to SQLite.
- UPI-Lite gating: `total < UPI_LITE_LIMIT` (₹500, `src/constants/design.ts`) skips the palm/PIN gate.
- Pay@Palm: `src/components/ldqr/palm-confirm.tsx` — **stubbed** (confirm overlay, no biometrics; UPI-PIN fallback offered).
- EMI / Credit Line on UPI: `src/components/ldqr/emi.tsx` — **stubbed** tray; threshold `EMI_THRESHOLD` = ₹3000.
- Tap & Pay: `src/components/ldqr/tap-and-pay-zone.tsx` — **stubbed** (timer-driven detect/read states).
- U4 payment: `src/app/qsr/review.tsx` — UPI-Lite-only framing (`isLite` under ₹500, else plain UPI), simulated `pay()` → token screen. Real rails: none anywhere.

## 6. Settings

- Screen: `src/screens/SettingsScreen.tsx`, route `/settings` (`src/app/(tabs)/settings.tsx`) — brand theming, compliance list, reset device setup.
- Entry point: `src/components/ldqr/settings-button.tsx` — floating button fixed top-right, mounted once in the root layout, present on every module screen; hidden on `/onboarding` and `/settings`.

## Refactor risk notes

- The basket is now owned by `BasketProvider`; any new basket mutation must go through `useBasket()` (or call `refresh()`), or context state will drift from SQLite.
- Back navigation relies on the root/group Stacks; with the tab bar gone, every new screen needs an explicit route into it (Home mode cards, CTAs, or the Settings button).
- `PersistentFooter` looks like navigation but is payment UI inside CheckoutScreen — do not "deduplicate" it into a navigator.
- U4's queue is intentionally separate from the retail basket; do not merge the two stores.
- `npx expo lint` has one pre-existing error in `src/hooks/use-color-scheme.web.ts` (Expo template); unrelated to app code.
