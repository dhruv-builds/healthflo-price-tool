// Commercial Document Export — DOCX + PDF
// Renders the canonical DocumentDoc JSON to either DOCX (npm:docx) or PDF (npm:pdfmake).
// Both renderers walk the SAME doc structure to keep parity.
//
// POST { documentId: string, format: "pdf" | "docx" }
// Returns { url: string, file_path: string, format }

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageBreak,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "npm:docx@9.0.2";
import pdfMake from "npm:pdfmake@0.2.10/build/pdfmake.js";
import pdfFonts from "npm:pdfmake@0.2.10/build/vfs_fonts.js";

// pdfmake VFS wiring (Deno + npm interop)
// deno-lint-ignore no-explicit-any
(pdfMake as any).vfs =
  // deno-lint-ignore no-explicit-any
  (pdfFonts as any).pdfMake?.vfs ?? (pdfFonts as any).vfs ?? (pdfFonts as any).default?.vfs;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------- Types (mirrors src/types/commercialDoc.ts) ----------
type TiptapDoc = { type: "doc"; content?: TiptapNode[] };
type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

interface DocumentDoc {
  schemaVersion: 1;
  docType: "mou" | "pricing_addendum";
  meta: { title: string; subtitle?: string; effectiveDate?: string };
  cover?: any;
  sections?: any[];
  blocks?: any[];
  signature?: any;
}

// ---------- Tiptap helpers ----------
function tiptapToPlainParagraphs(doc?: TiptapDoc): { text: string; marks: string[] }[][] {
  // Returns array of paragraphs; each paragraph is array of runs.
  const out: { text: string; marks: string[] }[][] = [];
  const walkBlock = (node: TiptapNode) => {
    if (!node) return;
    if (node.type === "paragraph" || node.type === "heading") {
      out.push(collectRuns(node));
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      node.content?.forEach((li) => {
        const runs: { text: string; marks: string[] }[] = [];
        li.content?.forEach((p) => runs.push(...collectRuns(p)));
        // Prefix bullet/number marker
        const prefix = node.type === "bulletList" ? "• " : "1. ";
        out.push([{ text: prefix, marks: [] }, ...runs]);
      });
    } else if (node.content) {
      node.content.forEach(walkBlock);
    }
  };
  const collectRuns = (node: TiptapNode): { text: string; marks: string[] }[] => {
    const runs: { text: string; marks: string[] }[] = [];
    const walk = (n: TiptapNode) => {
      if (n.type === "text") {
        runs.push({ text: n.text ?? "", marks: (n.marks ?? []).map((m) => m.type) });
      } else if (n.content) {
        n.content.forEach(walk);
      }
    };
    node.content?.forEach(walk);
    return runs.length ? runs : [{ text: "", marks: [] }];
  };
  doc?.content?.forEach(walkBlock);
  if (!out.length) out.push([{ text: "", marks: [] }]);
  return out;
}

// ---------- DOCX renderer ----------
// Walks tiptap and emits Paragraphs that respect bullet/numbered list semantics
// using docx-js native numbering references (no manual "•" or "1." prefixes).
function tiptapToDocxBlocks(body?: TiptapDoc): Paragraph[] {
  if (!body) return [new Paragraph({ children: [new TextRun("")] })];
  const out: Paragraph[] = [];
  const runFromTextNode = (n: TiptapNode): TextRun =>
    new TextRun({
      text: n.text ?? "",
      bold: (n.marks ?? []).some((m) => m.type === "bold"),
      italics: (n.marks ?? []).some((m) => m.type === "italic"),
      underline: (n.marks ?? []).some((m) => m.type === "underline") ? {} : undefined,
    });
  const collectInline = (node: TiptapNode): TextRun[] => {
    const runs: TextRun[] = [];
    const walk = (n: TiptapNode) => {
      if (n.type === "text") runs.push(runFromTextNode(n));
      else if (n.content) n.content.forEach(walk);
    };
    node.content?.forEach(walk);
    return runs.length ? runs : [new TextRun("")];
  };
  const walkBlock = (node: TiptapNode, listCtx?: "bullet" | "number") => {
    if (!node) return;
    if (node.type === "paragraph" || node.type === "heading") {
      const opts: any = {
        spacing: { after: 120 },
        children: collectInline(node),
      };
      if (listCtx === "bullet") opts.numbering = { reference: "doc-bullets", level: 0 };
      else if (listCtx === "number") opts.numbering = { reference: "doc-numbers", level: 0 };
      out.push(new Paragraph(opts));
    } else if (node.type === "bulletList") {
      node.content?.forEach((li) => li.content?.forEach((p) => walkBlock(p, "bullet")));
    } else if (node.type === "orderedList") {
      node.content?.forEach((li) => li.content?.forEach((p) => walkBlock(p, "number")));
    } else if (node.content) {
      node.content.forEach((c) => walkBlock(c, listCtx));
    }
  };
  body.content?.forEach((c) => walkBlock(c));
  if (!out.length) out.push(new Paragraph({ children: [new TextRun("")] }));
  return out;
}

