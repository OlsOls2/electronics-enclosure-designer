# Electronics Enclosure Designer

Browser-based MVP for creating simple custom electronics enclosures and exporting them as printable STL files.

Repository: <https://github.com/Mizzen-Studios/electronics-enclosure-designer>

## Product Summary

This project targets makers and hardware teams that need a fast enclosure prototype without opening full CAD tooling.

Current focus is **speed to first printable model**:
- configure dimensions and enclosure type
- add/edit circular face holes
- preview in real time in 3D
- export STL in one click

## MVP Capabilities (Current)

- React + Three.js live parametric preview
- 3D scene aids for easier spatial editing:
  - floor grid + dimension rulers positioned below the enclosure
  - orientation gizmo (top-right) for quick top/side/corner camera alignment
- Adjustable enclosure dimensions:
  - width / height / depth / wall thickness
  - enclosure type: `plain`, `lid`, `flanged`
- Circular hole tool with face selection and x/y offsets
- STL export via `Download STL`
- Optional Firebase Auth + Firestore cloud model save/load with defensive model sanitization on read/write
- Checkout modal with quantity + currency selector (`GBP`, `USD`, `EUR`)
- Premium option toggles with paid-account gating

## Guest vs Account Behavior

- **Guest mode (default):** fully usable for designing and exporting STL locally. No sign-in required.
- **Signed-in mode (Google):** enables cloud save/load/delete at `users/{uid}/models/{modelId}` in Firestore.
- **Paid account handling:** premium enclosure options are only editable/usable for paid users.
  - Paid status is resolved from Firebase custom claims (`paid` / `isPaid` / `premium`, or `plan` / `tier` values such as `paid`, `premium`, `pro`) and optional Firestore account profile at `users/{uid}/account/profile`.
  - Client sanitization strips premium toggles when paid access is not present.
  - Checkout callable also enforces paid access for premium-enabled designs.
- If Firebase env vars are missing, app remains usable in guest mode and cloud/auth UI is disabled gracefully.

## Premium + Manufacturing Roadmap Context

The current UI includes first-pass monetization plumbing:
- Premium enclosure options (e.g., fastening kits, waterproofing packages) with paid-account gating
- Manufacturing/print checkout flow via Stripe callable function

This is still an MVP implementation (no full subscription lifecycle yet), but the core account + checkout contracts are now wired end to end.

## Related Workstream: Marketing Intelligence Inbox

Roadmap includes a separate **Marketing Intelligence Inbox** initiative (Issue #1):
- ingest vendor/chip newsletters through a dedicated inbox
- parse/tag releases into structured digests
- support product and go-to-market planning with better component intel

This is adjacent to the enclosure app and tracked as a strategic follow-on work item.

## Local Development

```bash
npm install
npm run dev
```

Open the Vite URL (`http://localhost:5177`).

## Environment Variables

Copy `.env.example` to `.env` and fill values to enable Firebase features:

```bash
cp .env.example .env
```

Required for Firebase mode:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Optional Firebase vars:
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

## Firebase Setup

1. Create a Firebase project.
2. Add a Web app in Firebase console.
3. Enable **Authentication** → Google provider.
4. Enable **Firestore Database**.
5. Add `localhost` to Auth authorized domains if needed.
6. Paste config values into `.env`.

## Checkout Function Configuration

In `functions/`, configure these server-side environment values before deploying checkout:

- `STRIPE_SECRET_KEY` (required)
- `CHECKOUT_DEFAULT_ORIGIN` (optional, default `http://localhost:5177`)
- `CHECKOUT_ALLOWED_ORIGINS` (optional comma-separated allowlist, e.g. `https://app.example.com,https://staging.example.com`)

The callable enforces this origin allowlist and rejects premium checkouts unless the caller has paid-account claims.

## Scripts

- `npm run dev` — start development server
- `npm run build` — type-check and production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint
- `npm test` — run unit tests (Vitest)

## Architecture Snapshot

- `src/types/enclosure.ts` — domain model (`EnclosureConfig`, holes, premium/services state)
- `src/utils/enclosureGeometry.ts` + `src/utils/enclosureBounds.ts` — shell/hole CSG generation and reusable face bounds
- `src/components/DesignerCanvas.tsx` + `src/components/scene/*` — 3D rendering, orientation gizmo, grid/ruler helpers
- `src/components/ControlPanel.tsx` — model editing controls and premium gating UI
- `src/components/CloudPanel.tsx` — auth and cloud model UI
- `src/components/BuyModal.tsx` + `src/utils/pricing.ts` — checkout UX, currency handling, and pricing logic
- `src/hooks/useAccountTier.ts` + `src/services/accountService.ts` — paid account resolution logic
- `src/hooks/useCloudModels.ts` — cloud save/load orchestration and resilient UI state handling
- `src/services/firebase.ts` + `src/services/modelStore.ts` + `src/services/modelDocument.ts` — Firebase bootstrapping, persistence, and defensive model document normalization
- `functions/src/index.ts` + `functions/src/pricing.ts` — callable Stripe checkout + server-side pricing/security checks
- `src/utils/exportStl.ts` — STL export
