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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_default: boolean
          is_hidden: boolean
          name: string
          scope: Database["public"]["Enums"]["category_scope"]
          server_updated_at: string
          slug: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at: string
          deleted_at?: string | null
          id: string
          is_default?: boolean
          is_hidden?: boolean
          name: string
          scope: Database["public"]["Enums"]["category_scope"]
          server_updated_at?: string
          slug?: string | null
          sort_order?: number
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          is_hidden?: boolean
          name?: string
          scope?: Database["public"]["Enums"]["category_scope"]
          server_updated_at?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          amount_minor: number
          category_id: string
          counterparty: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["entry_kind"]
          occurred_on: string
          recurring_rule_id: string | null
          server_updated_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          category_id: string
          counterparty?: string | null
          created_at: string
          deleted_at?: string | null
          description?: string | null
          id: string
          kind: Database["public"]["Enums"]["entry_kind"]
          occurred_on: string
          recurring_rule_id?: string | null
          server_updated_at?: string
          updated_at: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          category_id?: string
          counterparty?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["entry_kind"]
          occurred_on?: string
          recurring_rule_id?: string | null
          server_updated_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_payments: {
        Row: {
          amount_minor: number
          created_at: string
          deleted_at: string | null
          id: string
          loan_id: string
          note: string | null
          paid_on: string
          server_updated_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at: string
          deleted_at?: string | null
          id: string
          loan_id: string
          note?: string | null
          paid_on: string
          server_updated_at?: string
          updated_at: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          loan_id?: string
          note?: string | null
          paid_on?: string
          server_updated_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          category_id: string
          counterparty: string
          created_at: string
          deleted_at: string | null
          description: string | null
          due_on: string
          id: string
          instalment_minor: number | null
          interest_type: Database["public"]["Enums"]["interest_kind"]
          interest_value: number
          plan: Database["public"]["Enums"]["repeat_plan"]
          principal_minor: number
          remind: boolean
          server_updated_at: string
          started_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          counterparty: string
          created_at: string
          deleted_at?: string | null
          description?: string | null
          due_on: string
          id: string
          instalment_minor?: number | null
          interest_type?: Database["public"]["Enums"]["interest_kind"]
          interest_value?: number
          plan?: Database["public"]["Enums"]["repeat_plan"]
          principal_minor: number
          remind?: boolean
          server_updated_at?: string
          started_on: string
          updated_at: string
          user_id: string
        }
        Update: {
          category_id?: string
          counterparty?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_on?: string
          id?: string
          instalment_minor?: number | null
          interest_type?: Database["public"]["Enums"]["interest_kind"]
          interest_value?: number
          plan?: Database["public"]["Enums"]["repeat_plan"]
          principal_minor?: number
          remind?: boolean
          server_updated_at?: string
          started_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          amount_minor: number
          category_id: string
          counterparty: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          frequency: Database["public"]["Enums"]["repeat_plan"]
          id: string
          is_paused: boolean
          kind: Database["public"]["Enums"]["entry_kind"]
          next_due_on: string
          server_updated_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          category_id: string
          counterparty?: string | null
          created_at: string
          deleted_at?: string | null
          description?: string | null
          frequency: Database["public"]["Enums"]["repeat_plan"]
          id: string
          is_paused?: boolean
          kind: Database["public"]["Enums"]["entry_kind"]
          next_due_on: string
          server_updated_at?: string
          updated_at: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          category_id?: string
          counterparty?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          frequency?: Database["public"]["Enums"]["repeat_plan"]
          id?: string
          is_paused?: boolean
          kind?: Database["public"]["Enums"]["entry_kind"]
          next_due_on?: string
          server_updated_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string | null
          hide_details: boolean
          id: string
          kinds: string[]
          period_end: string
          period_start: string
          revoked_at: string | null
          snapshot: Json
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          hide_details?: boolean
          id?: string
          kinds: string[]
          period_end: string
          period_start: string
          revoked_at?: string | null
          snapshot: Json
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          hide_details?: boolean
          id?: string
          kinds?: string[]
          period_end?: string
          period_start?: string
          revoked_at?: string | null
          snapshot?: Json
          token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      category_scope: "income" | "expense" | "giving" | "lent"
      entry_kind: "income" | "expense" | "giving"
      interest_kind: "none" | "percent" | "flat"
      repeat_plan: "one_payment" | "weekly" | "monthly"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_scope: ["income", "expense", "giving", "lent"],
      entry_kind: ["income", "expense", "giving"],
      interest_kind: ["none", "percent", "flat"],
      repeat_plan: ["one_payment", "weekly", "monthly"],
    },
  },
} as const
