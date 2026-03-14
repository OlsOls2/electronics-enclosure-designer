# AGENTS.md

Contributor and coding-agent guide for `Mizzen-Studios/electronics-enclosure-designer`.

## Project Purpose & Scope

Electronics Enclosure Designer is a browser-based MVP that lets users generate simple parametric electronics enclosures and export printable STL files quickly.

### In scope (current)
- Parametric enclosure dimensions and type selection
- Circular face-hole placement by offsets
- Live 3D preview
- STL export
- Optional Google sign-in + Firestore cloud save/load/delete

### Out of scope (for now)
- Complex CAD constraints and assembly workflows
- Rich board/template library
- Production checkout/payment pipeline

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **3D:** `three`, `@react-three/fiber`, `@react-three/drei`, `three-csg-ts`
- **Data/Auth (optional):** Firebase Auth + Firestore
- **Linting/quality:** ESLint 9, TypeScript strict mode

## Key Architecture Files

- `src/App.tsx` — top-level app state orchestration
- `src/app/defaultModel.ts` — starter model defaults
- `src/types/enclosure.ts` — core domain types
- `src/utils/enclosureGeometry.ts` — enclosure + hole geometry generation
- `src/components/ControlPanel.tsx` — input/edit UI
- `src/components/DesignerCanvas.tsx` / `src/components/EnclosureMesh.tsx` — 3D rendering
- `src/components/CloudPanel.tsx` — auth/cloud save UI
- `src/services/firebase.ts` — Firebase config gating + initialization
- `src/services/modelStore.ts` — Firestore model CRUD
- `src/utils/exportStl.ts` — STL export
- `PRODUCT_SPEC.md` — MVP product intent and roadmap context

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
npm test
```

Use `npm run build` + `npm test` as the minimum validation before merging changes.

## Firebase / Environment Expectations

Copy `.env.example` to `.env` when testing auth/cloud features.

Required for Firebase-enabled mode:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Optional:
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

Behavior contract:
- Missing required vars must not break the app.
- App should remain functional in guest mode (local design + STL export).
- Cloud operations must fail with clear messages when Firebase is not configured.

## Coding Conventions

- TypeScript-first, keep strict typing intact.
- Reuse existing domain types from `src/types/enclosure.ts`; avoid ad-hoc shape duplication.
- Keep UI state updates immutable and React-hook friendly (`useCallback`, `useMemo` where useful).
- Preserve existing style:
  - ESM imports
  - single quotes
  - semicolon-free formatting
  - trailing commas in multiline literals/calls
- Keep components focused (UI in `components/`, domain logic in `utils/` or `services/`).
- Do not introduce Firebase hard dependency in guest-only flows.

## Near-Term Priorities / Known Roadmap

1. Improve hole-edit UX (direct placement/manipulation in viewport).
2. Add more cutout/support primitives (slots, rectangles, bosses, standoffs).
3. Split-body export workflows (base/lid as separate solids).
4. Strengthen validation (printability + min wall checks).
5. Expand save/version ergonomics (history, undo/redo).
6. Evolve premium and manufacturing placeholders into a real quote/checkout flow.
7. Track **Marketing Intelligence Inbox** initiative (Issue #1) as a strategic adjacent workstream.

## Repo Reference

Canonical repo: <https://github.com/Mizzen-Studios/electronics-enclosure-designer>

## Dev port registry (required)

- Canonical registry: `/home/ubuntu/.openclaw/workspace/config/dev-ports.json`
- Assigned web dev port for this project: `5177`
- Do not change the port here without updating the registry first.
