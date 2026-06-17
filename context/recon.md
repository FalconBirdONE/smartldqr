# LDQR recon manifest

> Updated 2026-06-10 (third pass), after the unified-checkout build: the P2 stub was replaced by the real payment-matrix screen (route path `/checkout-stub` kept so U1/U2/U4 callers were untouched). Re-run P0 only if files or routes structurally change again.

## 1. Root container + navigator config

- `src/app/_layout.tsx` — root layout: `MerchantSetupProvider` → `BrandProvider` → `BasketProvider` → `ThemeProvider` → headerless `Stack` (`onboarding`, `(tabs)`, `qsr`) with the floating `SettingsButton` overlaid top-right.
- `src/app/(tabs)/_layout.tsx` — onboarding gate + headerless `Stack`. **No bottom tab bar**; navigation is programmatic.
- `src/app/qsr/_layout.tsx` — `QsrOrderProvider` + `Stack` (`index` → `menu` → `review` → `token`).
- Bottom-nav/sidebar components mounted at container level: **none**. `src/components/ldqr/persistent-footer.tsx` mounts only inside the parked `CheckoutScreen` (payment UI, not navigation).

## 2. Modules

- **U1 · Cashier-led** — Home card routes to `/capture` (shared `CaptureCheckout`). The old straight-to-payment entry (`/checkout`) is fixed: nothing routes to `/checkout` anymore.
- **U2 · Self-checkout** — Home card routes to `/capture` as well. Catalog CRUD (`/catalog`, `src/screens/CatalogScreen.tsx`) is now an admin surface only, reachable via the "Manage catalog" link on Home.
- **U4 · QSR self-order** — `/qsr` → `/qsr/menu` → `/qsr/review`; review's CTA now serializes the order (+ packing/tip lines) and routes to `/checkout-stub` (no UPI-Lite-only gating, no transaction logging there). `qsr/token.tsx` is currently unreferenced — payment matrix will re-wire completion.
- Mode select — `src/screens/HomeScreen.tsx` (`/`): mode cards, "Resume your basket" → `/capture`, "Manage catalog" link.

## 3. Capture / scanner (shared)

- `src/components/ldqr/capture-checkout.tsx` — the one shared capture surface (no per-module copies). Tablet quadrants: camera + HUD left; live basket right with inline qty steppers + delete; "Cancel checkout" top-right (beside the global Settings gear); "Confirm checkout" bottom-right → `/checkout-stub` with `{ source, total, basket }` params. Phone stacks the panes.
- `src/hooks/use-barcode-scanner.ts` — scanner pipeline: requests permission on mount, continuous decode via `expo-camera` `CameraView` `onBarcodeScanned`, duplicate-read debounce (2s cooldown), auto-reset after each scan.
- Scan resolution: code → `SkuStore.getSkuById`, fallback exact name match → `useBasket().addItem` (direct append, no staging).
- Camera lib: **expo-camera** (SDK 56, Expo Go compatible). No vision-camera. App.json has no camera plugin entry yet — fine for Expo Go; a dev build will want the plugin/permission strings.

## 4. Basket / queue state

- `src/context/basket.tsx` — single top-level owner. Hydrates from SQLite; `addItem` / `updateQuantity` (0 ⇒ remove) / `removeItem` / `clearBasket` write through to `src/services/basket-store.ts` (`basket_items` in `ldqr.db` via `db.ts`). Shape `BasketItem` unchanged.
- QSR queue: `src/context/qsr-order.tsx` — in-memory, U4-internal; serialized to `CheckoutLine[]` only at the stub handoff.
- `src/types/checkout.ts` — `CheckoutLine`, the module-agnostic line shape passed to the stub.

## 5. Checkout / payment

- `src/screens/UnifiedCheckoutScreen.tsx` (route `src/app/(tabs)/checkout-stub.tsx`, path `/checkout-stub`) — **the real unified checkout**: order summary from the passed `CheckoutLine[]` + full ungated payment matrix (UPI Lite, Cards, NetBanking, Wallets, Pay@Palm, EMI). Every method funnels into one `completePayment` (simulated 900ms rail → `TransactionStore.logTransaction` → clears the retail basket when `source==='retail'` → `/confirmation`); all failures are caught into an error banner, UI stays alive.
- `src/services/palm-auth.ts` — SIMULATED Pay@Palm SDK surface: `authorizePalm()` resolves `{status:'authorised', authToken}` or throws coded `PalmAuthError` (~18% simulated misreads). A real palm dev kit replaces only this module's body. UI capture overlay reuses `palm-confirm.tsx`; skip = UPI-PIN fallback.
- `src/services/emi.ts` — guarded EMI engine: `EMI_LENDERS` interest tables (APR per tenure), `buildEmiMatrix` term matrix (3/6/9/12 mo; reducing-balance formula, null on unquotable inputs — never NaN), `buildLenderPayload` mock (`mock: true`, schedule + KFS ref) until a provider is wired.
- `src/screens/CheckoutScreen.tsx` (`/checkout`) — the OLD simulated payment screen (QR, Tap & Pay, PersistentFooter, `emi.tsx` tray). Still parked and unrouted; superseded by the unified checkout. Candidate for deletion once the QR/Tap rails are ported.
- U4 completion: the unified checkout cannot clear the QSR order (its provider is scoped to `/qsr`); `/qsr/token` remains unreferenced.

## 6. Settings

- Screen: `src/screens/SettingsScreen.tsx` (`/settings`). Entry: `src/components/ldqr/settings-button.tsx` — floating, top-right, every module screen (hidden on `/onboarding` and `/settings`).

## Refactor risk notes

- All basket mutations must go through `useBasket()`; direct `BasketStore` writes will drift from context state.
- `/checkout` (old payment screen) and `/qsr/token` are intentionally orphaned routes pending the payment matrix — don't delete without checking that phase's plan.
- New routes `/capture` and `/checkout-stub` are cast `as Href` until Expo regenerates the typed-routes manifest (next `expo start`).
- The stub trusts its `basket` param; the payment matrix should re-validate totals server-side/store-side before charging.
- `npx expo lint` has one pre-existing error in `src/hooks/use-color-scheme.web.ts` (Expo template); unrelated.
