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
      ai_chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chats: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          content: string
          created_at: string
          id: string
          shortcut: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          shortcut?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
          visitor_email: string | null
          visitor_metadata: Json | null
          visitor_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          visitor_email?: string | null
          visitor_metadata?: Json | null
          visitor_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          visitor_email?: string | null
          visitor_metadata?: Json | null
          visitor_name?: string | null
        }
        Relationships: []
      }
      github_reviews: {
        Row: {
          created_at: string
          id: string
          pr_number: number
          pr_title: string
          repo: string
          review_body: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pr_number: number
          pr_title?: string
          repo: string
          review_body?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pr_number?: number
          pr_title?: string
          repo?: string
          review_body?: string
          user_id?: string
        }
        Relationships: []
      }
      github_tokens: {
        Row: {
          created_at: string
          id: string
          repos: Json
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          repos?: Json
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          repos?: Json
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          conversation_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json
          provider: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload?: Json
          provider?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          provider?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_expires_at: string | null
          business_name: string
          call_number: string
          chats_period_started_at: string
          chats_limit: number
          chats_used: number
          created_at: string
          grace_expires_at: string | null
          id: string
          leads_limit: number
          leads_used: number
          logo_url: string
          plan: string
          primary_color: string
          subscription_started_at: string
          trial_expires_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
          welcome_message: string
          whatsapp_number: string
        }
        Insert: {
          billing_expires_at?: string | null
          business_name?: string
          call_number?: string
          chats_period_started_at?: string
          chats_limit?: number
          chats_used?: number
          created_at?: string
          grace_expires_at?: string | null
          id?: string
          leads_limit?: number
          leads_used?: number
          logo_url?: string
          plan?: string
          primary_color?: string
          subscription_started_at?: string
          trial_expires_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
          welcome_message?: string
          whatsapp_number?: string
        }
        Update: {
          billing_expires_at?: string | null
          business_name?: string
          call_number?: string
          chats_period_started_at?: string
          chats_limit?: number
          chats_used?: number
          created_at?: string
          grace_expires_at?: string | null
          id?: string
          leads_limit?: number
          leads_used?: number
          logo_url?: string
          plan?: string
          primary_color?: string
          subscription_started_at?: string
          trial_expires_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
          welcome_message?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      request_logs: {
        Row: {
          created_at: string
          event_type: string
          function_name: string
          id: string
          ip: string | null
          message: string | null
          metadata: Json | null
          scope: string | null
          session_id: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          function_name: string
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json | null
          scope?: string | null
          session_id?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          function_name?: string
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json | null
          scope?: string | null
          session_id?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          encryption: string
          from_email: string
          host: string
          id: string
          password: string
          port: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          encryption?: string
          from_email?: string
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          user_id: string
          username?: string
        }
        Update: {
          created_at?: string
          encryption?: string
          from_email?: string
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      ticket_activities: {
        Row: {
          activity_type: string
          actor_name: string | null
          comment: string | null
          created_at: string
          from_value: string | null
          id: string
          ticket_id: string
          to_value: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          actor_name?: string | null
          comment?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          ticket_id: string
          to_value?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          actor_name?: string | null
          comment?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          ticket_id?: string
          to_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          conversation_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          description: string
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "user"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
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
      app_role: ["admin", "user"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "waiting", "resolved", "closed"],
    },
  },
} as const
