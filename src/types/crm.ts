// CRM Enums — match database enums exactly
export const CRM_ACCOUNT_TYPES = ["Hospital", "Clinic", "Doctor"] as const;
export type CrmAccountType = (typeof CRM_ACCOUNT_TYPES)[number];

export const CRM_SOURCES = ["Founder Network", "Outbound", "Referral", "Inbound", "Partner", "Event", "Existing Relationship"] as const;
export type CrmSource = (typeof CRM_SOURCES)[number];

export const CRM_ACCOUNT_STATUSES = ["Active", "Dormant", "Won Customer", "Lost", "Archived"] as const;
export type CrmAccountStatus = (typeof CRM_ACCOUNT_STATUSES)[number];

export const CRM_OPP_STAGES = ["Prospecting", "Discovery", "Demo", "Proposal", "Pricing", "Negotiation", "Won", "Lost"] as const;
export type CrmOppStage = (typeof CRM_OPP_STAGES)[number];

export const CRM_ACTIVITY_TYPES = ["Meeting", "Call", "Demo", "Email", "Note"] as const;
export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number];

export const CRM_TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
export type CrmTaskPriority = (typeof CRM_TASK_PRIORITIES)[number];

export const CRM_TASK_STATUSES = ["Open", "In Progress", "Done"] as const;
export type CrmTaskStatus = (typeof CRM_TASK_STATUSES)[number];

export const CRM_ITEM_TYPES = ["file", "link"] as const;
export type CrmItemType = (typeof CRM_ITEM_TYPES)[number];

// Row types
export interface CrmAccount {
  id: string;
  name: string;
  account_type: CrmAccountType;
  owner_id: string;
  source: CrmSource;
  referrer_name: string | null;
  geography: string | null;
  status: CrmAccountStatus;
  website: string | null;
  notes: string | null;
  linked_client_id: string | null;
  last_activity_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmContact {
  id: string;
  account_id: string;
  name: string;
  title: string | null;
  seniority: string | null;
  location: string | null;
  linkedin_url: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CrmOpportunity {
  id: string;
  account_id: string;
  name: string;
  stage: CrmOppStage;
  owner_id: string;
  expected_value: number | null;
  expected_close_date: string | null;
  next_step: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  account_id: string;
  activity_type: CrmActivityType;
  title: string | null;
  activity_date: string;
  contact_id: string | null;
  opportunity_id: string | null;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface CrmTask {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string;
  due_date: string;
  priority: CrmTaskPriority;
  status: CrmTaskStatus;
  account_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  activity_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CrmDocument {
  id: string;
  account_id: string;
  item_type: CrmItemType;
  title: string;
  url: string | null;
  file_path: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface CrmActivityAttachment {
  id: string;
  activity_id: string;
  item_type: CrmItemType;
  title: string;
  url: string | null;
  file_path: string | null;
  created_by: string;
  created_at: string;
}

// Insert types (omit generated fields)
export type CrmAccountInsert = Omit<CrmAccount, "id" | "created_at" | "updated_at" | "last_activity_at">;
export type CrmAccountUpdate = Partial<Omit<CrmAccount, "id" | "created_at" | "created_by">>;

export type CrmContactInsert = Omit<CrmContact, "id" | "created_at" | "updated_at">;
export type CrmContactUpdate = Partial<Omit<CrmContact, "id" | "created_at" | "created_by" | "account_id">>;

export type CrmOpportunityInsert = Omit<CrmOpportunity, "id" | "created_at" | "updated_at">;
export type CrmOpportunityUpdate = Partial<Omit<CrmOpportunity, "id" | "created_at" | "created_by" | "account_id">>;

export type CrmActivityInsert = Omit<CrmActivity, "id" | "created_at">;

export type CrmTaskInsert = Omit<CrmTask, "id" | "created_at" | "updated_at">;
export type CrmTaskUpdate = Partial<Omit<CrmTask, "id" | "created_at" | "created_by">>;

export type CrmDocumentInsert = Omit<CrmDocument, "id" | "created_at">;
export type CrmActivityAttachmentInsert = Omit<CrmActivityAttachment, "id" | "created_at">;
