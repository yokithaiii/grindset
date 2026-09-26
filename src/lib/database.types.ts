// Generated shape of `supabase gen types typescript` for the schema in
// supabase/migrations. Regenerate with `npm run gen:types` after `supabase link`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      entries: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          minutes_spent: number | null
          note: string | null
          source_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          minutes_spent?: number | null
          note?: string | null
          source_id: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          minutes_spent?: number | null
          note?: string | null
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'entries_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'sources'
            referencedColumns: ['id']
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          kind: string
          month: string | null
          target_amount: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          month?: string | null
          target_amount: number
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          month?: string | null
          target_amount?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          amount_mode: string
          currency: string
          freezes_per_month: number
          user_id: string
          week_starts_on: number
        }
        Insert: {
          amount_mode?: string
          currency?: string
          freezes_per_month?: number
          user_id?: string
          week_starts_on?: number
        }
        Update: {
          amount_mode?: string
          currency?: string
          freezes_per_month?: number
          user_id?: string
          week_starts_on?: number
        }
        Relationships: []
      }
      sources: {
        Row: {
          color: string
          created_at: string
          id: string
          is_archived: boolean
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          type?: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      streak_freezes: {
        Row: {
          date: string
          id: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          user_id?: string
        }
        Update: {
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      ensure_user_setup: { Args: never; Returns: undefined }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
