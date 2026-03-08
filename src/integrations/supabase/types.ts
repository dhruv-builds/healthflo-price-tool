export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      crm_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["crm_account_type"]
          created_at: string
          created_by: string
          geography: string | null
          id: string
          last_activity_at: string | null
          linked_client_id: string | null
          name: string
          notes: string | null
          owner_id: string
          referrer_name: string | null
          source: Database["public"]["Enums"]["crm_source"]
          status: Database["public"]["Enums"]["crm_account_status"]
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["crm_account_type"]
          created_at?: string
          created_by: string
          geography?: string | null
          id?: string
          last_activity_at?: string | null
          linked_client_id?: string | null
          name: string
          notes?: string | null
          owner_id: string
          referrer_name?: string | null
          source: Database["public"]["Enums"]["crm_source"]
          status?: Database["public"]["Enums"]["crm_account_status"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["crm_account_type"]
          created_at?: string
          created_by?: string
          geography?: string | null
          id?: string
          last_activity_at?: string | null
          linked_client_id?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          referrer_name?: string | null
          source?: Database["public"]["Enums"]["crm_source"]
          status?: Database["public"]["Enums"]["crm_account_status"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_accounts_linked_client_id_fkey"
            columns: ["linked_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          account_id: string
          activity_date: string
          activity_type: Database["public"]["Enums"]["crm_activity_type"]
          contact_id: string | null
          created_at: string
          created_by: string
          id: string
          notes: string
          opportunity_id: string | null
          title: string | null
        }
        Insert: {
          account_id: string
          activity_date: string
          activity_type: Database["public"]["Enums"]["crm_activity_type"]
          contact_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes: string
          opportunity_id?: string | null
          title?: string | null
        }
        Update: {
          account_id?: string
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["crm_activity_type"]
          contact_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string
          opportunity_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activity_attachments: {
        Row: {
          activity_id: string
          created_at: string
          created_by: string
          file_path: string | null
          id: string
          item_type: Database["public"]["Enums"]["crm_item_type"]
          title: string
          url: string | null
        }
        Insert: {
          activity_id: string
          created_at?: string
          created_by: string
          file_path?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["crm_item_type"]
          title: string
          url?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string
          created_by?: string
          file_path?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["crm_item_type"]
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "crm_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          seniority: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          seniority?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          seniority?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_documents: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          description: string | null
          file_path: string | null
          id: string
          item_type: Database["public"]["Enums"]["crm_item_type"]
          title: string
          url: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          description?: string | null
          file_path?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["crm_item_type"]
          title: string
          url?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          file_path?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["crm_item_type"]
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          expected_close_date: string | null
          expected_value: number | null
          id: string
          name: string
          next_step: string | null
          notes: string | null
          owner_id: string
          stage: Database["public"]["Enums"]["crm_opp_stage"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          name: string
          next_step?: string | null
          notes?: string | null
          owner_id: string
          stage?: Database["public"]["Enums"]["crm_opp_stage"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          expected_close_date?: string | null
          expected_value?: number | null
          id?: string
          name?: string
          next_step?: string | null
          notes?: string | null
          owner_id?: string
          stage?: Database["public"]["Enums"]["crm_opp_stage"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          account_id: string | null
          activity_id: string | null
          assignee_id: string
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          opportunity_id: string | null
          priority: Database["public"]["Enums"]["crm_task_priority"]
          status: Database["public"]["Enums"]["crm_task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          activity_id?: string | null
          assignee_id: string
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          opportunity_id?: string | null
          priority?: Database["public"]["Enums"]["crm_task_priority"]
          status?: Database["public"]["Enums"]["crm_task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          activity_id?: string | null
          assignee_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          opportunity_id?: string | null
          priority?: Database["public"]["Enums"]["crm_task_priority"]
          status?: Database["public"]["Enums"]["crm_task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "crm_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      versions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          data: Json
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          name?: string
          notes?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "employee"
      crm_account_status:
        | "Active"
        | "Dormant"
        | "Won Customer"
        | "Lost"
        | "Archived"
      crm_account_type: "Hospital" | "Clinic" | "Doctor"
      crm_activity_type: "Meeting" | "Call" | "Demo" | "Email" | "Note"
      crm_item_type: "file" | "link"
      crm_opp_stage:
        | "Prospecting"
        | "Discovery"
        | "Demo"
        | "Proposal"
        | "Pricing"
        | "Negotiation"
        | "Won"
        | "Lost"
      crm_source:
        | "Founder Network"
        | "Outbound"
        | "Referral"
        | "Inbound"
        | "Partner"
        | "Event"
        | "Existing Relationship"
      crm_task_priority: "Low" | "Medium" | "High"
      crm_task_status: "Open" | "In Progress" | "Done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee"],
      crm_account_status: [
        "Active",
        "Dormant",
        "Won Customer",
        "Lost",
        "Archived",
      ],
      crm_account_type: ["Hospital", "Clinic", "Doctor"],
      crm_activity_type: ["Meeting", "Call", "Demo", "Email", "Note"],
      crm_item_type: ["file", "link"],
      crm_opp_stage: [
        "Prospecting",
        "Discovery",
        "Demo",
        "Proposal",
        "Pricing",
        "Negotiation",
        "Won",
        "Lost",
      ],
      crm_source: [
        "Founder Network",
        "Outbound",
        "Referral",
        "Inbound",
        "Partner",
        "Event",
        "Existing Relationship",
      ],
      crm_task_priority: ["Low", "Medium", "High"],
      crm_task_status: ["Open", "In Progress", "Done"],
    },
  },
} as const
