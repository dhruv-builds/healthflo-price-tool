// Generates the initial DocumentDoc for a new draft from a template
// + selected generation mode + linked pricing version + account profile.

import { PricingInputs } from "@/types/pricing";
import { calculateAllTiers } from "@/utils/calculations";
import {
  AccountProfile,
  Block,
  CommercialGenerationMode,
  DocumentDoc,
  PricingRow,
  Section,
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

const fillPlaceholders = (s: string | undefined, accountName: string): string =>
  (s ?? "").replace(/\{\{accountName\}\}/g, accountName);

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

  // Apply account profile to cover.
  if (cloned.cover) {
    cloned.cover.title = fillPlaceholders(cloned.cover.title, accountName);
    cloned.cover.subtitle =
      profile?.preferred_subtitle ??
      fillPlaceholders(cloned.cover.subtitle, accountName);
    if (profile?.client_legal_name) {
      cloned.cover.clientParty.legalName = profile.client_legal_name;
    } else if (!cloned.cover.clientParty.legalName) {
      cloned.cover.clientParty.legalName = accountName;
    }
    if (profile?.address) {
      cloned.cover.clientParty.address = [
        profile.address,
        [profile.city, profile.state].filter(Boolean).join(", "),
        profile.country,
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (profile?.vendor_legal_name) {
      cloned.cover.vendorParty.legalName = profile.vendor_legal_name;
    }
    if (profile?.vendor_logo_path) cloned.cover.vendorLogoRef = profile.vendor_logo_path;
    if (profile?.primary_logo_path) cloned.cover.clientLogoRef = profile.primary_logo_path;
  }

  // MoU sections — map any `{{accountName}}` placeholders.
  if (cloned.sections) {
    cloned.sections = cloned.sections.map((s) => ({
      ...s,
      id: newId(),
    })) as Section[];
  }

  // Signature page from profile.
  if (cloned.signature) {
    cloned.signature.partyA = {
      legalName: profile?.vendor_legal_name ?? cloned.signature.partyA.legalName,
      signatoryName:
        profile?.vendor_signatory_name ?? cloned.signature.partyA.signatoryName,
      designation:
        profile?.vendor_signatory_title ?? cloned.signature.partyA.designation,
      date: cloned.signature.partyA.date,
    };
    cloned.signature.partyB = {
      legalName: profile?.client_legal_name ?? accountName,
      signatoryName: profile?.signatory_name ?? cloned.signature.partyB.signatoryName,
      designation: profile?.signatory_title ?? cloned.signature.partyB.designation,
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
          // Leave row scaffold but blank out values so checklist surfaces them.
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
    title: fillPlaceholders(template.meta?.title, accountName) || accountName,
    subtitle: profile?.preferred_subtitle ?? template.meta?.subtitle,
    effectiveDate: undefined,
  };

  return cloned;
}

// Build a minimal MoU template skeleton (used when no template is selected).
export function emptyMouTemplate(): DocumentDoc {
  const sectionDefaults: Record<string, string> = {
    parties:
      "This Memorandum of Understanding (this “MoU”) is entered into between the Parties identified on the cover page.",
    purpose:
      "The Parties intend to collaborate on the deployment of HealthFlo's services for the Client.",
    scope_of_work:
      "HealthFlo shall provide its software platform, configuration, and support per the agreed Subscription Model.",
    trial_terms: "A no-cost trial period may be offered, subject to scope agreed in writing.",
    subscription_models:
      "Subscription tiers, included visits, overage pricing, and discounts are detailed in the Pricing Addendum.",
    data_privacy_security:
      "Both Parties shall comply with applicable data protection laws and HealthFlo's security standards.",
    confidentiality_ip:
      "All Confidential Information shall remain the property of the disclosing Party. HealthFlo retains all IP in its platform.",
    roles_responsibilities:
      "HealthFlo shall provide the platform; the Client shall provide operational data and required cooperation.",
    term_termination:
      "This MoU shall remain in effect for the term agreed in the Pricing Addendum unless terminated earlier per its provisions.",
    dispute_resolution:
      "Disputes shall first be resolved by good-faith negotiation, failing which by arbitration as agreed.",
    governing_law:
      "This MoU shall be governed by the laws of the jurisdiction agreed by the Parties in writing.",
    miscellaneous:
      "This MoU constitutes the entire understanding of the Parties on its subject matter.",
  };

  return {
    schemaVersion: 1,
    docType: "mou",
    meta: { title: "Memorandum of Understanding", subtitle: "{{accountName}}" },
    cover: {
      variant: "two_party_centered",
      title: "Memorandum of Understanding",
      subtitle: "Between HealthFlo and {{accountName}}",
      vendorParty: { legalName: "HealthFlo Technologies", address: "" },
      clientParty: { legalName: "{{accountName}}", address: "" },
      divider: true,
      spacing: "normal",
    },
    sections: (
      [
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
      ] as const
    ).map((key) => ({
      id: newId(),
      key,
      title: key
        .split("_")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" "),
      body: tiptapFromText(sectionDefaults[key] ?? ""),
    })),
    signature: {
      partyA: { legalName: "HealthFlo Technologies", signatoryName: "", designation: "" },
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
        body: tiptapFromText(
          "This Addendum sets out the commercial terms applicable to the Services described in the MoU."
        ),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Network Overview",
        topic: "infrastructure",
        body: tiptapFromText("Deployment scope, hospital count, and rollout cadence."),
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
        body: tiptapFromText("Cloud hosting, regions, and data residency."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Compliance",
        topic: "compliance",
        body: tiptapFromText("Applicable certifications and regulatory commitments."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Service Levels",
        topic: "sla",
        body: tiptapFromText("Uptime, response targets, and support windows."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Responsible AI & Governance",
        topic: "governance",
        body: tiptapFromText("Model governance, audit, and human-in-the-loop principles."),
      },
      {
        id: newId(),
        kind: "narrative",
        title: "Notes & Disclaimers",
        topic: "notes",
        body: tiptapFromText("Pricing valid for 30 days from issue date unless extended."),
      },
      {
        id: newId(),
        kind: "signature",
        signatory: { legalName: "{{accountName}}", signatoryName: "", designation: "" },
      },
    ],
  };
}
