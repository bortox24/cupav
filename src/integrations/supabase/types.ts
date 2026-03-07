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
      anagrafica_invio_logs: {
        Row: {
          created_at: string
          id: string
          inviato_da: string
          inviato_da_nome: string
          ragazzo_id: string
          successo: boolean
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          inviato_da: string
          inviato_da_nome: string
          ragazzo_id: string
          successo?: boolean
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          inviato_da?: string
          inviato_da_nome?: string
          ragazzo_id?: string
          successo?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "anagrafica_invio_logs_ragazzo_id_fkey"
            columns: ["ragazzo_id"]
            isOneToOne: false
            referencedRelation: "ragazzi"
            referencedColumns: ["id"]
          },
        ]
      }
      appello_logs: {
        Row: {
          created_at: string
          effettuato_da: string
          effettuato_da_nome: string
          id: string
          presenti: number
          totale: number
          turno: string
        }
        Insert: {
          created_at?: string
          effettuato_da: string
          effettuato_da_nome: string
          id?: string
          presenti: number
          totale: number
          turno: string
        }
        Update: {
          created_at?: string
          effettuato_da?: string
          effettuato_da_nome?: string
          id?: string
          presenti?: number
          totale?: number
          turno?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          form_schema: Json
          id: string
          is_active: boolean
          name: string
          slug: string
          submit_button_text: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          name: string
          slug: string
          submit_button_text?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          submit_button_text?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      iscrizioni: {
        Row: {
          allergie_dettaglio: string | null
          created_at: string
          email: string
          farmaco_1_nome: string | null
          farmaco_1_posologia: string | null
          farmaco_2_nome: string | null
          farmaco_2_posologia: string | null
          farmaco_3_nome: string | null
          farmaco_3_posologia: string | null
          firma_data: string
          firma_nome: string
          genitore_cognome: string
          genitore_nome: string
          genitore_qualita: string
          ha_allergie: boolean
          id: string
          liberatoria_foto: boolean
          patologie_dettaglio: string | null
          ragazzo_cognome: string
          ragazzo_data_nascita: string
          ragazzo_indirizzo: string
          ragazzo_luogo_nascita: string
          ragazzo_nome: string
          ragazzo_residente: string
          recapiti_telefonici: string
          secondo_figlio: string | null
          turno: string
        }
        Insert: {
          allergie_dettaglio?: string | null
          created_at?: string
          email: string
          farmaco_1_nome?: string | null
          farmaco_1_posologia?: string | null
          farmaco_2_nome?: string | null
          farmaco_2_posologia?: string | null
          farmaco_3_nome?: string | null
          farmaco_3_posologia?: string | null
          firma_data: string
          firma_nome: string
          genitore_cognome: string
          genitore_nome: string
          genitore_qualita: string
          ha_allergie?: boolean
          id?: string
          liberatoria_foto?: boolean
          patologie_dettaglio?: string | null
          ragazzo_cognome: string
          ragazzo_data_nascita: string
          ragazzo_indirizzo: string
          ragazzo_luogo_nascita: string
          ragazzo_nome: string
          ragazzo_residente: string
          recapiti_telefonici: string
          secondo_figlio?: string | null
          turno: string
        }
        Update: {
          allergie_dettaglio?: string | null
          created_at?: string
          email?: string
          farmaco_1_nome?: string | null
          farmaco_1_posologia?: string | null
          farmaco_2_nome?: string | null
          farmaco_2_posologia?: string | null
          farmaco_3_nome?: string | null
          farmaco_3_posologia?: string | null
          firma_data?: string
          firma_nome?: string
          genitore_cognome?: string
          genitore_nome?: string
          genitore_qualita?: string
          ha_allergie?: boolean
          id?: string
          liberatoria_foto?: boolean
          patologie_dettaglio?: string | null
          ragazzo_cognome?: string
          ragazzo_data_nascita?: string
          ragazzo_indirizzo?: string
          ragazzo_luogo_nascita?: string
          ragazzo_nome?: string
          ragazzo_residente?: string
          recapiti_telefonici?: string
          secondo_figlio?: string | null
          turno?: string
        }
        Relationships: []
      }
      pagamenti: {
        Row: {
          created_at: string
          id: string
          importo_dovuto: number
          importo_pagato: number
          iscrizione_id: string
          note: string | null
          stato: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          importo_dovuto?: number
          importo_pagato?: number
          iscrizione_id: string
          note?: string | null
          stato?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          importo_dovuto?: number
          importo_pagato?: number
          iscrizione_id?: string
          note?: string | null
          stato?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamenti_iscrizione_id_fkey"
            columns: ["iscrizione_id"]
            isOneToOne: true
            referencedRelation: "iscrizioni"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamento_reminder_logs: {
        Row: {
          created_at: string
          id: string
          inviato_da: string
          inviato_da_nome: string
          iscrizione_id: string
          note_al_momento: string | null
          stato_al_momento: string
        }
        Insert: {
          created_at?: string
          id?: string
          inviato_da: string
          inviato_da_nome: string
          iscrizione_id: string
          note_al_momento?: string | null
          stato_al_momento: string
        }
        Update: {
          created_at?: string
          id?: string
          inviato_da?: string
          inviato_da_nome?: string
          iscrizione_id?: string
          note_al_momento?: string | null
          stato_al_momento?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamento_reminder_logs_iscrizione_id_fkey"
            columns: ["iscrizione_id"]
            isOneToOne: false
            referencedRelation: "iscrizioni"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ragazzi: {
        Row: {
          allergie_dettaglio: string | null
          archiviato: boolean
          created_at: string
          data_nascita: string | null
          farmaco_1_nome: string | null
          farmaco_1_posologia: string | null
          farmaco_2_nome: string | null
          farmaco_2_posologia: string | null
          farmaco_3_nome: string | null
          farmaco_3_posologia: string | null
          full_name: string
          ha_allergie: boolean
          id: string
          numero: number | null
          patologie_dettaglio: string | null
          residente_altavilla: boolean
          updated_at: string
        }
        Insert: {
          allergie_dettaglio?: string | null
          archiviato?: boolean
          created_at?: string
          data_nascita?: string | null
          farmaco_1_nome?: string | null
          farmaco_1_posologia?: string | null
          farmaco_2_nome?: string | null
          farmaco_2_posologia?: string | null
          farmaco_3_nome?: string | null
          farmaco_3_posologia?: string | null
          full_name: string
          ha_allergie?: boolean
          id?: string
          numero?: number | null
          patologie_dettaglio?: string | null
          residente_altavilla?: boolean
          updated_at?: string
        }
        Update: {
          allergie_dettaglio?: string | null
          archiviato?: boolean
          created_at?: string
          data_nascita?: string | null
          farmaco_1_nome?: string | null
          farmaco_1_posologia?: string | null
          farmaco_2_nome?: string | null
          farmaco_2_posologia?: string | null
          farmaco_3_nome?: string | null
          farmaco_3_posologia?: string | null
          full_name?: string
          ha_allergie?: boolean
          id?: string
          numero?: number | null
          patologie_dettaglio?: string | null
          residente_altavilla?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ragazzi_genitori: {
        Row: {
          email: string | null
          id: string
          nome_cognome: string
          ragazzo_id: string
          ruolo: string
          telefono: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          nome_cognome: string
          ragazzo_id: string
          ruolo: string
          telefono?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          nome_cognome?: string
          ragazzo_id?: string
          ruolo?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ragazzi_genitori_ragazzo_id_fkey"
            columns: ["ragazzo_id"]
            isOneToOne: false
            referencedRelation: "ragazzi"
            referencedColumns: ["id"]
          },
        ]
      }
      ragazzi_iscrizioni: {
        Row: {
          anno: number
          created_at: string
          id: string
          ragazzo_id: string
          turno: string
        }
        Insert: {
          anno: number
          created_at?: string
          id?: string
          ragazzo_id: string
          turno: string
        }
        Update: {
          anno?: number
          created_at?: string
          id?: string
          ragazzo_id?: string
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "ragazzi_iscrizioni_ragazzo_id_fkey"
            columns: ["ragazzo_id"]
            isOneToOne: false
            referencedRelation: "ragazzi"
            referencedColumns: ["id"]
          },
        ]
      }
      role_page_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          page_path: string
          role_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_path: string
          role_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_path?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_page_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          label: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          label: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          label?: string
          name?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tende: {
        Row: {
          assegnati: Json
          colore: string
          created_at: string | null
          id: string
          numero: number
          riga: number
          turno: string
          updated_at: string | null
        }
        Insert: {
          assegnati?: Json
          colore?: string
          created_at?: string | null
          id?: string
          numero: number
          riga: number
          turno: string
          updated_at?: string | null
        }
        Update: {
          assegnati?: Json
          colore?: string
          created_at?: string | null
          id?: string
          numero?: number
          riga?: number
          turno?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          category_id: string | null
          causale: string
          created_at: string
          data_transazione: string
          id: string
          importo: number
          tipologia: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          causale: string
          created_at?: string
          data_transazione?: string
          id?: string
          importo: number
          tipologia: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          causale?: string
          created_at?: string
          data_transazione?: string
          id?: string
          importo?: number
          tipologia?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      turno_permessi: {
        Row: {
          assegnato_da: string | null
          created_at: string
          id: string
          turno: string
          user_id: string
        }
        Insert: {
          assegnato_da?: string | null
          created_at?: string
          id?: string
          turno: string
          user_id: string
        }
        Update: {
          assegnato_da?: string | null
          created_at?: string
          id?: string
          turno?: string
          user_id?: string
        }
        Relationships: []
      }
      user_page_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          page_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhook_config: {
        Row: {
          created_at: string
          descrizione: string | null
          id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          descrizione?: string | null
          id?: string
          webhook_url?: string
        }
        Update: {
          created_at?: string
          descrizione?: string | null
          id?: string
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_transaction: {
        Args: { _transaction_user_id: string }
        Returns: boolean
      }
      has_page_access: {
        Args: { _page_path: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_tesoriere: { Args: never; Returns: boolean }
      is_user_active: { Args: never; Returns: boolean }
      is_visualizzatore: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "tesoriere" | "visualizzatore"
      payment_status: "da_pagare" | "parziale" | "pagato"
      transaction_type: "spesa" | "prelievo" | "entrata"
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
      app_role: ["admin", "tesoriere", "visualizzatore"],
      payment_status: ["da_pagare", "parziale", "pagato"],
      transaction_type: ["spesa", "prelievo", "entrata"],
    },
  },
} as const
