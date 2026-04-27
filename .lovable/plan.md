# MoU Module Refinement Plan

Refine the **existing** Commercial Documents → MoU module so its output mirrors the Jeena Sikho reference. We keep the section-based editor, the `DocumentDoc` schema, the `commercial_documents` storage, and the `commercial-doc-export` edge function. We replace seed text, add structured sub-models (cover branding split, facility coverage, fuller signature), and harden numbering/bullet rendering.

## What we keep vs. refine

| Area | Decision |
|---|---|
| Section-based editor (`CommercialDocEditor`) | Keep |
| `DocumentDoc` schema, `commercial_documents` table, RLS | Keep |
| Export edge function `commercial-doc-export` (DOCX + PDF) | Keep, harden renderers |
| Tiptap rich text per section | Keep |
| Generic 1-line seed clauses | Replace with reference-grade defaults |
| Cover (`two_party_centered`/`two_party_left`) | Add `branded_split` variant + vendor address |
| MoU sections — flat body | Allow numbered subsections (`3.1`, `8.1`, `8.2`) via Tiptap `orderedList` rendered with section number prefix |
| Facility coverage | New first-class structured editor (count + per-type rows + notes) |
| Signature page | Expand to formal "IN WITNESS WHEREOF" + name/designation/date per party |
| Variable flagging | Stronger checklist (execution city, facility coverage, signatories, client address) |

## Schema changes (`src/types/commercialDoc.ts`)

Additive — old documents stay valid.

- `CoverVariant` adds `"branded_split"` (left brand strip / right party block, modeled on the reference).
- `PartyBlock` already has `address` — used on cover for vendor as well.
- `CoverPage` adds `executionLocation?: string` (e.g. "Dehradun, Uttarakhand, India").
- New `FacilityCoverage` type:
  ```ts
  interface FacilityCoverageRow { id: string; label: string; count?: number; description?: string }
  interface FacilityCoverage {
    totalCount?: number;
    rows: FacilityCoverageRow[];
    notes?: TiptapDoc;
  }
  ```
- `Section` gains optional `subsections?: { id: string; number: string; title: string; body: TiptapDoc }[]` and optional `coverage?: FacilityCoverage` (used only on the `scope_of_work` section).
- `SignaturePage` gains `witnessClause?: string` (default: "IN WITNESS WHEREOF, the parties hereto have executed this Memorandum of Understanding as of the date first written below.").
- `computeUnresolvedFields` extended: flag missing `cover.executionLocation`, missing `coverage.totalCount`, missing facility rows, missing signatory name/designation, placeholder `{{accountName}}` still present in any section body.

All fields are optional, so legacy drafts and the existing addendum template are unaffected.

## Refined MoU template (`emptyMouTemplate` in `src/utils/commercialDocGenerator.ts`)

Rebuilt around the reference text:

1. **Cover** — `variant: "branded_split"`, vendor on left (logo + "Nileflo AI Solutions / 123 Indra Nagar Colony, Dehradun, Uttarakhand, India"), client on right (logo + `{{accountName}}` + address), title "MEMORANDUM OF UNDERSTANDING", subtitle "HEALTHFLO AI-Native Platform for AYURVEDA", `executionLocation: "Dehradun, Uttarakhand, India"`.
2. **§1 Parties** — full "First Party / Second Party" paragraphs with the registered-office defaults; client paragraph is editable Tiptap with `{{accountName}}` and `{{clientDescriptor}}` resolved at generation. Includes the "entered into at {executionLocation}" line.
3. **§2 Purpose** — full paragraph from reference, `{{accountName}}` resolved.
4. **§3 Scope of Work** — uses `subsections`:
   - 3.1 Trial Implementation — paragraph + 4 bullets (customization, integration, training, evaluation).
   - 3.2 Coverage of Facilities — driven by the new `coverage` editor (intro paragraph references `coverage.totalCount` + bullet per row).
   - 3.3 Integration and Features — paragraph + 6-item bullet list.
5. **§4 Trial Terms** — ordered list of 4 items (reference text).
6. **§5 Subscription Models** — `subsections` 5.1 Large Hospitals (50+), 5.2 Small Hospitals (<50), 5.3 Clinics, 5.4 Pricing (refers to the Addendum).
7. **§6 Data Privacy & Security** — 3 numbered points.
8. **§7 Confidentiality & IP** — 3 numbered points.
9. **§8 Roles & Responsibilities** — `subsections` 8.1 First Party (4 bullets), 8.2 Second Party (4 bullets, references `{{accountName}}`).
10. **§9 Term & Termination** — 3 numbered points.
11. **§10 Dispute Resolution** — 4 numbered points.
12. **§11 Governing Law** — full paragraph.
13. **§12 Miscellaneous** — 4 numbered points.
14. **Signature page** — `witnessClause` + two structured signatory blocks (legal name, signature line, name, designation, date). First-party defaulted to Nileflo AI Solutions Pvt. Ltd.

Vendor identity defaults are centralized in a `VENDOR_DEFAULTS` constant (legalName / address / signatory) so they can be overridden per-tenant later.

## Generator behaviour (`generateInitialContent`)

- Resolve `{{accountName}}` recursively across cover, every section body (including subsections), and signature.
- Pull client address/city/state from `AccountProfile` into both cover client party and the §1 Parties paragraph (rendered as a templated string, then converted with `tiptapFromText`).
- If `profile.defaults_json.facilityCoverage` exists, seed the §3.2 `coverage` block; otherwise leave `rows: []` and `totalCount: undefined` so the checklist surfaces it.
- `executionLocation` defaults to vendor city; user-editable.

