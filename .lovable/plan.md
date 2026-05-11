
# Logo Library + Free-Placement Branding for Commercial Docs

## Goals

1. A reusable **logo library**: global HealthFlo/vendor logos shared across all accounts, plus a **per-account gallery** of client/partner logos.
2. The MoU/Pricing Addendum editor lets you **pick from the library** and **drag logos anywhere** on the cover, page header, and footer — with width and rotation control.
3. The PDF/DOCX export renders these logos at the exact positions you place them in the editor.
4. The branded-split cover ships as a one-click preset that closely matches the attached reference (Jeena Sikho + Nileflo split), with editor controls so you can still tweak.

## What's there today

- `commercial_account_profiles` already stores three logo paths (`primary_logo_path`, `secondary_logo_path`, `vendor_logo_path`) — single slots only, no library, no reuse across accounts.
- `AccountProfileForm` uploads each slot once; replacing one orphans the previous file.
- The export Edge Function imports `ImageRun` but never actually places any logos in the document.
- Cover schema has `vendorLogoRef` / `clientLogoRef` strings only — no position, size, or "additional logos".

## New concepts

### 1. Logo Library

New table `commercial_logos`:

- `id`, `scope` (`'global' | 'account'`), `account_id` (nullable for global), `label`, `file_path`, `kind` (`'vendor' | 'client' | 'partner' | 'other'`), `natural_width`, `natural_height`, `created_by`, timestamps.
- RLS: approved users can read all global + any account; only admins (or creator) can edit/delete global; account-scoped writable by approved users; only admins delete.
- Files continue to live in the existing `crm-files` bucket under `commercial-logos/{scope}/...`.

A new **Logo Library page** (admin) and an inline **Logo Picker** (used inside the document editor) both read from this table.

### 2. Logo placement model on documents

Extend `CoverPage`, plus add `pageHeader` and `footer` zones to `DocumentDoc`. Each zone holds an array of `LogoPlacement`:

```
LogoPlacement {
  id, logoId,            // reference to commercial_logos
  zone: 'cover' | 'header' | 'footer',
  xPct, yPct,            // 0-100 % of zone box (top-left anchor)
  widthPct,              // % of page content width
  rotation,              // degrees, default 0
  opacity,               // 0-1, default 1 (footer watermark uses 0.15)
  zIndex
}
```

Percentage-based coordinates keep placement consistent regardless of page size and survive PDF and DOCX export.

### 3. Editor: drag-and-drop canvas

- Each zone (cover, header, footer) renders as a fixed-aspect canvas in the editor.
- Logos render as `<img>` inside an absolutely positioned, draggable, resizable wrapper (use `react-rnd` or a lightweight custom hook on top of pointer events — no new heavy dependency).
- Toolbar per logo: bring-to-front, send-to-back, lock aspect, set width %, rotation slider, delete.
- "Add logo" opens the Logo Picker (search + filter by kind + scope; "Upload new" inline).
- The branded-split preset seeds two cover placements (vendor top-left of left column, client centered in left column, plus the orange divider element) so it matches the reference out of the box and remains tweakable.

### 4. Page header + footer watermark

- `pageHeader` defaults to: vendor logo top-left, client logo top-right (small, ~80px height), printed on every page except the cover.
- `footer` defaults to: vendor logo centered at 0.15 opacity (toggleable per-document).
- Both are stored on the document so per-doc overrides are possible; templates can ship defaults.

### 5. Export rendering

Edge Function (`commercial-doc-export`):

- Resolve every `logoId` → fetch the file once from storage as bytes; cache by id within a single request.
- DOCX: place logos via floating images (`anchor` with absolute positioning in EMUs); compute EMU offsets from `xPct/yPct/widthPct` against the section's content width and the header/footer/page heights. Use `behindDocument` for footer watermarks.
- PDF (pdf-lib): draw images with `drawImage` at computed `(x,y)` for cover; for header/footer, register a per-page hook that re-draws them on every page after content layout.
- Maintain aspect ratio from `natural_width/height` so we only need `widthPct`.

### 6. Backwards compatibility

- Existing `vendorLogoRef` / `clientLogoRef` strings on covers are auto-migrated on load: synthesized into `LogoPlacement[]` with sensible defaults matching today's centered/left layouts.
- No data loss; old documents still render.

## Technical section

```text
DB
  commercial_logos (new) ──┐
                           ├─< logoId on every LogoPlacement
  storage: crm-files/commercial-logos/{global|account/<id>}/<uuid>.<ext>

Schema (src/types/commercialDoc.ts)
  + LogoPlacement, LogoZone
  + CoverPage.logoPlacements: LogoPlacement[]
  + DocumentDoc.pageHeader?: { placements: LogoPlacement[]; showOnCover?: boolean }
  + DocumentDoc.footer?:     { placements: LogoPlacement[]; watermarkOpacity?: number }
  + Migration helper toPlacements(legacyCover) for existing docs

Hooks
  src/hooks/useCommercialLogos.ts
    useLogos({ scope, accountId })
    useUploadLogo(), useDeleteLogo(), useUpdateLogo()

UI
  src/components/commercial/LogoLibraryDialog.tsx        (browse + upload)
  src/components/commercial/LogoPicker.tsx               (inline picker)
  src/components/commercial/LogoCanvas.tsx               (drag/resize zone wrapper)
  src/components/commercial/PlacementToolbar.tsx        (per-logo controls)
  src/pages/admin/LogoLibraryPage.tsx                   (admin management)
  CommercialDocEditor.tsx
    + Cover tab: <LogoCanvas zone="cover" />
    + new "Header & Footer" tab with two LogoCanvas instances
    + "Apply branded-split preset" button

Export (supabase/functions/commercial-doc-export/index.ts)
  resolveLogos(doc) -> Map<logoId, Uint8Array + dims>
  DOCX: floating ImageRun with horizontalPosition/verticalPosition (EMU)
  PDF:  doc.drawImage with computed coords; per-page header/footer hook

Reference cover preset
  utils/coverPresets.ts -> brandedSplitPreset(): seeds cover placements + divider
```

## Out of scope (can be follow-ups)

- Snap-to-grid / alignment guides in the canvas (we'll start with free positioning + numeric inputs).
- SVG logo support (raster only — PNG/JPG; SVG would need rasterization in the edge function).
- Per-page individual placements (header/footer apply to all non-cover pages uniformly).

## Deliverables

1. New `commercial_logos` table + RLS + storage path convention.
2. Library UI (admin page) and reusable picker.
3. Drag-and-drop placement canvas in the document editor for cover/header/footer.
4. Schema extensions + auto-migration of legacy logo refs.
5. Export Edge Function renders all placements faithfully in PDF and DOCX.
6. Branded-split preset that matches the reference cover and is fully tweakable afterwards.
