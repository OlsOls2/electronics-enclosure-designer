# Electronics Enclosure Designer

MVP web app for designing a custom electronics enclosure and exporting a 3D-printable model.

## Stack

- React + TypeScript (Vite)
- 3D: `three`, `@react-three/fiber`, `@react-three/drei`, `three-csg-ts`
- Export: `STLExporter` from Three.js examples
- Firebase Auth + Firestore for optional cloud save/load

## MVP Features Implemented

- Live 3D viewport with orbit controls and real-time geometry updates
- Enclosure controls:
  - Width / Height / Depth / Wall Thickness
  - Enclosure type (`plain`, `lid`, `flanged`)
- Basic face-hole tool:
  - Select surface (`front`, `back`, `left`, `right`, `top`, `bottom`)
  - Set hole radius and x/y offsets
  - Add/remove circular holes
- One-click STL download (`Download STL`)
- No-login usage by default
- Optional sign-in with Google (Firebase Auth) enabling cloud save/load of models in Firestore
- Product placeholder UI + data model fields for:
  - premium enclosure options (advanced fastening, waterproof seal)
  - paid services (printing/manufacturing + delivery)

## Why STL

STL was selected as the primary export format because it is broadly supported by slicers (PrusaSlicer, Cura, Bambu Studio), CAD tools, and manufacturing pipelines.

## Local Development

```bash
npm install
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Environment Variables

Copy `.env.example` to `.env` and fill values to enable Firebase features.

```bash
cp .env.example .env
```

If these values are omitted, the app still works in guest mode but cloud save/load and sign-in are disabled.

Required for Firebase mode:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Also supported:

- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

## Firebase Setup

1. Create a Firebase project.
2. Add a Web app in Firebase console.
3. Enable **Authentication** → Google provider.
4. Enable **Firestore Database** (start in test mode for prototyping, then lock down rules).
5. Add your local dev domain to Auth authorized domains if needed (`localhost`).
6. Paste config values into `.env`.

Firestore path used:

- `users/{uid}/models/{modelId}`

Each model document stores:

- `config` (full enclosure model config)
- `updatedAt` (client timestamp in ms)

## Scripts

- `npm run dev` — start development server
- `npm run build` — type-check and production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## Architecture Notes

- `src/types/enclosure.ts` — core domain types
- `src/utils/enclosureGeometry.ts` — shell + hole CSG geometry generation
- `src/components/DesignerCanvas.tsx` — 3D viewport
- `src/components/ControlPanel.tsx` — dimensions/type/hole controls
- `src/components/CloudPanel.tsx` — auth + cloud storage UI
- `src/services/firebase.ts` + `src/services/modelStore.ts` — Firebase wiring

## Roadmap (Post-MVP)

- Better editing UX (click-to-place holes directly on face)
- Additional cutouts (slots, rectangles), standoffs, bosses
- Split-body export (base + lid as separate solids)
- Parametric templates for popular dev boards (ESP32, Raspberry Pi Pico, etc.)
- Paid flow placeholders into real checkout + quote workflow
- Rule-based design validation (minimum wall thickness, printability checks)
- Undo/redo and model version history
