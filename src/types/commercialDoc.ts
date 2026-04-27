// Commercial Documents — schema types and helpers
// Source of truth for the structured document model. Both editor and exporter
// read this shape; do not invent ad-hoc fields elsewhere.

export type CommercialDocType = "mou" | "pricing_addendum";
export type CommercialDocStatus =
  | "draft"
  | "needs_review"
  | "final"
  | "superseded"
  | "signed_uploaded";
export type CommercialTemplateStatus = "draft" | "published" | "archived";
export type CommercialTemplateScope = "global" | "account";
export type CommercialGenerationMode =
  | "auto_from_pricing"
  | "structure_only"
  | "selective_fill";
export type CommercialExportFormat = "pdf" | "docx";

// ---------- Tiptap content (loosely typed JSON) ----------
export type TiptapDoc = {
  type: "doc";
  content?: TiptapNode[];
};
export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export const emptyTiptap = (): TiptapDoc => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export const tiptapFromText = (text: string): TiptapDoc => ({
  type: "doc",
  content: text
    .split(/\n{2,}/)
    .map((para) => ({
      type: "paragraph",
      content: para
        ? [{ type: "text", text: para }]
        : undefined,
    })),
});

// ---------- Cover page (MoU) ----------
export type CoverVariant = "two_party_centered" | "two_party_left" | "branded_split";
export type CoverSpacing = "compact" | "normal" | "spacious";

export interface PartyBlock {
  legalName: string;
  address?: string;
  tagline?: string;
}

export interface CoverPage {
  variant: CoverVariant;
  vendorLogoRef?: string;
  clientLogoRef?: string;
  title: string;
  subtitle?: string;
  vendorParty: PartyBlock;
  clientParty: PartyBlock;
  divider: boolean;
  spacing: CoverSpacing;
  /** Place where the document is being executed (e.g., "Dehradun, Uttarakhand, India"). */
  executionLocation?: string;
}

// ---------- Facility coverage (Scope of Work · 3.2) ----------
export interface FacilityCoverageRow {
  id: string;
  label: string;
  count?: number;
  description?: string;
}
export interface FacilityCoverage {
  totalCount?: number;
  rows: FacilityCoverageRow[];
  notes?: TiptapDoc;
}

// ---------- MoU body sections ----------
export const MOU_SECTION_KEYS = [
  "parties",
  "purpose",
  "scope_of_work",
  "trial_terms",
  "subscription_models",
  "data_privacy_security",
  "confidentiality_ip",
  "roles_responsibilities",
  "term_termination",
  "dispute_resolution",
  "governing_law",
  "miscellaneous",
] as const;
export type MouSectionKey = (typeof MOU_SECTION_KEYS)[number];

export const MOU_SECTION_LABELS: Record<MouSectionKey, string> = {
  parties: "Parties",
  purpose: "Purpose",
  scope_of_work: "Scope of Work",
  trial_terms: "Trial Terms",
  subscription_models: "Subscription Models",
  data_privacy_security: "Data Privacy & Security",
  confidentiality_ip: "Confidentiality & Intellectual Property",
  roles_responsibilities: "Roles & Responsibilities",
  term_termination: "Term & Termination",
  dispute_resolution: "Dispute Resolution",
  governing_law: "Governing Law",
  miscellaneous: "Miscellaneous",
};

export interface SectionSubsection {
  id: string;
  /** Display number, e.g. "3.1". Computed at render-time when omitted. */
  number?: string;
  title: string;
  body: TiptapDoc;
}

export interface Section {
  id: string;
  key: MouSectionKey;
  title: string;
  body: TiptapDoc;
  customized?: boolean;
  /** Optional structured subsections, e.g. 3.1 / 3.2 / 3.3 under Scope of Work. */
  subsections?: SectionSubsection[];
  /** Optional structured facility coverage editor (used on §3 Scope of Work). */
  coverage?: FacilityCoverage;
}

// ---------- Addendum blocks ----------
export type BlockKind =
  | "header"
  | "text"
  | "pricing_table"
  | "discount_summary"
  | "comparison"
  | "narrative"
  | "signature"
  | "custom_section";

export interface PricingRow {
  tier: string;
  includedVisits?: number;
  monthlyBase?: number;
  overagePrice?: number;
  monthlyTotal?: number;
  notes?: string;
}

export interface DiscountRow {
  label: string;
  baseline: number;
  discounted: number;
  savings: number;
}

export interface SignatoryBlock {
  legalName: string;
  signatoryName: string;
  designation: string;
  date?: string;
  signatureAssetPath?: string;
}

// Custom-section primitives — strictly constrained palette
export type CustomPrimitive =
  | { kind: "heading"; id: string; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; id: string; body: TiptapDoc }
  | { kind: "bullets"; id: string; items: TiptapDoc[] }
  | { kind: "numbered"; id: string; items: TiptapDoc[] }
  | { kind: "callout"; id: string; tone: "info" | "warn" | "note"; body: TiptapDoc }
  | { kind: "two_column"; id: string; left: TiptapDoc; right: TiptapDoc }
  | { kind: "image"; id: string; assetPath: string; widthPct?: number; alt?: string }
  | { kind: "simple_table"; id: string; headers: string[]; rows: string[][] }
  | { kind: "note_box"; id: string; body: TiptapDoc };

