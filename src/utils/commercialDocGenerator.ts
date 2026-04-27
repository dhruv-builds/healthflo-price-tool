// Generates the initial DocumentDoc for a new draft from a template
// + selected generation mode + linked pricing version + account profile.

import { PricingInputs } from "@/types/pricing";
import { calculateAllTiers } from "@/utils/calculations";
import {
  AccountProfile,
  Block,
  CommercialGenerationMode,
  DEFAULT_WITNESS_CLAUSE,
  DocumentDoc,
  FacilityCoverage,
  FacilityCoverageRow,
  PricingRow,
  Section,
  SectionSubsection,
  TiptapDoc,
  emptyTiptap,
  newId,
  tiptapFromText,
} from "@/types/commercialDoc";

interface GenerateInput {
  template: DocumentDoc; // template's structure_json
  mode: CommercialGenerationMode;
  profile?: AccountProfile | null;
  pricing?: { name: string; data: PricingInputs } | null;
  accountName: string;
}

// Centralized first-party defaults — easy to tweak per tenant later.
export const VENDOR_DEFAULTS = {
  legalName: "Nileflo AI Solutions Pvt. Ltd.",
  shortName: "Nileflo AI Solutions",
  address: "123 Indra Nagar Colony, Dehradun, Uttarakhand, India",
  productLine: "HEALTHFLO AI-Native Platform for AYURVEDA",
  executionLocation: "Dehradun, Uttarakhand, India",
  governingState: "Uttarakhand",
  governingCity: "Dehradun",
  signatoryName: "",
  signatoryTitle: "",
} as const;

// ---------- Placeholder resolution (recursive over Tiptap JSON) ----------

