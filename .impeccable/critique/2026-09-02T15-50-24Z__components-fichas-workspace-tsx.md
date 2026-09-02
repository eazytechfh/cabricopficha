---
target: components/fichas-workspace.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:C:\\Users\\Desktop\\Desktop\\DIRETORIOS DO GIT HUB\\PROJETOS\\CABRICOP\\cabricopficha\\components\\fichas-workspace.tsx"
target_fingerprint: "sha256:5a611f79d7af1340c91bd56fa9b3ddba3569e6a753ce145e744a5915c9d29a06"
target_path: "C:\\Users\\Desktop\\Desktop\\DIRETORIOS DO GIT HUB\\PROJETOS\\CABRICOP\\cabricopficha\\components\\fichas-workspace.tsx"
timestamp: 2026-09-02T15-50-24Z
slug: components-fichas-workspace-tsx
closed: true
---
Method: dual-agent (A: design-review sub-agent · B: detector/evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/saving states threaded through most actions ("Salvando...", "Removendo..."), but no global "unsaved changes" indicator |
| 2 | Match System / Real World | 3 | Domain vocabulary (procuração, andamento, consultor) fits the audience well |
| 3 | User Control and Freedom | 2 | Delete/merge rely on native `window.confirm`, no undo for destructive actions |
| 4 | Consistency and Standards | 2 | Settings panel is a hand-rolled `fixed inset-0` modal instead of the shared shadcn `Dialog` already used for merge |
| 5 | Error Prevention | 2 | Duplicate-ficha check before create is good; delete/merge guardrails are just a browser confirm |
| 6 | Recognition Rather Than Recall | 3 | Fields pre-fill from prior fichas and consultant defaults |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts, no bulk actions beyond merge — real gap for daily power users |
| 8 | Aesthetic and Minimalist Design | 2 | User-edit grid and template toolbar pack many controls into one dense row with no grouping |
| 9 | Error Recovery | 3 | Inline errors, some `role="alert"`, backend messages surfaced directly |
| 10 | Help and Documentation | 1 | No tooltips beyond icon `title`; no guidance on the high-stakes merge operation |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Reads mostly as generic shadcn CRUD scaffolding with real domain touches layered on top — ficha numbering, CPF/CNPJ-aware duplicate detection, the "Andamento" access level, procuração/contract vocabulary, merge-field variables like `{{processosResumo}}`. But the interface is dominated by admin-panel furniture (user settings, document templates) that could belong to any product, a plaintext password reveal feature that actively works against a "trusted office" identity, and a native `window.confirm()` guarding the app's most destructive action. Navy/gold tokens exist but are applied structurally (headers, buttons), not semantically — color doesn't yet carry status or risk meaning.

**Deterministic scan**: `detect.mjs` ran successfully against the three core files (it does read TSX, contrary to the initial assumption) — 12 findings, all warnings:
- `side-tab` (unstyled `border-l-4` accent, not a DESIGN.md token) — 2 hits in `fichas-workspace.tsx` (1625, 2269), several more in `ficha-form.tsx`.
- `design-system-font` — `fontFamily: Arial` hardcoded at `fichas-workspace.tsx:2944`, outside DESIGN.md's Geist-only rule.
- `gray-on-color` — gray text over amber background, 3 hits in `ficha-form.tsx` (830, 837×2) — a contrast/consistency smell DESIGN.md's neutral system doesn't sanction.
`globals.css` scanned clean (0 findings). Manual grep (accessibility/mechanical smells the detector doesn't cover) found: 5 hardcoded hex colors bypassing the token system (`ficha-read-view.tsx:164`, `fichas-workspace.tsx:193,364,365,824`), 4 inline `style={{...}}` blocks, 1 `window.confirm` at the exact delete line the design review flagged independently, and password `<input type="text">` (not `type="password"`) at lines 1986 and 2115 — confirming the design review's plaintext-password finding from the markup level, not just the state-handling level. No `console.log`, no missing `alt`, no unlabeled icon buttons, no TODO/FIXME.

Where the two agree, it's a strong signal: **both independently flagged the `window.confirm` delete at line 1333** and, from two different angles (state logic vs. markup), converged on the **plaintext password handling**.

**Visual overlays**: Not available. No dev server was running and no browser automation tool was exposed this session, so no live screenshot or injected overlay — this review is source-level.

## Overall Impression

The core data-entry loop (search → create/edit ficha → generate documents) is calm, well-instrumented with loading/success states, and speaks the user's domain language fluently. The trust is undermined at exactly the moments where it matters most: destructive actions (delete, merge) fall back to browser-native dialogs instead of the app's own design system, and the account-security model is actively broken by a visible/plaintext password field. The single biggest opportunity is closing that gap — bringing every high-stakes action into the same disciplined `Dialog` + confirmation pattern the merge flow already demonstrates it's capable of, and removing the password-reveal pattern entirely.

## What's Working

- **Duplicate detection before create** (`checkFichaDuplicates`, ~line 1302): prevents a real, costly error (duplicate client records) before it happens — genuine error prevention, not just error messaging.
- **Graceful partial-failure handling** (`persistCreate`, 1241-1278): distinguishes "ficha saved" from "ficha saved but webhook/automation failed" instead of collapsing both into a generic error — respects the user's actual mental model of what happened.
- **Role-aware edit gating** (`canEditFicha`, 453-456): consistently wired into visibility of edit controls (e.g. `ClienteReadCard`), not just enforced silently on the backend.

## Priority Issues

- **[P0] Plaintext password storage and reveal in the UI** — What: the user-edit panel stores/shows the current password as a visible/toggleable value (`editUserPassword = user.senha || ""`, line 1194; reveal toggle 2149-2178), and the password inputs use `type="text"` (1986, 2115) rather than `type="password"`. Why it matters: this is a severe security and LGPD-compliance risk for a tool that already handles sensitive client data (CPF/CNPJ, procuração) — round-tripping a raw password to the client, or making it visible by default while typing, is the kind of finding that would fail any real security audit. Fix: never send the raw password back to the client; the app already has a `resetPassword` flow — use "reset" instead of "reveal current password," and switch the inputs to `type="password"` with an explicit, deliberate show/hide toggle only for the *new* value being typed. Suggested command: `/impeccable harden`.
- **[P0] Destructive delete relies on `window.confirm`** — What: deleting a duplicate ficha (line 1333) uses the native browser confirm dialog. Why it matters: this is the single most irreversible action in the file ("Esta ação não pode ser desfeita"), yet it's the one moment that breaks out of the app's own design system entirely — unstyled, unlocalized beyond the string, and dismissible by reflexive Enter/Escape. It directly contradicts DESIGN.md's "Escritório de Confiança" premise at the worst possible moment. Fix: replace with the same shadcn `Dialog` pattern already used for the merge confirmation (line 2396), showing the client name/CPF and requiring an explicit confirming click. Suggested command: `/impeccable harden`.
- **[P1] Settings modal bypasses the shared Dialog component** — What: the admin Settings overlay (`fixed inset-0 z-50 ... bg-black/50`, line 1819) is a hand-rolled modal instead of the shadcn `Dialog` already used elsewhere in the same file. Why it matters: risks missing focus-trap, Escape-key handling, and `aria-modal`/`role="dialog"` semantics that the real `Dialog` component provides for free — a real keyboard/screen-reader trap risk (Sam persona), and a direct violation of DESIGN.md's consistency principle ("no custom component structure" beyond the established primitives). Fix: migrate to `Dialog`/`DialogContent`. Suggested command: `/impeccable polish`.
- **[P1] Document-template editor toolbar has ~15 ungrouped controls visible at once** — What: the rich-text toolbar (lines 2621-2790) exposes format, font, size, color, highlight, alignment, image, and undo/redo simultaneously, in one unbroken row. Why it matters: fails the cognitive-load chunking rule (≤4 items/group) for a surface admins use only occasionally, raising mis-click risk; also flagged independently by the detector as containing off-token styling (hardcoded Arial font at line 2944). Fix: group into labeled clusters (Text / Paragraph / Insert / History) with real visual separation, and pull the font-family control onto the DESIGN.md-approved Geist stack instead of a hardcoded Arial fallback. Suggested command: `/impeccable layout`.
- **[P2] Merge flow has no preview before an irreversible operation** — What: the client-merge dialog (2396+) lets an admin pick a primary ficha and confirm without previewing which contratos/fields will be affected. Why it matters: PRODUCT.md promises fichas/histories are preserved, but nothing in the UI lets the admin verify that before committing to a merge of client-of-record data. Fix: add a summary step listing every contrato being merged and the resulting primary record before the confirm button is enabled. Suggested command: `/impeccable clarify`.

## Persona Red Flags

**Alex (Power User — the consultor doing this daily)**: No keyboard shortcuts anywhere in the flow; the toolbar and settings screens offer no bulk actions beyond merge. A consultant processing dozens of fichas a day has no accelerated path — every ficha is the same number of clicks as the first one they ever did.

**Sam (Accessibility-Dependent)**: Icon-only buttons do carry `aria-label`/`title` (good — no smell there), but the hand-rolled Settings modal (line 1819) lacks the `role="dialog"`/`aria-modal`/focus-trap semantics the real `Dialog` component provides elsewhere in the same file — a genuine keyboard/screen-reader trap on one of the most-used admin surfaces.

**Riley (Stress-Tester)**: The exact seams a stress-tester would hit are the ones already found independently by both assessments — `window.confirm` on delete sits outside the tested React state tree, and the merge flow's lack of a pre-commit preview means a double-check-then-cancel workflow isn't possible.

## Minor Observations

- `fallback()` (line 161) silently renders empty strings as "-" everywhere, which is fine for a read view but could mask an actually-missing required field during data review.
- `getFichaLabel` (line 144) falls back to regex-parsing a trailing number out of the client name string when `numeroFicha <= 0` — fragile, worth hardening but not a visual issue.
- Detector flagged a `side-tab` (`border-l-4`) accent pattern repeated ~10 times across the two form files that isn't declared anywhere in DESIGN.md — worth either adopting it as a named component pattern or replacing it with an existing token-backed treatment.
- 3 `gray-on-color` contrast hits in `ficha-form.tsx` (gray text over amber backgrounds) — small, but easy to fix alongside the toolbar grouping pass.

## Questions to Consider

- If a consultant's password is visible/reset-able by an admin, what does that say about the account-security model — is login actually gating anything, or is it theater?
- DESIGN.md explicitly commits to one consistent component system — why does the highest-traffic admin surface (Settings) not use the same `Dialog` primitive the merge flow already proves works in this exact file?
- The merge operation's copy reassures ("todas as fichas preservadas") — is that reassurance earned by an actual preview/undo, or is it just confident wording covering an irreversible action?
