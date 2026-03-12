

# Fix: Scrollable Dialog Content for All CRM Forms

## Problem
The `DialogContent` component uses fixed centering (`top-[50%] translate-y-[-50%]`), so when form content exceeds viewport height, it overflows without scrolling. The Save/Cancel buttons become unreachable.

## Solution
Update `DialogContent` in `src/components/ui/dialog.tsx` to add `max-h-[90vh] overflow-y-auto` so all dialogs become scrollable when their content exceeds viewport height. This fixes every dialog globally — AccountForm, ContactForm, ActivityForm, TaskForm, DocumentForm, and OpportunitySection.

### Change
**`src/components/ui/dialog.tsx`** — Add `max-h-[90vh] overflow-y-auto` to the DialogContent className string (line 39).

This is a single-line class addition that fixes the scroll issue across all dialogs app-wide, including any future ones.

