export type Database = {
  public: {
    Tables: {
      categorie: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      client: {
        Row: {
          id: number
          full_name: string
          state: boolean
          adress: string | null
          phone: string | null
          joined_at: string | null
        }
        Insert: {
          id?: number
          full_name: string
          state?: boolean
          adress?: string | null
          phone?: string | null
          joined_at?: string | null
        }
        Update: {
          id?: number
          full_name?: string
          state?: boolean
          adress?: string | null
          phone?: string | null
          joined_at?: string | null
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
        }
        Insert: {
          id?: number
          name: string
          price?: number | null
          description?: string | null
          stock?: number | null
          created_at?: string | null
          categorie_id?: number | null
        }
        Update: {
          id?: number
          name?: string
          price?: number | null
          description?: string | null
          stock?: number | null
          created_at?: string | null
          categorie_id?: number | null
        }
        Relationships: []
      }
      vente: {
        Row: {
          id: number
          product_id: number
          client_id: number
          quantity: number
          price: number | null
          total: number | null
          credit: number | null
          date_credit: string | null
          date: string | null
        }
        Insert: {
          id?: number
          product_id: number
          client_id: number
          quantity: number
          price?: number | null
          total?: number | null
          credit?: number | null
          date_credit?: string | null
          date?: string | null
        }
        Update: {
          id?: number
          product_id?: number
          client_id?: number
          quantity?: number
          price?: number | null
          total?: number | null
          credit?: number | null
          date_credit?: string | null
          date?: string | null
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
