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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      checklist_items: {
        Row: {
          category: string
          checklist_id: string
          created_at: string
          description: string | null
          expected_value: string | null
          icon: string | null
          id: string
          sort_order: number
          title: string
          unit: string | null
        }
        Insert: {
          category?: string
          checklist_id: string
          created_at?: string
          description?: string | null
          expected_value?: string | null
          icon?: string | null
          id?: string
          sort_order?: number
          title: string
          unit?: string | null
        }
        Update: {
          category?: string
          checklist_id?: string
          created_at?: string
          description?: string | null
          expected_value?: string | null
          icon?: string | null
          id?: string
          sort_order?: number
          title?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string
          description: string | null
          equipment_id: string | null
          frequency: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          frequency?: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          frequency?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_checklists: {
        Row: {
          category_unlocked_at: string | null
          checklist_id: string
          completed_at: string
          completed_by_name: string | null
          emergency_reason: string | null
          emergency_reported_at: string | null
          equipment_id: string
          id: string
          is_emergency: boolean | null
          notes: string | null
          session_number: number | null
          time_slot: string | null
          user_id: string
        }
        Insert: {
          category_unlocked_at?: string | null
          checklist_id: string
          completed_at?: string
          completed_by_name?: string | null
          emergency_reason?: string | null
          emergency_reported_at?: string | null
          equipment_id: string
          id?: string
          is_emergency?: boolean | null
          notes?: string | null
          session_number?: number | null
          time_slot?: string | null
          user_id: string
        }
        Update: {
          category_unlocked_at?: string | null
          checklist_id?: string
          completed_at?: string
          completed_by_name?: string | null
          emergency_reason?: string | null
          emergency_reported_at?: string | null
          equipment_id?: string
          id?: string
          is_emergency?: boolean | null
          notes?: string | null
          session_number?: number | null
          time_slot?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_checklists_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_checklists_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_items: {
        Row: {
          actual_value: string | null
          checklist_item_id: string
          completed_checklist_id: string
          created_at: string
          has_issue: boolean | null
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          actual_value?: string | null
          checklist_item_id: string
          completed_checklist_id: string
          created_at?: string
          has_issue?: boolean | null
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          actual_value?: string | null
          checklist_item_id?: string
          completed_checklist_id?: string
          created_at?: string
          has_issue?: boolean | null
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_items_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_items_completed_checklist_id_fkey"
            columns: ["completed_checklist_id"]
            isOneToOne: false
            referencedRelation: "completed_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          qr_code: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          qr_code: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          qr_code?: string
        }
        Relationships: []
      }
      issues: {
        Row: {
          completed_item_id: string
          created_at: string
          description: string
          id: string
          notes: string | null
          priority: string
          reported_at: string
          reported_by: string
          reported_by_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_item_id: string
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          priority?: string
          reported_at?: string
          reported_by: string
          reported_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_item_id?: string
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          priority?: string
          reported_at?: string
          reported_by?: string
          reported_by_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_completed_item_id_fkey"
            columns: ["completed_item_id"]
            isOneToOne: false
            referencedRelation: "completed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          completed_item_id: string
          created_at: string
          id: string
          url: string
        }
        Insert: {
          caption?: string | null
          completed_item_id: string
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          caption?: string | null
          completed_item_id?: string
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_completed_item_id_fkey"
            columns: ["completed_item_id"]
            isOneToOne: false
            referencedRelation: "completed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          date_from: string
          date_to: string
          generated_at: string
          generated_by: string
          generated_by_name: string | null
          id: string
          report_type: string
          summary: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          date_from: string
          date_to: string
          generated_at?: string
          generated_by: string
          generated_by_name?: string | null
          id?: string
          report_type?: string
          summary?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          date_from?: string
          date_to?: string
          generated_at?: string
          generated_by?: string
          generated_by_name?: string | null
          id?: string
          report_type?: string
          summary?: Json | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_name: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
