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
    PostgrestVersion: "14.5"
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
      pairs: {
        Row: {
          created_at: string
          id: string
          is_final_pick: boolean
          iteration_count_cumulative: number
          prompt_id: string
          result_image_url: string | null
          satisfaction: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_final_pick?: boolean
          iteration_count_cumulative?: number
          prompt_id: string
          result_image_url?: string | null
          satisfaction?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_final_pick?: boolean
          iteration_count_cumulative?: number
          prompt_id?: string
          result_image_url?: string | null
          satisfaction?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          created_at: string
          id: string
          language: Database["public"]["Enums"]["prompt_language"]
          prompt_text: string
          reference_id: string | null
          self_rating: number | null
          source: Database["public"]["Enums"]["prompt_source"]
          tool: Database["public"]["Enums"]["prompt_tool"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: Database["public"]["Enums"]["prompt_language"]
          prompt_text: string
          reference_id?: string | null
          self_rating?: number | null
          source?: Database["public"]["Enums"]["prompt_source"]
          tool: Database["public"]["Enums"]["prompt_tool"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["prompt_language"]
          prompt_text?: string
          reference_id?: string | null
          self_rating?: number | null
          source?: Database["public"]["Enums"]["prompt_source"]
          tool?: Database["public"]["Enums"]["prompt_tool"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          reference_id: string
          source: string
          tokens: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          reference_id: string
          source?: string
          tokens: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          reference_id?: string
          source?: string
          tokens?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_tokens_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      references: {
        Row: {
          favorite_score: number | null
          id: string
          notes: string | null
          source_url: string | null
          thumbnail_url: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          favorite_score?: number | null
          id?: string
          notes?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          favorite_score?: number | null
          id?: string
          notes?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          reference_id: string
          tag: string
          tag_kind: Database["public"]["Enums"]["tag_kind"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference_id: string
          tag: string
          tag_kind: Database["public"]["Enums"]["tag_kind"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reference_id?: string
          tag?: string
          tag_kind?: Database["public"]["Enums"]["tag_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      prompt_language: "en" | "ko"
      prompt_source: "copied" | "modified" | "remix"
      prompt_tool: "midjourney" | "nano-banana" | "higgsfield"
      tag_kind: "category" | "mood" | "color" | "purpose"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      prompt_language: ["en", "ko"],
      prompt_source: ["copied", "modified", "remix"],
      prompt_tool: ["midjourney", "nano-banana", "higgsfield"],
      tag_kind: ["category", "mood", "color", "purpose"],
    },
  },
} as const