// Backward-compatible alias used by existing callers
function tiptapToDocxParagraphs(body?: TiptapDoc): Paragraph[] {
  return tiptapToDocxBlocks(body);
}

function makeDocxTable(headers: string[], rows: string[][], totalWidth = 9360): Table {
  const colCount = headers.length || (rows[0]?.length ?? 1);
  const colWidth = Math.floor(totalWidth / colCount);
  const colWidths = Array(colCount).fill(colWidth);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: colWidth, type: WidthType.DXA },
          borders,
          shading: { fill: "EFEFEF", type: ShadingType.CLEAR, color: "auto" },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        })
    ),
  });
  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: Array.from({ length: colCount }).map(
          (_, i) =>
            new TableCell({
              width: { size: colWidth, type: WidthType.DXA },
              borders,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(r[i] ?? "")] })],
            })
        ),
      })
  );
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: headers.length ? [headerRow, ...bodyRows] : bodyRows,
  });
}

function moneyStr(n: number | undefined, currency: string): string {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

function renderCoverDocx(cover: any, meta: any): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const variant = cover?.variant ?? "two_party_centered";
  const align = variant === "two_party_left" ? AlignmentType.LEFT : AlignmentType.CENTER;

  out.push(new Paragraph({ children: [new TextRun("")], spacing: { before: 1200 } }));
  out.push(
    new Paragraph({
      alignment: align,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: cover?.title ?? meta?.title ?? "", bold: true, size: 48 })],
    })
  );
  if (cover?.subtitle || meta?.subtitle) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 600 },
        children: [
          new TextRun({ text: cover?.subtitle ?? meta?.subtitle ?? "", italics: true, size: 28 }),
        ],
      })
    );
  }
  if (cover?.divider) {
    out.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "888888", space: 1 } },
        spacing: { before: 200, after: 600 },
        children: [new TextRun("")],
      })
    );
  }

  const partyParas = (label: string, party: any, alignOverride?: typeof AlignmentType.CENTER): Paragraph[] => {
    const a = alignOverride ?? align;
    const lines: Paragraph[] = [];
    lines.push(
      new Paragraph({
        alignment: a,
        children: [new TextRun({ text: label, bold: true, size: 22 })],
      })
    );
    lines.push(
      new Paragraph({
        alignment: a,
        children: [new TextRun({ text: party?.legalName ?? "", size: 26, bold: true })],
      })
    );
    if (party?.tagline) {
      lines.push(
        new Paragraph({
          alignment: a,
          children: [new TextRun({ text: party.tagline, italics: true, size: 20 })],
        })
      );
    }
    if (party?.address) {
      lines.push(
        new Paragraph({
          alignment: a,
          children: [new TextRun({ text: party.address, size: 20 })],
        })
      );
    }
    return lines;
  };

  if (variant === "branded_split") {
    // Two-column side-by-side parties (vendor | client)
    out.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF" },
                },
                children: partyParas("VENDOR", cover?.vendorParty, AlignmentType.CENTER),
              }),
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: partyParas("CLIENT", cover?.clientParty, AlignmentType.CENTER),
              }),
            ],
          }),
        ],
      })
    );
  } else {
    out.push(...partyParas("VENDOR", cover?.vendorParty));
    out.push(new Paragraph({ children: [new TextRun("")], spacing: { before: 200, after: 200 } }));
    out.push(
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: "AND", bold: true })],
      })
    );
    out.push(new Paragraph({ children: [new TextRun("")], spacing: { before: 200, after: 200 } }));
    out.push(...partyParas("CLIENT", cover?.clientParty));
  }

  if (cover?.executionLocation) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { before: 600 },
        children: [
          new TextRun({ text: `Executed at: ${cover.executionLocation}`, size: 22, italics: true }),
        ],
      })
    );
  }
  if (meta?.effectiveDate) {
    out.push(
      new Paragraph({
        alignment: align,
        spacing: { before: 200 },
        children: [new TextRun({ text: `Effective Date: ${meta.effectiveDate}`, size: 22 })],
      })
    );
  }
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function renderSectionsDocx(sections: any[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  sections.forEach((s, i) => {
    const num = i + 1;
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 160 },
        children: [new TextRun({ text: `${num}. ${s.title}`, bold: true, size: 30 })],
      })
    );
    out.push(...tiptapToDocxBlocks(s.body));

    // Facility coverage table
    if (s.coverage) {
      const cov = s.coverage;
      if (cov.totalCount != null) {
        out.push(
          new Paragraph({
            spacing: { before: 120, after: 80 },
            children: [
              new TextRun({ text: "Total facilities covered: ", bold: true }),
              new TextRun({ text: String(cov.totalCount) }),
            ],
          })
        );
      }
      if (cov.rows?.length) {
        out.push(
          makeDocxTable(
            ["Facility Type", "Count", "Notes"],
            cov.rows.map((r: any) => [
              r.label ?? "",
              r.count != null ? String(r.count) : "—",
              r.description ?? "",
            ])
          )
        );
      }
      if (cov.notes) out.push(...tiptapToDocxBlocks(cov.notes));
    }

    // Subsections (e.g., 3.1, 3.2)
    s.subsections?.forEach((ss: any, j: number) => {
      const number = ss.number ?? `${num}.${j + 1}`;
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: `${number} ${ss.title}`, bold: true, size: 26 })],
        })
      );
      out.push(...tiptapToDocxBlocks(ss.body));
    });
  });
  return out;
}

