# Commercial Documents — v1 Plan

A native HealthFlo extension for drafting, editing, and exporting MoU and Pricing Addendum documents per CRM account. Source of truth is a structured JSON document; export is server-rendered.

---

## 1. Architecture summary

- **Lives inside the existing CRM account workflow.** Entry point is a new **"Commercial Docs"** tab in `AccountDetail`, plus a global **`/crm/templates`** route for managing reusable templates.
- **Document model** is structured JSON (not HTML) with versioned drafts. Sections/blocks reference a fixed schema so export is deterministic.
- **Templates** are first-class entities with `base → account-variant`, `draft/published/archived` lifecycle, and version history.
- **Account defaults** live in a sidecar `commercial_account_profiles` row keyed to `crm_accounts`. Each draft snapshots inherited values and tracks per-field overrides.
- **Export** is a single edge function (`commercial-doc-export`) that receives a document ID + format, loads the structured JSON, and renders DOCX (via `docx` npm package) or PDF (via the same `docx` output passed through LibreOffice in the edge runtime is too heavy — we'll use **`docx` for DOCX** and **`pdfmake`** for PDF, both running in Deno via `npm:` specifiers, both fed from the same canonical structured doc).
- **Editing UI** uses **Tiptap** for rich-text inside text blocks and section bodies, with structured outer chrome (cover-page editor, signature-page editor, block list, table editor).
- Reuses existing `useClients`/`useVersions` for pricing autofill, existing `crm-files` storage bucket for logos/exports, existing role/approval gates.

---

## 2. Data model

All tables in `public.`, RLS gated on `is_approved_user(auth.uid())` for read/insert/update; delete restricted to creator-or-admin (matching CRM/Workflow pattern).

### Enums
- `commercial_doc_type` — `mou`, `pricing_addendum`
- `commercial_doc_status` — `draft`, `needs_review`, `final`, `superseded`, `signed_uploaded`
- `commercial_template_status` — `draft`, `published`, `archived`
- `commercial_generation_mode` — `auto_from_pricing`, `structure_only`, `selective_fill`

### Tables

**`commercial_account_profiles`** (1:1 with `crm_accounts`, optional)
- `account_id` (unique), `client_legal_name`, `display_name`, `address`, `city`, `state`, `country`
- `primary_logo_path`, `secondary_logo_path` (storage paths in `crm-files`)
- `signatory_name`, `signatory_title`, `signatory_email`
- `vendor_legal_name`, `vendor_logo_path`, `vendor_signatory_name`, `vendor_signatory_title` (defaults; overridable globally too)
- `preferred_subtitle`, `legal_notes`, `defaults_json` (extensibility)

**`commercial_templates`**
- `id`, `name`, `doc_type`, `scope` (`global` | `account`), `account_id` (nullable; required when scope=account)
- `status` (`commercial_template_status`), `default_generation_mode`
- `base_template_id` (nullable; lineage)
- `description`, timestamps, `created_by`

**`commercial_template_versions`**
- `id`, `template_id`, `version_number` (auto-incremented per template)
- `structure_json` (jsonb — the canonical section/block schema, see §4)
- `is_current` boolean (one current per template)
- `published_at`, `created_by`, `created_at`

**`commercial_documents`** (drafts)
- `id`, `account_id`, `doc_type`, `title`
- `template_id`, `template_version_id` (snapshot of which template version it was generated from)
- `generation_mode`
- `linked_client_id` (nullable, → `clients`), `linked_version_id` (nullable, → `versions`)
- `status` (`commercial_doc_status`)
- `content_json` (jsonb — the full editable structured doc, see §4)
- `inherited_profile_snapshot` (jsonb — frozen copy of `commercial_account_profiles` at create time)
- `manual_overrides` (jsonb — `{ fieldKey: value }` map of per-doc overrides)
- `unresolved_fields` (jsonb array — auto-computed list of placeholders user must fill)
- `derived_from_document_id` (nullable; for duplicate/supersede)
- `notes`, `created_by`, `updated_by`, `exported_at`, timestamps

**`commercial_document_exports`**
- `id`, `document_id`, `format` (`pdf` | `docx`), `file_path` (storage path)
- `exported_by`, `exported_at`, `file_size_bytes`

### Relationships
- `commercial_account_profiles.account_id` → `crm_accounts.id`
- `commercial_templates.account_id` → `crm_accounts.id` (when account-scoped)
- `commercial_documents.account_id` → `crm_accounts.id`
- `commercial_documents.linked_client_id` → `clients.id` (existing pricing)
- `commercial_documents.linked_version_id` → `versions.id` (existing pricing)
- App-enforced FKs (consistent with the rest of the codebase)

### Storage
- Reuse existing **`crm-files`** bucket; folder convention: `commercial/{account_id}/logos/...` and `commercial/{account_id}/exports/{document_id}/...`

---

## 3. Routes / UI surfaces

### New routes
- **`/crm/accounts/:id`** — adds a **"Commercial Docs"** tab (between Documents and Workflow)
- **`/crm/accounts/:id/docs/:docId`** — the document editor (full-page, breaks out of the tab to give editor real estate)
- **`/crm/templates`** — global templates list + template editor (new top-level CRM nav item)

### Screens
1. **Account → Commercial Docs tab**
   - Defaults profile card (with "Edit defaults" → opens `AccountProfileForm` modal)
   - Documents table: type badge, status, template + version, linked pricing, updated, export buttons, row click → editor
   - "New document" button → `CreateDocumentDialog`
2. **CreateDocumentDialog** — type → template → generation mode → linked pricing version (if applicable) → use defaults toggle → Create
3. **Document editor** (`/crm/accounts/:id/docs/:docId`)
   - **Left rail:** outline (cover / sections-or-blocks / signature) + completion checklist (unresolved fields)
   - **Center:** paginated preview-like canvas with section/block editors
   - **Right rail:** properties panel (selected section/block settings, status, metadata, export buttons)
   - Top bar: status dropdown, Save (autosave), Duplicate, Supersede, Export PDF, Export DOCX
4. **Templates page (`/crm/templates`)**
   - Global templates list + per-account variants
   - "New template", "Duplicate", "Create variant from base"
   - Template editor reuses the same document editor in "template mode" (no doc-only fields like status/pricing link)

---

## 4. Document model (the structured schema)

```ts
type DocumentDoc = {
  schemaVersion: 1;
  cover: CoverPage;          // MoU only
  sections?: Section[];      // MoU body
  blocks?: Block[];          // Addendum body
  signature?: SignaturePage; // MoU only
  meta: { title: string; subtitle?: string; effectiveDate?: string };
};

type CoverPage = {
  variant: 'two_party_centered' | 'two_party_left';
  vendorLogoRef?: string; clientLogoRef?: string;
  title: string; subtitle?: string;
  vendorParty: PartyBlock; clientParty: PartyBlock;
  divider: boolean; spacing: 'compact'|'normal'|'spacious';
};

type PartyBlock = { legalName: string; address?: string; tagline?: string };

type Section = {  // MoU body
  id: string; key: string;       // 'parties' | 'purpose' | ...
  title: string;                 // editable
  body: TiptapJSON;              // rich text
  customized?: boolean;          // diverged from template
};

type Block =  // Addendum
  | { id; kind: 'header'; title; subtitle? }
  | { id; kind: 'text'; title?; body: TiptapJSON }
  | { id; kind: 'pricing_table'; title; rows: PricingRow[]; sourceVersionId?: string }
  | { id; kind: 'discount_summary'; rows: { label; baseline; discounted; savings }[] }
  | { id; kind: 'comparison'; columns: string[]; rows: string[][] }
  | { id; kind: 'narrative'; topic: 'infrastructure'|'compliance'|'sla'|'governance'|'references'|'notes'; body: TiptapJSON }
  | { id; kind: 'signature'; signatory: SignatoryBlock }
  | { id; kind: 'custom_section'; title: string; primitives: CustomPrimitive[] };

type CustomPrimitive =  // constrained palette
  | { kind: 'heading'; level: 1|2|3; text: string }
  | { kind: 'paragraph'; body: TiptapJSON }
  | { kind: 'bullets' | 'numbered'; items: TiptapJSON[] }
  | { kind: 'callout'; tone: 'info'|'warn'|'note'; body: TiptapJSON }
  | { kind: 'two_column'; left: TiptapJSON; right: TiptapJSON }
  | { kind: 'image'; assetPath: string; widthPct?: number }
  | { kind: 'simple_table'; headers: string[]; rows: string[][] }
  | { kind: 'note_box'; body: TiptapJSON };

type SignaturePage = { partyA: SignatoryBlock; partyB: SignatoryBlock };
type SignatoryBlock = { legalName; signatoryName; designation; date?; signatureAssetPath? };
```

Each section/block carries an `inheritance` map per-field: `'template' | 'profile' | 'override' | 'missing'` — drives the "Needs update" chips and unresolved-fields list.

---

## 5. Generation modes

When creating a draft from a template, server (or client helper, since payload is small) runs `generateDraft(template, mode, profile, pricingVersion?)`:

- **`auto_from_pricing`** *(addendum default)*: pulls pricing tables, discount summary, commercial blocks from the linked `versions.data` snapshot using the existing `calculateAllTiers` math. All other narrative blocks come from template.
- **`structure_only`** *(MoU default)*: clones template structure, marks pricing/financial fields as `missing` placeholders so they show in the completion checklist.
- **`selective_fill`**: dialog asks user which block kinds to autofill (pricing_table, discount_summary, signature, etc.); rest stays as template defaults.

---

## 6. Editor behavior

- **Cover page editor**: dedicated form (logo uploaders for vendor + client, title/subtitle inputs, address textareas, variant radio, spacing/divider toggles). Renders a preview pane.
- **Body sections (MoU)**: outline shows fixed section list; clicking opens an editable card with title input + Tiptap (bold/italic/lists/headings/links). Sections are not reorderable; users can't add or remove them in v1 (template controls section set).
- **Blocks (Addendum)**: ordered list with drag handle, hide/show toggle per block, "Add block" menu. Each block type has its own editor (text → Tiptap; pricing_table → row editor with add/delete row, currency picker; comparison → grid editor; etc.). "Add Custom Section" opens a primitive picker.
- **Signature page editor**: structured form, two parties, optional signature image upload.
- **Tables**: editable grid components with add/remove row/column buttons; no merged cells in v1.
- **Inheritance/overrides**: every form field shows a small chip — `Inherited` (greyed), `Overridden` (amber), `Missing` (red). Clicking a chip menus to "Reset to inherited" / "Override" / "Mark as filled."
- **Autosave**: debounced 1.5s mutation to `commercial_documents.content_json`; toast on save error.

---

## 7. Export strategy

Single edge function **`commercial-doc-export`** (POST `{ documentId, format }`):
1. Verify caller JWT, load document + profile snapshot, compute final merged content.
2. **DOCX**: build with `npm:docx@^9` using a renderer that walks the `DocumentDoc` schema → `Document/Section/Paragraph/Table/Header/Footer`. US Letter, 1" margins. Cover uses dedicated section with custom heading styles. Signature page uses tab-stop layout (no tables-as-rules). Custom section primitives map 1:1 to docx primitives. Tiptap JSON → docx runs via a small adapter (handled marks: bold, italic, underline, link; nodes: paragraph, heading, bulletList, orderedList).
3. **PDF**: render the same `DocumentDoc` via `npm:pdfmake@^0.2` to keep parity. Both renderers share the same intermediate "render plan" so they stay aligned.
4. Upload result to `crm-files` at `commercial/{account_id}/exports/{document_id}/{timestamp}.{ext}`, insert `commercial_document_exports` row, return signed URL.
5. Client downloads via the signed URL; UI shows the latest export per format on the document page.

This keeps DOCX rock-solid in Word (no HTML→DOCX lossy conversion) and PDF presentation consistent without browser fonts.

---

## 8. Phased build plan

**v1 (this build):**
- All schema + RLS + triggers (auto-increment template version, validate one `is_current` per template, autopopulate `unresolved_fields` on update via trigger).
- `commercial_account_profiles` editor + storage upload helper for logos.
- Templates list page, basic template editor (uses the same doc editor, "template mode").
- Skeletal Jeena Seekho MoU + Addendum templates seeded as `published` global templates.
- Document list (account tab) + create dialog + full-page document editor (cover, sections, blocks, signature, custom section, table editing, completion checklist, status dropdown, autosave, duplicate, supersede).
- `commercial-doc-export` edge function: DOCX + PDF.
- Documentation: `docs/COMMERCIAL_DOCS.md`, CHANGELOG entry, DATABASE.md updates.

**v2 (deferred):**
- Signed-copy upload + countersignature workflow.
- Bundled MoU+Addendum generation.
- E-signature integration.
- Template diff/merge between base and variant.
- Image embedding inside Tiptap blocks.
- Full version-restore UI for documents (we keep the data, but only basic duplicate/supersede in v1).

---

## 9. Technical notes

- New deps: `@tiptap/react @tiptap/starter-kit @tiptap/extension-link` (client). Edge function uses `npm:docx` and `npm:pdfmake` via Deno specifiers — no client bundle impact.
- Hooks: `useCommercialDocs`, `useCommercialDocMutations`, `useCommercialTemplates`, `useCommercialAccountProfile`, `useCommercialExport` — same query-key + invalidation patterns as existing CRM hooks.
- Types: `src/types/commercialDoc.ts` (schema + enums + helper guards).
- Renderer adapters live in `supabase/functions/commercial-doc-export/` (single `index.ts` per Lovable rules) — Tiptap-JSON-to-docx and Tiptap-JSON-to-pdfmake adapters in the same file.
- All new RLS policies follow `is_approved_user(auth.uid())` pattern; admin-only DELETE on templates and documents to prevent accidental loss; account profile readable/editable by approved users (admins can reset).
- New CRM nav entry "Templates" added to `CrmLayout`.
- Documentation files updated: `CHANGELOG.md` (with Decisions section), `docs/ARCHITECTURE.md` (new module section), `docs/DATABASE.md` (new tables block), `docs/UX_FLOWS.md` (commercial docs flow), and a new `docs/COMMERCIAL_DOCS.md` deep-dive.

Approve this plan and I'll execute it in build mode: migration first, then types/hooks, then UI, then the edge function, then template seeding, then docs.