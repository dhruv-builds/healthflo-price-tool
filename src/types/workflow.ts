export const WORKFLOW_STAGES = [
  "Lead",
  "Discovery",
  "Pricing",
  "Negotiation",
  "MoU",
  "Pricing Agreement",
  "Onboarding",
  "Live",
  "Collections",
  "Lost",
] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const WORKFLOW_BLOCKER_TYPES = [
  "Awaiting Customer",
  "Awaiting Internal",
  "Legal",
  "Pricing",
  "Technical",
  "Other",
] as const;
export type WorkflowBlockerType = (typeof WORKFLOW_BLOCKER_TYPES)[number];

export const WORKFLOW_SUGGESTION_STATUSES = ["pending", "accepted", "dismissed"] as const;
export type WorkflowSuggestionStatus = (typeof WORKFLOW_SUGGESTION_STATUSES)[number];

export const WORKFLOW_SEED_CONFIDENCE = ["confirmed", "inferred", "needs_review"] as const;
export type WorkflowSeedConfidence = (typeof WORKFLOW_SEED_CONFIDENCE)[number];

export interface WorkflowRecord {
  id: string;
  account_id: string;
  stage: WorkflowStage;
  owner_id: string | null;
  next_action_title: string | null;
  next_action_due_at: string | null;
  is_blocked: boolean;
  blocker_type: WorkflowBlockerType | null;
  blocker_reason: string | null;
  linked_client_id: string | null;
  reference_version_id: string | null;
  stage_entered_at: string;
  last_reviewed_at: string | null;
  seed_confidence: WorkflowSeedConfidence | null;
  seed_notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowChecklistItem {
  id: string;
  workflow_id: string;
  stage: WorkflowStage;
  item_key: string;
  label: string;
  is_required: boolean;
  is_complete: boolean;
  completed_at: string | null;
  completed_by: string | null;
  evidence_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStageHistoryRow {
  id: string;
  workflow_id: string;
  from_stage: WorkflowStage | null;
  to_stage: WorkflowStage;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  source: string;
}

export interface WorkflowCollaborator {
  id: string;
  workflow_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface WorkflowStageSuggestion {
  id: string;
  workflow_id: string;
  suggested_stage: WorkflowStage;
  reason_code: string;
  reason_text: string | null;
  status: WorkflowSuggestionStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

// Stale stage threshold (days)
export const STALE_STAGE_DAYS = 14;

// Stages that require a reference pricing version
export const REQUIRES_PRICING_REFERENCE: WorkflowStage[] = ["Pricing", "Negotiation", "Pricing Agreement"];

export type AttentionReason =
  | "next_action_overdue"
  | "next_action_missing"
  | "blocked"
  | "stale_stage"
  | "missing_pricing_reference";

export function getAttentionReasons(w: WorkflowRecord): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const now = Date.now();
  if (w.is_blocked) reasons.push("blocked");
  if (!w.next_action_title) reasons.push("next_action_missing");
  if (w.next_action_due_at && new Date(w.next_action_due_at).getTime() < now) {
    reasons.push("next_action_overdue");
  }
  const enteredAt = new Date(w.stage_entered_at).getTime();
  if ((now - enteredAt) / (1000 * 60 * 60 * 24) > STALE_STAGE_DAYS) reasons.push("stale_stage");
  if (REQUIRES_PRICING_REFERENCE.includes(w.stage) && !w.reference_version_id) {
    reasons.push("missing_pricing_reference");
  }
  return reasons;
}

export const ATTENTION_REASON_LABELS: Record<AttentionReason, string> = {
  next_action_overdue: "Next action overdue",
  next_action_missing: "No next action set",
  blocked: "Blocked",
  stale_stage: `Stage stale (>${STALE_STAGE_DAYS}d)`,
  missing_pricing_reference: "Pricing reference missing",
};