const fillPlaceholders = (s: string | undefined, vars: Record<string, string>): string =>
  (s ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

function resolveTiptap(node: any, vars: Record<string, string>): any {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((n) => resolveTiptap(n, vars));
  const next: any = { ...node };
  if (typeof next.text === "string") next.text = fillPlaceholders(next.text, vars);
  if (next.content) next.content = next.content.map((c: any) => resolveTiptap(c, vars));
  return next;
}

function resolveSection(s: Section, vars: Record<string, string>): Section {
  return {
    ...s,
    id: newId(),
    body: resolveTiptap(s.body, vars),
    subsections: s.subsections?.map((ss) => ({
      ...ss,
      id: newId(),
      title: fillPlaceholders(ss.title, vars),
      body: resolveTiptap(ss.body, vars),
    })),
    coverage: s.coverage
      ? {
          ...s.coverage,
          rows: s.coverage.rows.map((r) => ({ ...r, id: r.id ?? newId() })),
          notes: s.coverage.notes ? resolveTiptap(s.coverage.notes, vars) : undefined,
        }
      : undefined,
  };
}

// Generate pricing rows from pricing inputs using the existing calculator.
export function pricingRowsFromInputs(inputs: PricingInputs): PricingRow[] {
  const tiers = calculateAllTiers(inputs);
  const labels = ["Base", "10% Off", "20% Off", "30% Off", "40% Off", "50% Off"];
  return tiers.map((t, i) => ({
    tier: labels[i] ?? `Tier ${i + 1}`,
    includedVisits: t.includedVisits,
    monthlyBase: Math.round(t.monthlyBase),
    overagePrice: Math.round(inputs.overagePrice * (1 - i * 0.1)),
    monthlyTotal: Math.round(t.monthlyTotal),
  }));
}

export function generateInitialContent({
  template,
  mode,
  profile,
  pricing,
  accountName,
}: GenerateInput): DocumentDoc {
  const cloned: DocumentDoc = JSON.parse(JSON.stringify(template));
  cloned.docType = template.docType;

  // Build the variable map used for placeholder resolution everywhere.
  const clientAddressJoined = [
    profile?.address,
    [profile?.city, profile?.state].filter(Boolean).join(", "),
    profile?.country,
  ]
    .filter(Boolean)
    .join("\n");

  const clientCityState =
    [profile?.city, profile?.state].filter(Boolean).join(", ") ||
    profile?.address ||
    "";

  const vars: Record<string, string> = {
    accountName,
    clientLegalName: profile?.client_legal_name || accountName,
    clientAddress: clientAddressJoined || "[client address]",
    clientCityState: clientCityState || "[client location]",
    clientDescriptor:
      "a healthcare organization operating clinical facilities, including hospitals and outpatient clinics",
    vendorLegalName: profile?.vendor_legal_name || VENDOR_DEFAULTS.legalName,
    vendorShortName: VENDOR_DEFAULTS.shortName,
    vendorAddress: VENDOR_DEFAULTS.address,
    productLine: VENDOR_DEFAULTS.productLine,
    executionLocation:
      (cloned.cover?.executionLocation as string | undefined) ||
      VENDOR_DEFAULTS.executionLocation,
    governingState: VENDOR_DEFAULTS.governingState,
    governingCity: VENDOR_DEFAULTS.governingCity,
  };

  // Apply account profile to cover.
  if (cloned.cover) {
    cloned.cover.title = fillPlaceholders(cloned.cover.title, vars);
    cloned.cover.subtitle =
      profile?.preferred_subtitle ?? fillPlaceholders(cloned.cover.subtitle, vars);
    cloned.cover.executionLocation =
      cloned.cover.executionLocation ?? VENDOR_DEFAULTS.executionLocation;
    if (profile?.client_legal_name) {
      cloned.cover.clientParty.legalName = profile.client_legal_name;
    } else if (!cloned.cover.clientParty.legalName || /\{\{/.test(cloned.cover.clientParty.legalName)) {
      cloned.cover.clientParty.legalName = accountName;
    }
    if (clientAddressJoined) cloned.cover.clientParty.address = clientAddressJoined;
    if (profile?.vendor_legal_name) cloned.cover.vendorParty.legalName = profile.vendor_legal_name;
    if (!cloned.cover.vendorParty.address)
      cloned.cover.vendorParty.address = VENDOR_DEFAULTS.address;
    if (profile?.vendor_logo_path) cloned.cover.vendorLogoRef = profile.vendor_logo_path;
    if (profile?.primary_logo_path) cloned.cover.clientLogoRef = profile.primary_logo_path;
  }

  // MoU sections — recursively resolve all placeholders + assign new ids.
  if (cloned.sections) {
    cloned.sections = cloned.sections.map((s) => resolveSection(s as Section, vars));

    // Seed facility coverage from profile.defaults_json.facilityCoverage if available.
    const seedCoverage = (profile?.defaults_json as any)?.facilityCoverage as
      | FacilityCoverage
      | undefined;
    if (seedCoverage) {
      cloned.sections = cloned.sections.map((s) =>
        s.coverage
          ? {
              ...s,
              coverage: {
                totalCount: seedCoverage.totalCount ?? s.coverage.totalCount,
                rows:
                  seedCoverage.rows && seedCoverage.rows.length > 0
                    ? seedCoverage.rows.map((r) => ({ ...r, id: r.id ?? newId() }))
                    : s.coverage.rows,
                notes: seedCoverage.notes ?? s.coverage.notes,
              },
            }
          : s
      );
    }
  }

  // Signature page from profile + template defaults.
  if (cloned.signature) {
    cloned.signature.witnessClause = cloned.signature.witnessClause ?? DEFAULT_WITNESS_CLAUSE;
    cloned.signature.partyA = {
      legalName:
        profile?.vendor_legal_name ?? cloned.signature.partyA.legalName ?? VENDOR_DEFAULTS.legalName,
      signatoryName:
        profile?.vendor_signatory_name ?? cloned.signature.partyA.signatoryName ?? "",
      designation:
        profile?.vendor_signatory_title ?? cloned.signature.partyA.designation ?? "",
      date: cloned.signature.partyA.date,
    };
    cloned.signature.partyB = {
      legalName: profile?.client_legal_name ?? accountName,
      signatoryName: profile?.signatory_name ?? cloned.signature.partyB.signatoryName ?? "",
      designation: profile?.signatory_title ?? cloned.signature.partyB.designation ?? "",
      date: cloned.signature.partyB.date,
    };
  }

  // Addendum blocks: assign new ids; handle generation modes for pricing.
  if (cloned.blocks) {
    cloned.blocks = cloned.blocks.map((b): Block => {
      const next = { ...b, id: newId() } as Block;

      if (next.kind === "pricing_table") {
        if (mode === "auto_from_pricing" && pricing) {
          next.rows = pricingRowsFromInputs(pricing.data);
          next.currency = "INR";
          next.sourceVersionId = pricing.name;
          next.customized = false;
        } else if (mode === "structure_only") {
          next.rows = next.rows.map((r) => ({
            tier: r.tier,
            includedVisits: undefined,
            monthlyBase: undefined,
            overagePrice: undefined,
            monthlyTotal: undefined,
          }));
        } else if (mode === "selective_fill" && pricing) {
          next.rows = pricingRowsFromInputs(pricing.data);
          next.sourceVersionId = pricing.name;
        }
      }

      if (next.kind === "signature") {
        next.signatory = {
          ...next.signatory,
          legalName: profile?.client_legal_name ?? accountName,
          signatoryName: profile?.signatory_name ?? next.signatory.signatoryName,
          designation: profile?.signatory_title ?? next.signatory.designation,
        };
      }

      return next;
    });
  }

  cloned.meta = {
    title: fillPlaceholders(template.meta?.title, vars) || accountName,
    subtitle:
      profile?.preferred_subtitle ?? fillPlaceholders(template.meta?.subtitle, vars),
    effectiveDate: undefined,
  };

  return cloned;
}

// ---------- Tiptap helpers for rich seed content ----------

const text = (s: string): TiptapDoc => tiptapFromText(s);

function richDoc(blocks: any[]): TiptapDoc {
  return { type: "doc", content: blocks };
}
function p(...textNodes: string[]): any {
  return {
    type: "paragraph",
    content: textNodes.length
      ? textNodes.map((t) => ({ type: "text", text: t }))
      : undefined,
  };
}
function bulletList(items: string[]): any {
  return {
    type: "bulletList",
    content: items.map((it) => ({
      type: "listItem",
      content: [p(it)],
    })),
  };
}
function orderedList(items: string[]): any {
  return {
    type: "orderedList",
    content: items.map((it) => ({
      type: "listItem",
      content: [p(it)],
    })),
  };
}

// ---------- Refined MoU template ----------

function sub(number: string, title: string, body: TiptapDoc): SectionSubsection {
  return { id: newId(), number, title, body };
}

const defaultCoverageRows = (): FacilityCoverageRow[] => [];

export function emptyMouTemplate(): DocumentDoc {
  return {
    schemaVersion: 1,
    docType: "mou",
    meta: {
      title: "Memorandum of Understanding — {{accountName}}",
      subtitle: "{{productLine}}",
    },
    cover: {
      variant: "branded_split",
      title: "MEMORANDUM OF UNDERSTANDING",
      subtitle: "{{productLine}}",
      vendorParty: {
        legalName: VENDOR_DEFAULTS.legalName,
        address: VENDOR_DEFAULTS.address,
      },
      clientParty: { legalName: "{{accountName}}", address: "{{clientAddress}}" },
      divider: true,
      spacing: "normal",
      executionLocation: VENDOR_DEFAULTS.executionLocation,
    },
    sections: [
      {
        id: newId(),
        key: "parties",
        title: "Parties",
        body: richDoc([
          p(
            "First Party: {{vendorLegalName}}, a company registered under the Companies Act, 2013, having its registered office at {{vendorAddress}} (hereinafter referred to as \"{{vendorShortName}}\" or the \"First Party\")."
          ),
          p(
            "Second Party: {{clientLegalName}}, {{clientDescriptor}}, having its principal place of business at {{clientAddress}} (hereinafter referred to as \"{{accountName}}\" or the \"Second Party\")."
          ),
          p("This Memorandum of Understanding is entered into at {{executionLocation}}."),
        ]),
      },
      {
        id: newId(),
        key: "purpose",
        title: "Purpose",
        body: richDoc([
          p(
            "The purpose of this MoU is to establish a collaborative framework for the implementation of the HEALTHFLO HMS AI-Native Solution across {{accountName}}'s network of healthcare facilities. HEALTHFLO is designed to support clinical decision-making and improve patient care through data-driven insights while functioning strictly as a clinical decision support tool. This MoU defines the scope, trial arrangements, subscription models, and responsibilities of both parties."
          ),
        ]),
      },
      {
        id: newId(),
        key: "scope_of_work",
        title: "Scope of Work",
        body: emptyTiptap(),
        subsections: [
          sub(
            "3.1",
            "Trial Implementation",
            richDoc([
              p(
                "The parties will conduct a one-month, no-cost trial of the HEALTHFLO AI-Native Platform at a facility selected by {{accountName}}. During this trial period, {{vendorShortName}} will provide:"
              ),
              bulletList([
                "Free customization and configuration support to fine-tune workflows for the Second Party's clinical practice",
                "Integration with existing systems as feasible",
                "Training and technical support for clinical and operational staff",
                "Comprehensive system evaluation support",
              ]),
            ])
          ),
          sub(
            "3.2",
            "Coverage of Facilities",
            richDoc([
              p(
                "This MoU contemplates eventual deployment across {{accountName}}'s network of facilities. The total facility count and per-type breakdown are captured in the structured Coverage of Facilities section below and may be revised by mutual agreement."
              ),
            ])
          ),
          sub(
            "3.3",
            "Integration and Features",
            richDoc([
              p(
                "HEALTHFLO will integrate with the Second Party's existing systems using secure APIs and SSO, including:"
              ),
              bulletList([
                "Hospital Information Systems (HIS)",
                "Employee Management Systems (EMS)",
                "Electronic medical records",
                "Patient intake forms and appointment scheduling",
                "Clinical workflows tailored to the Second Party's practice",
                "AI-powered clinical decision support",
              ]),
            ])
          ),
        ],
        coverage: {
          totalCount: undefined,
          rows: defaultCoverageRows(),
          notes: undefined,
        },
      },
      {
        id: newId(),
        key: "trial_terms",
        title: "Trial Terms",
        body: richDoc([
          orderedList([
            "The one-month trial will commence on a mutually agreed start date at one site designated by {{accountName}}.",
            "{{vendorShortName}} will provide training to {{accountName}} staff and implement any required customizations free of cost during the trial period.",
            "{{accountName}} will provide necessary access to infrastructure, staff, and data to facilitate a comprehensive evaluation of the system.",
            "Both parties will collaborate to assess system performance and suitability for broader deployment.",
          ]),
        ]),
      },
      {
        id: newId(),
        key: "subscription_models",
        title: "Subscription Models",
        body: richDoc([
          p(
            "After the successful completion of the trial period, continued access to HEALTHFLO will be offered via monthly subscription structured by facility type:"
          ),
        ]),
        subsections: [
          sub(
            "5.1",
            "Large Hospitals (50+ beds)",
            richDoc([
              p("Full HEALTHFLO HMS AI Enterprise, including:"),
              bulletList([
                "Outpatient and inpatient modules",
                "Pharmacy integration",
                "Laboratory integration",
                "AI decision support for comprehensive care",
              ]),
            ])
          ),
          sub(
            "5.2",
            "Small Hospitals (<50 beds)",
            richDoc([
              p(
                "Full enterprise solution adapted for smaller-scale operations with all modules included."
              ),
            ])
          ),
          sub(
            "5.3",
            "Clinics (Primarily Outpatient)",
            richDoc([
              p(
                "OP module of HEALTHFLO with AI support for consultations and outpatient care."
              ),
            ])
          ),
          sub(
            "5.4",
            "Pricing",
            richDoc([
              p(
                "Pricing tiers and per-facility subscription rates will be detailed in an Addendum to this MoU."
              ),
            ])
          ),
        ],
      },
      {
        id: newId(),
        key: "data_privacy_security",
        title: "Data Privacy & Security",
        body: richDoc([
          orderedList([
            "Both parties commit to maintaining the highest standards of data privacy and security, including encryption at rest and in transit, role-based access controls, and compliance with applicable Indian laws and regulations.",
            "All AI-generated outputs are advisory and must be reviewed by licensed medical professionals. The Second Party acknowledges that HEALTHFLO is a clinical decision support tool and does not replace professional medical judgment.",
            "Both parties will ensure compliance with applicable healthcare data protection regulations and maintain audit trails for all system access and modifications.",
          ]),
        ]),
      },
      {
        id: newId(),
        key: "confidentiality_ip",
        title: "Confidentiality & Intellectual Property",
        body: richDoc([
          orderedList([
            "All proprietary information exchanged during the collaboration shall be kept confidential and used solely for the purposes of this MoU.",
            "{{vendorShortName}} retains ownership of all intellectual property relating to HEALTHFLO, including software, algorithms, and AI models.",
            "{{accountName}} retains ownership of all patient data and clinical information generated during the use of the system.",
          ]),
        ]),
      },
      {
        id: newId(),
        key: "roles_responsibilities",
        title: "Roles & Responsibilities",
        body: emptyTiptap(),
        subsections: [
          sub(
            "8.1",
            "{{vendorShortName}} Responsibilities",
            richDoc([
              bulletList([
                "Provide and support the HEALTHFLO software and integration services",
                "Customize workflows as needed during the trial at no additional cost",
                "Offer comprehensive training and ongoing technical support",
                "Ensure system security, performance, and compliance with applicable standards",
              ]),
            ])
          ),
          sub(
            "8.2",
            "{{accountName}} Responsibilities",
            richDoc([
              bulletList([
                "Provide access to facilities, systems, staff, and data necessary for implementation",
                "Ensure that licensed clinicians review all AI-generated recommendations before use",
                "Provide feedback and participate in joint governance meetings",
                "Ensure staff training and adoption of the system across designated facilities",
              ]),
            ])
          ),
        ],
      },
      {
        id: newId(),
        key: "term_termination",
        title: "Term & Termination",
        body: richDoc([
          orderedList([
            "This MoU will be effective from the date of execution and shall remain in force for a period of twelve (12) months from the Effective Date, unless terminated earlier in accordance with the provisions hereof.",
            "Either party may terminate this MoU with thirty (30) days written notice to the other party.",
            "Either party may terminate this MoU immediately in case of material breach by the other party, provided that the breaching party fails to cure such breach within fifteen (15) days of written notice.",
          ]),
        ]),
      },
      {
        id: newId(),
        key: "dispute_resolution",
        title: "Dispute Resolution",
        body: richDoc([
          orderedList([
            "Any disputes arising in relation to this MoU shall first be addressed through direct negotiation between the parties in good faith.",
            "If the dispute cannot be resolved through negotiation within thirty (30) days, the parties shall attempt resolution through mediation.",
            "Failing resolution through mediation, any disputes shall be settled through arbitration in accordance with the Arbitration and Conciliation Act, 1996.",
            "The seat of arbitration and the exclusive jurisdiction for any court proceedings shall be {{governingCity}}, {{governingState}}, India.",
          ]),
        ]),
      },
      {
        id: newId(),
        key: "governing_law",
        title: "Governing Law",
        body: richDoc([
          p(
            "This MoU shall be governed by and construed in accordance with the laws of India, and the courts of {{governingCity}}, {{governingState}} shall have exclusive jurisdiction over any matters arising hereunder."
          ),
        ]),
      },
      {
        id: newId(),
        key: "miscellaneous",
        title: "Miscellaneous",
        body: richDoc([
          orderedList([
            "This MoU constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, or agreements relating thereto.",
            "This MoU may be amended only by written agreement signed by both parties.",
            "If any provision of this MoU is held to be invalid or unenforceable, the remainder of this MoU shall remain in full force and effect.",
            "This MoU may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument.",
          ]),
        ]),
      },
    ],
    signature: {
      witnessClause: DEFAULT_WITNESS_CLAUSE,
      partyA: {
        legalName: VENDOR_DEFAULTS.legalName,
        signatoryName: "",
        designation: "",
      },
      partyB: { legalName: "{{accountName}}", signatoryName: "", designation: "" },
      effectiveDate: undefined,
      closingNote: "Signed in two counterparts, each Party retaining one.",
    },
  };
}

export function emptyAddendumTemplate(): DocumentDoc {
  return {
    schemaVersion: 1,
    docType: "pricing_addendum",
    meta: {
      title: "Pricing Addendum",
      subtitle: "{{accountName}}",
    },
    blocks: [
      { id: newId(), kind: "header", title: "Pricing Addendum", subtitle: "{{accountName}}" },
      {
        id: newId(),
        kind: "text",
        title: "Executive Summary",
        body: text(
          "This Addendum sets out the commercial terms applicable to the Services described in the MoU."
        ),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Network Overview",
        topic: "infrastructure",
        body: text("Deployment scope, hospital count, and rollout cadence."),
      },
      {
        id: newId(),
        kind: "pricing_table",
        title: "Subscription Tiers",
        currency: "INR",
        rows: [
          { tier: "Base" },
          { tier: "10% Off" },
          { tier: "20% Off" },
          { tier: "30% Off" },
          { tier: "40% Off" },
          { tier: "50% Off" },
        ],
      },
      {
        id: newId(),
        kind: "discount_summary",
        title: "Discount Summary",
        rows: [],
      },
      {
        id: newId(),
        kind: "comparison",
        title: "Savings Comparison",
        columns: ["Scenario", "Monthly", "Annual", "Savings"],
        rows: [],
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Infrastructure & Hosting",
        topic: "infrastructure",
        body: text("Cloud hosting, regions, and data residency."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Compliance",
        topic: "compliance",
        body: text("Applicable certifications and regulatory commitments."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Service Levels",
        topic: "sla",
        body: text("Uptime, response targets, and support windows."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Responsible AI & Governance",
        topic: "governance",
        body: text("Model governance, audit, and human-in-the-loop principles."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Notes & Disclaimers",
        topic: "notes",
        body: text("Pricing valid for 30 days from issue date unless extended."),
      },
      {
        id: newId(),
        kind: "signature",
        signatory: { legalName: "{{accountName}}", signatoryName: "", designation: "" },
      },
    ],
  };
}