function renderBlocksDocx(blocks: any[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const b of blocks) {
    if (b.hidden) continue;
    switch (b.kind) {
      case "header":
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: b.title, bold: true, size: 32 })],
          })
        );
        if (b.subtitle) {
          out.push(
            new Paragraph({
              children: [new TextRun({ text: b.subtitle, italics: true })],
              spacing: { after: 200 },
            })
          );
        }
        break;
      case "text":
      case "narrative":
        if (b.title) {
          out.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 120 },
              children: [new TextRun({ text: b.title, bold: true, size: 26 })],
            })
          );
        }
        out.push(...tiptapToDocxParagraphs(b.body));
        break;
      case "pricing_table": {
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [new TextRun({ text: b.title, bold: true, size: 26 })],
          })
        );
        const headers = ["Tier", "Included Visits", "Monthly Base", "Overage", "Monthly Total"];
        const rows = (b.rows ?? []).map((r: any) => [
          r.tier ?? "",
          r.includedVisits != null ? String(r.includedVisits) : "—",
          moneyStr(r.monthlyBase, b.currency ?? "USD"),
          moneyStr(r.overagePrice, b.currency ?? "USD"),
          moneyStr(r.monthlyTotal, b.currency ?? "USD"),
        ]);
        out.push(makeDocxTable(headers, rows));
        break;
      }
      case "discount_summary": {
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [new TextRun({ text: b.title, bold: true, size: 26 })],
          })
        );
        const headers = ["Item", "Baseline", "Discounted", "Savings"];
        const rows = (b.rows ?? []).map((r: any) => [
          r.label,
          moneyStr(r.baseline, "USD"),
          moneyStr(r.discounted, "USD"),
          moneyStr(r.savings, "USD"),
        ]);
        out.push(makeDocxTable(headers, rows));
        break;
      }
      case "comparison":
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [new TextRun({ text: b.title, bold: true, size: 26 })],
          })
        );
        out.push(makeDocxTable(b.columns ?? [], b.rows ?? []));
        break;
      case "signature":
        out.push(...renderSignatoryDocx(b.signatory));
        break;
      case "custom_section":
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [new TextRun({ text: b.title, bold: true, size: 26 })],
          })
        );
        for (const p of b.primitives ?? []) out.push(...renderPrimitiveDocx(p));
        break;
    }
    out.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }));
  }
  return out;
}

