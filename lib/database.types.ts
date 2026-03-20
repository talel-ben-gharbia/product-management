export type Database = {
  public: {
    Tables: {
      categorie: {
        Row: {
          id: number
          name: string
          user_id: string
        }
        Insert: {
          id?: number
          name: string
          user_id: string
        }
        Update: {
          id?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      produit: {
        Row: {
          id: number
          name: string
          price: number | null
          description: string | null
          stock: number | null
          created_at: string | null
          categorie_id: number | null
          user_id: string
        }
        Insert: {
          id?: number
          name: string
          price?: number | null
          description?: string | null
          stock?: number | null
          created_at?: string | null
          categorie_id?: number | null
          user_id: string
        }
        Update: {
          id?: number
          name?: string
          price?: number | null
          description?: string | null
          stock?: number | null
          created_at?: string | null
          categorie_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