export type Block =
  | { id: string; kind: "header"; hidden?: boolean; title: string; subtitle?: string }
  | { id: string; kind: "text"; hidden?: boolean; title?: string; body: TiptapDoc }
  | {
      id: string;
      kind: "pricing_table";
      hidden?: boolean;
      title: string;
      currency: "INR" | "USD";
      rows: PricingRow[];
      sourceVersionId?: string;
      customized?: boolean;
    }
  | { id: string; kind: "discount_summary"; hidden?: boolean; title: string; rows: DiscountRow[] }
  | {
      id: string;
      kind: "comparison";
      hidden?: boolean;
      title: string;
      columns: string[];
      rows: string[][];
    }
  | {
      id: string;
      kind: "narrative";
      hidden?: boolean;
      title: string;
      topic:
        | "infrastructure"
        | "compliance"
        | "sla"
        | "governance"
        | "references"
        | "notes";
      body: TiptapDoc;
    }
  | { id: string; kind: "signature"; hidden?: boolean; signatory: SignatoryBlock }
  | {
      id: string;
      kind: "custom_section";
      hidden?: boolean;
      title: string;
      primitives: CustomPrimitive[];
    };

// ---------- Signature page (MoU) ----------
export interface SignaturePage {
  partyA: SignatoryBlock;
  partyB: SignatoryBlock;
  effectiveDate?: string;
  closingNote?: string;
}

// ---------- Top-level document ----------
export interface DocumentMeta {
  title: string;
  subtitle?: string;
  effectiveDate?: string;
}

export interface DocumentDoc {
  schemaVersion: 1;
  docType: CommercialDocType;
  meta: DocumentMeta;
  cover?: CoverPage;
  sections?: Section[];
  blocks?: Block[];
  signature?: SignaturePage;
}

// ---------- Account profile ----------
export interface AccountProfile {
  account_id: string;
  client_legal_name?: string | null;
  display_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  primary_logo_path?: string | null;
  secondary_logo_path?: string | null;
  signatory_name?: string | null;
  signatory_title?: string | null;
  signatory_email?: string | null;
  vendor_legal_name?: string | null;
  vendor_logo_path?: string | null;
  vendor_signatory_name?: string | null;
  vendor_signatory_title?: string | null;
  preferred_subtitle?: string | null;
  legal_notes?: string | null;
  defaults_json?: Record<string, unknown>;
}

// ---------- Helpers ----------
export const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `id_${Math.random().toString(36).slice(2, 10)}`;

export const STATUS_LABELS: Record<CommercialDocStatus, string> = {
  draft: "Draft",
  needs_review: "Needs Review",
  final: "Final",
  superseded: "Superseded",
  signed_uploaded: "Signed Copy Uploaded",
};

export const STATUS_TONES: Record<CommercialDocStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  needs_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  final: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  superseded: "bg-muted text-muted-foreground line-through",
  signed_uploaded: "bg-primary/15 text-primary",
};

export const TYPE_LABELS: Record<CommercialDocType, string> = {
  mou: "MoU",
  pricing_addendum: "Pricing Addendum",
};

export const GENERATION_MODE_LABELS: Record<CommercialGenerationMode, string> = {
  auto_from_pricing: "Auto-generate from pricing",
  structure_only: "Structure only",
  selective_fill: "Selective fill",
};

// Compute unresolved fields for the completion checklist.
export interface UnresolvedField {
  path: string; // e.g. "cover.title", "blocks[2].rows[0].monthlyBase"
  label: string;
  severity: "missing" | "placeholder";
}

const isPlaceholder = (s: string | undefined | null): boolean =>
  !s ? true : /\{\{|TBD|TODO|\[fill/i.test(s);

export function computeUnresolvedFields(doc: DocumentDoc): UnresolvedField[] {
  const out: UnresolvedField[] = [];
  if (doc.cover) {
    if (isPlaceholder(doc.cover.title))
      out.push({ path: "cover.title", label: "Cover title", severity: "missing" });
    if (!doc.cover.vendorParty?.legalName)
      out.push({
        path: "cover.vendorParty.legalName",
        label: "Vendor legal name on cover",
        severity: "missing",
      });
    if (!doc.cover.clientParty?.legalName)
      out.push({
        path: "cover.clientParty.legalName",
        label: "Client legal name on cover",
        severity: "missing",
      });
  }
  doc.sections?.forEach((s, i) => {
    const txt = JSON.stringify(s.body);
    if (txt.length < 30 || isPlaceholder(txt)) {
      out.push({
        path: `sections[${i}]`,
        label: `Section "${s.title}" looks empty`,
        severity: "placeholder",
      });
    }
  });
  doc.blocks?.forEach((b, i) => {
    if (b.kind === "pricing_table") {
      b.rows.forEach((r, j) => {
        if (r.monthlyBase == null && r.monthlyTotal == null) {
          out.push({
            path: `blocks[${i}].rows[${j}]`,
            label: `Pricing row "${r.tier}" missing values`,
            severity: "missing",
          });
        }
      });
    }
    if (b.kind === "signature") {
      if (!b.signatory.signatoryName)
        out.push({
          path: `blocks[${i}].signatory.signatoryName`,
          label: "Signatory name missing",
          severity: "missing",
        });
    }
  });
  if (doc.signature) {
    if (!doc.signature.partyA?.signatoryName)
      out.push({
        path: "signature.partyA.signatoryName",
        label: "Party A signatory missing",
        severity: "missing",
      });
    if (!doc.signature.partyB?.signatoryName)
      out.push({
        path: "signature.partyB.signatoryName",
        label: "Party B signatory missing",
        severity: "missing",
      });
  }
  return out;
}