function renderPrimitiveDocx(p: any): (Paragraph | Table)[] {
  switch (p.kind) {
    case "heading":
      return [
        new Paragraph({
          heading:
            p.level === 1
              ? HeadingLevel.HEADING_1
              : p.level === 2
              ? HeadingLevel.HEADING_2
              : HeadingLevel.HEADING_3,
          children: [new TextRun({ text: p.text, bold: true })],
        }),
      ];
    case "paragraph":
      return tiptapToDocxParagraphs(p.body);
    case "bullets":
    case "numbered":
      return p.items.map((item: TiptapDoc) => {
        const runs = tiptapToPlainParagraphs(item)[0] ?? [];
        return new Paragraph({
          numbering: {
            reference: p.kind === "bullets" ? "doc-bullets" : "doc-numbers",
            level: 0,
          },
          children: runs.map(
            (r) =>
              new TextRun({
                text: r.text,
                bold: r.marks.includes("bold"),
                italics: r.marks.includes("italic"),
              })
          ),
        });
      });
    case "callout":
    case "note_box":
      return [
        new Paragraph({
          shading: { fill: "F4F6FA", type: ShadingType.CLEAR, color: "auto" },
          border: {
            left: { style: BorderStyle.SINGLE, size: 18, color: "5B8DEF", space: 4 },
          },
          children: tiptapToDocxParagraphs(p.body).flatMap((para) => para.options?.children ?? []),
        }),
      ];
    case "two_column": {
      const leftP = tiptapToDocxParagraphs(p.left);
      const rightP = tiptapToDocxParagraphs(p.right);
      return [
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 4680, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: leftP,
                }),
                new TableCell({
                  width: { size: 4680, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: rightP,
                }),
              ],
            }),
          ],
        }),
      ];
    }
    case "simple_table":
      return [makeDocxTable(p.headers ?? [], p.rows ?? [])];
    case "image":
      // Images are referenced by storage path; we skip embedding to keep the function light.
      // Render a placeholder line so layout stays sane.
      return [
        new Paragraph({
          children: [new TextRun({ text: `[Image: ${p.assetPath}]`, italics: true })],
        }),
      ];
    default:
      return [];
  }
}

function renderSignatoryDocx(sig: any): Paragraph[] {
  if (!sig) return [];
  return [
    new Paragraph({
      spacing: { before: 400, after: 100 },
      children: [new TextRun({ text: sig.legalName ?? "", bold: true })],
    }),
    new Paragraph({
      spacing: { before: 600, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
      children: [new TextRun("")],
    }),
    new Paragraph({ children: [new TextRun({ text: sig.signatoryName ?? "" })] }),
    new Paragraph({ children: [new TextRun({ text: sig.designation ?? "", italics: true })] }),
    sig.date
      ? new Paragraph({ children: [new TextRun({ text: `Date: ${sig.date}` })] })
      : new Paragraph({ children: [new TextRun("")] }),
  ];
}

function renderSignaturePageDocx(sig: any): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  out.push(new Paragraph({ children: [new PageBreak()] }));
  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "Signatures", bold: true })],
    })
  );
  if (sig.effectiveDate) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: `Effective Date: ${sig.effectiveDate}` })],
      })
    );
  }
  out.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: renderSignatoryDocx(sig.partyA),
            }),
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: renderSignatoryDocx(sig.partyB),
            }),
          ],
        }),
      ],
    })
  );
  if (sig.closingNote) {
    out.push(
      new Paragraph({
        spacing: { before: 400 },
        children: [new TextRun({ text: sig.closingNote, italics: true })],
      })
    );
  }
  return out;
}