## Editor changes (`CommercialDocEditor.tsx`)

- **CoverEditor**: add the `branded_split` option to the Variant select, and a vendor-address textarea (was missing). Add `Execution location` field. Logo upload UI already exists in `AccountProfileForm`; surface the resolved logos as small previews.
- **SectionEditor**: when `section.subsections` is present, render each subsection as its own labeled Tiptap editor with `number` shown as a read-only prefix (`3.1 Trial Implementation`). Add buttons to add/remove subsections (used by power-users only; default template comes pre-populated).
- **CoverageEditor** (new component, mounted automatically inside the §3 Scope of Work card when `section.coverage` exists): total facility count input + editable rows table (label, count, description) + freeform notes Tiptap. "Add facility type" button.
- **SignatureEditor**: add witness clause textarea, and per-party `Signatory name`, `Designation`, `Date` fields (date as `<input type="date">`).
- **Checklist** already renders `unresolved` items; we just expand the source.

No new routes; the editor stays at `/crm/accounts/:accountId/docs/:docId`.

## Export renderer changes (`supabase/functions/commercial-doc-export/index.ts`)

The export already walks `DocumentDoc`. Updates:

1. **Cover branded_split**: DOCX uses a 2-column borderless table (left: vendor logo + name + address; right: client logo + name + address) with a vertical border between cells; PDF uses pdfmake `columns` with a thin divider. Falls back to the existing centered/left layouts.
2. **Section numbering**: render sections as `${i+1}. ${title}`. When a section has `subsections`, render each as `${i+1}.${j+1} ${title}` followed by its body. Existing flat-body sections still render unchanged.
3. **Bullet/numbered fidelity (DOCX)**: register a `numbering` config with two abstract definitions — `bullets` (LevelFormat.BULLET) and `numbers` (LevelFormat.DECIMAL). The Tiptap walker already detects `bulletList`/`orderedList`; replace the current "prefix `•` / `1.` into a paragraph" approach with real `Paragraph({ numbering: { reference, level } })` so Word renders native lists. Restart numbering per `orderedList`.
4. **PDF lists**: switch from manually-prefixed text to pdfmake's native `ul` / `ol` nodes inside each section (no more `"• "` glued to the first run).
5. **Coverage block**: render `totalCount` line + a 2-column borderless table for rows (count + label/description) + notes paragraph.
6. **Signature page**: render `witnessClause` paragraph, then a 2-column table with each party's legal name, a 2-line signature underline (paragraph with bottom border), and labeled "Name / Designation / Date" rows.
7. **Page footer** ("Page X of Y") added in DOCX via `Footer` and pdfmake `footer` callback to match the reference.

## Variable / flagging matrix

| Variable | Source | Flagged when |
|---|---|---|
| `cover.clientParty.legalName` | profile.client_legal_name → accountName | empty or contains `{{` |
| `cover.clientParty.address` | profile.address+city+state+country | empty |
| `cover.executionLocation` | vendor city default | empty |
| `coverage.totalCount` | profile.defaults_json.facilityCoverage | undefined |
| `coverage.rows` | profile.defaults_json.facilityCoverage | empty |
| `signature.partyB.signatoryName/designation` | profile.signatory_* | empty |
| Any section body | – | still contains `{{...}}` or `TBD` |

These all surface in the existing left-rail "Completion checklist" with severity tone.

## Migration / data

No DB migration required — `content_json` is JSONB. New optional fields land additively. Existing drafts continue to load (the editor only renders `subsections`/`coverage` when present).

After deploy: open `/crm/templates`, click **Seed Jeena Seekho skeletons** to replace the published MoU template with the refined version (the seeder will create a new `version 2` so older drafts retain their lineage).

## Files to touch

- `src/types/commercialDoc.ts` — schema additions, expanded `computeUnresolvedFields`.
- `src/utils/commercialDocGenerator.ts` — full `emptyMouTemplate` rewrite, `VENDOR_DEFAULTS`, recursive placeholder resolver, coverage seeding from profile.
- `src/pages/crm/CommercialDocEditor.tsx` — subsection rendering, coverage section, signature page upgrade, vendor-address + execution-location fields.
- `src/components/commercial/CoverageEditor.tsx` (new) — facility coverage editor.
- `src/components/commercial/AccountProfileForm.tsx` — small addition: editable `facilityCoverage` defaults persisted into `defaults_json`.
- `supabase/functions/commercial-doc-export/index.ts` — branded_split cover, native list numbering, subsection numbering, coverage + signature renderers, page footer. Redeploy.
- `src/pages/crm/TemplatesPage.tsx` — bump seed version label so re-seeding is obvious.

## Out of scope (intentionally)

- New standalone document types or routes.
- Re-architecting the editor as a free-form rich-text canvas.
- Pricing Addendum content (untouched — only the MoU is refined here).
- Logo asset management beyond what `AccountProfileForm` already supports.

## Risks & mitigations

- **DOCX numbering** is the most fragile area; we'll restart numbering per ordered list and unit-test by exporting after seeding.
- **Branded split cover** rendering differs slightly between DOCX and PDF; we accept minor visual drift but keep both layouts professional and aligned.
- **Existing drafts** keep their old flat sections — refinement applies to *new* documents generated from the re-seeded template.

Approve and I'll switch to build mode and implement all of the above in one pass.