async function renderDocx(doc: DocumentDoc): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [];
  if (doc.cover) children.push(...renderCoverDocx(doc.cover, doc.meta));
  if (doc.sections?.length) children.push(...renderSectionsDocx(doc.sections));
  if (doc.blocks?.length) children.push(...renderBlocksDocx(doc.blocks));
  if (doc.signature) children.push(...renderSignaturePageDocx(doc.signature));
  if (!children.length) children.push(new Paragraph({ children: [new TextRun(doc.meta?.title ?? "Document")] }));

  const document = new Document({
    creator: "HealthFlo",
    title: doc.meta?.title ?? "Document",
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });
  const buf = await Packer.toBuffer(document);
  return new Uint8Array(buf);
}

// ---------- PDF renderer (pdfmake) ----------
function tiptapToPdfText(body?: TiptapDoc): any[] {
  const paras = tiptapToPlainParagraphs(body);
  return paras.map((runs) => ({
    text: runs.map((r) => ({
      text: r.text,
      bold: r.marks.includes("bold"),
      italics: r.marks.includes("italic"),
      decoration: r.marks.includes("underline") ? "underline" : undefined,
    })),
    margin: [0, 0, 0, 6],
  }));
}

function pdfTable(headers: string[], rows: string[][]): any {
  return {
    table: {
      headerRows: headers.length ? 1 : 0,
      widths: Array((headers.length || rows[0]?.length || 1)).fill("*"),
      body: [
        ...(headers.length
          ? [headers.map((h) => ({ text: h, bold: true, fillColor: "#EFEFEF" }))]
          : []),
        ...rows.map((r) => r.map((c) => ({ text: c }))),
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 4, 0, 12],
  };
}

function renderCoverPdf(cover: any, meta: any): any[] {
  const out: any[] = [
    { text: "", margin: [0, 80, 0, 0] },
    {
      text: cover?.title ?? meta?.title ?? "",
      fontSize: 28,
      bold: true,
      alignment: "center",
      margin: [0, 0, 0, 8],
    },
  ];
  if (cover?.subtitle || meta?.subtitle) {
    out.push({
      text: cover?.subtitle ?? meta?.subtitle ?? "",
      italics: true,
      alignment: "center",
      fontSize: 14,
      margin: [0, 0, 0, 24],
    });
  }
  if (cover?.divider) {
    out.push({
      canvas: [{ type: "line", x1: 60, y1: 0, x2: 480, y2: 0, lineWidth: 0.7, lineColor: "#888" }],
      margin: [0, 0, 0, 24],
    });
  }
  const party = (label: string, p: any) => [
    { text: label, bold: true, alignment: "center", margin: [0, 8, 0, 2] },
    { text: p?.legalName ?? "", alignment: "center", fontSize: 14 },
    p?.address ? { text: p.address, alignment: "center", fontSize: 10 } : null,
  ].filter(Boolean);
  out.push(...party("VENDOR", cover?.vendorParty));
  out.push({ text: "AND", bold: true, alignment: "center", margin: [0, 12, 0, 12] });
  out.push(...party("CLIENT", cover?.clientParty));
  if (meta?.effectiveDate) {
    out.push({
      text: `Effective Date: ${meta.effectiveDate}`,
      alignment: "center",
      margin: [0, 32, 0, 0],
    });
  }
  out.push({ text: "", pageBreak: "after" });
  return out;
}

function renderSectionsPdf(sections: any[]): any[] {
  const out: any[] = [];
  sections.forEach((s, i) => {
    out.push({ text: `${i + 1}. ${s.title}`, fontSize: 16, bold: true, margin: [0, 12, 0, 8] });
    out.push(...tiptapToPdfText(s.body));
  });
  return out;
}

function renderBlocksPdf(blocks: any[]): any[] {
  const out: any[] = [];
  for (const b of blocks) {
    if (b.hidden) continue;
    switch (b.kind) {
      case "header":
        out.push({ text: b.title, fontSize: 18, bold: true, margin: [0, 12, 0, 4] });
        if (b.subtitle) out.push({ text: b.subtitle, italics: true, margin: [0, 0, 0, 8] });
        break;
      case "text":
      case "narrative":
        if (b.title) out.push({ text: b.title, fontSize: 13, bold: true, margin: [0, 8, 0, 4] });
        out.push(...tiptapToPdfText(b.body));
        break;
      case "pricing_table":
        out.push({ text: b.title, fontSize: 13, bold: true, margin: [0, 8, 0, 4] });
        out.push(
          pdfTable(
            ["Tier", "Included Visits", "Monthly Base", "Overage", "Monthly Total"],
            (b.rows ?? []).map((r: any) => [
              r.tier ?? "",
              r.includedVisits != null ? String(r.includedVisits) : "—",
              moneyStr(r.monthlyBase, b.currency ?? "USD"),
              moneyStr(r.overagePrice, b.currency ?? "USD"),
              moneyStr(r.monthlyTotal, b.currency ?? "USD"),
            ])
          )
        );
        break;
      case "discount_summary":
        out.push({ text: b.title, fontSize: 13, bold: true, margin: [0, 8, 0, 4] });
        out.push(
          pdfTable(
            ["Item", "Baseline", "Discounted", "Savings"],
            (b.rows ?? []).map((r: any) => [
              r.label,
              moneyStr(r.baseline, "USD"),
              moneyStr(r.discounted, "USD"),
              moneyStr(r.savings, "USD"),
            ])
          )
        );
        break;
      case "comparison":
        out.push({ text: b.title, fontSize: 13, bold: true, margin: [0, 8, 0, 4] });
        out.push(pdfTable(b.columns ?? [], b.rows ?? []));
        break;
      case "signature":
        out.push(...renderSignatoryPdf(b.signatory));
        break;
      case "custom_section":
        out.push({ text: b.title, fontSize: 13, bold: true, margin: [0, 8, 0, 4] });
        for (const p of b.primitives ?? []) out.push(...renderPrimitivePdf(p));
        break;
    }
  }
  return out;
}

function renderPrimitivePdf(p: any): any[] {
  switch (p.kind) {
    case "heading":
      return [
        {
          text: p.text,
          fontSize: p.level === 1 ? 16 : p.level === 2 ? 14 : 12,
          bold: true,
          margin: [0, 6, 0, 4],
        },
      ];
    case "paragraph":
      return tiptapToPdfText(p.body);
    case "bullets":
      return [{ ul: p.items.map((it: TiptapDoc) => tiptapToPdfText(it)[0] ?? "") }];
    case "numbered":
      return [{ ol: p.items.map((it: TiptapDoc) => tiptapToPdfText(it)[0] ?? "") }];
    case "callout":
    case "note_box":
      return [
        {
          table: {
            widths: ["*"],
            body: [[{ stack: tiptapToPdfText(p.body), fillColor: "#F4F6FA" }]],
          },
          layout: "noBorders",
          margin: [0, 6, 0, 6],
        },
      ];
    case "two_column":
      return [
        {
          columns: [
            { width: "*", stack: tiptapToPdfText(p.left) },
            { width: "*", stack: tiptapToPdfText(p.right) },
          ],
          columnGap: 16,
          margin: [0, 4, 0, 8],
        },
      ];
    case "simple_table":
      return [pdfTable(p.headers ?? [], p.rows ?? [])];
    case "image":
      return [{ text: `[Image: ${p.assetPath}]`, italics: true, margin: [0, 4, 0, 4] }];
    default:
      return [];
  }
}

function renderSignatoryPdf(sig: any): any[] {
  if (!sig) return [];
  return [
    { text: sig.legalName ?? "", bold: true, margin: [0, 16, 0, 4] },
    {
      canvas: [
        { type: "line", x1: 0, y1: 24, x2: 220, y2: 24, lineWidth: 0.7, lineColor: "#000" },
      ],
    },
    { text: sig.signatoryName ?? "", margin: [0, 4, 0, 0] },
    { text: sig.designation ?? "", italics: true },
    sig.date ? { text: `Date: ${sig.date}` } : { text: "" },
  ];
}

function renderSignaturePagePdf(sig: any): any[] {
  return [
    { text: "", pageBreak: "before" },
    { text: "Signatures", fontSize: 18, bold: true, alignment: "center", margin: [0, 0, 0, 16] },
    sig.effectiveDate
      ? { text: `Effective Date: ${sig.effectiveDate}`, alignment: "center", margin: [0, 0, 0, 24] }
      : { text: "" },
    {
      columns: [
        { width: "*", stack: renderSignatoryPdf(sig.partyA) },
        { width: "*", stack: renderSignatoryPdf(sig.partyB) },
      ],
      columnGap: 32,
    },
    sig.closingNote ? { text: sig.closingNote, italics: true, margin: [0, 24, 0, 0] } : { text: "" },
  ];
}

async function renderPdf(doc: DocumentDoc): Promise<Uint8Array> {
  const content: any[] = [];
  if (doc.cover) content.push(...renderCoverPdf(doc.cover, doc.meta));
  if (doc.sections?.length) content.push(...renderSectionsPdf(doc.sections));
  if (doc.blocks?.length) content.push(...renderBlocksPdf(doc.blocks));
  if (doc.signature) content.push(...renderSignaturePagePdf(doc.signature));
  if (!content.length) content.push({ text: doc.meta?.title ?? "Document" });

  const docDef = {
    pageSize: "LETTER",
    pageMargins: [60, 60, 60, 60],
    defaultStyle: { font: "Roboto", fontSize: 10 },
    info: { title: doc.meta?.title ?? "Document", creator: "HealthFlo" },
    content,
  };

  return await new Promise<Uint8Array>((resolve, reject) => {
    try {
      // deno-lint-ignore no-explicit-any
      const pdfDoc = (pdfMake as any).createPdf(docDef);
      pdfDoc.getBuffer((buf: Uint8Array) => resolve(buf));
    } catch (e) {
      reject(e);
    }
  });
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const documentId = String(body.documentId ?? "");
    const format = String(body.format ?? "");
    if (!documentId || (format !== "pdf" && format !== "docx")) {
      return new Response(JSON.stringify({ error: "documentId and format (pdf|docx) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for db + storage
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load document (RLS-aware via user client to ensure access)
    const { data: docRow, error: docErr } = await userClient
      .from("commercial_documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr || !docRow) {
      return new Response(JSON.stringify({ error: "Document not found or no access" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = docRow.content_json as DocumentDoc;

    let bytes: Uint8Array;
    let contentType: string;
    let ext: string;
    if (format === "docx") {
      bytes = await renderDocx(content);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      ext = "docx";
    } else {
      bytes = await renderPdf(content);
      contentType = "application/pdf";
      ext = "pdf";
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeTitle = (docRow.title ?? "document").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    const filePath = `commercial/${docRow.account_id}/exports/${documentId}/${ts}_${safeTitle}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("crm-files")
      .upload(filePath, bytes, { contentType, upsert: false });
    if (upErr) throw upErr;

    const { error: insErr } = await admin.from("commercial_document_exports").insert({
      document_id: documentId,
      format,
      file_path: filePath,
      file_size_bytes: bytes.byteLength,
      exported_by: userId,
    });
    if (insErr) throw insErr;

    await admin
      .from("commercial_documents")
      .update({ exported_at: new Date().toISOString() })
      .eq("id", documentId);

    const { data: signed, error: sErr } = await admin.storage
      .from("crm-files")
      .createSignedUrl(filePath, 60 * 60);
    if (sErr) throw sErr;

    return new Response(
      JSON.stringify({
        signedUrl: signed.signedUrl,
        filePath,
        url: signed.signedUrl,
        file_path: filePath,
        format,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("commercial-doc-export error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
