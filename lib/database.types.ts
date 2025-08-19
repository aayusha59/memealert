export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          phone_number?: string
          phone_verified: boolean
          phone_verified_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          phone_number?: string
          phone_verified?: boolean
          phone_verified_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          phone_number?: string
          phone_verified?: boolean
          phone_verified_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      alerts: {
        Row: {
          id: string
          user_id: string
          token_address: string
          token_symbol: string
          token_name?: string
          status: string
          market_cap?: number
          change_24h?: number
          volume_24h?: number
          price?: number
          notifications_enabled: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          calls_enabled?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token_address: string
          token_symbol: string
          token_name?: string
          status?: string
          market_cap?: number
          change_24h?: number
          volume_24h?: number
          price?: number
          notifications_enabled?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          calls_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token_address?: string
          token_symbol?: string
          token_name?: string
          status?: string
          market_cap?: number
          change_24h?: number
          volume_24h?: number
          price?: number
          notifications_enabled?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          calls_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      alert_metrics: {
        Row: {
          id: string
          alert_id: string
          market_cap_enabled: boolean
          price_change_enabled: boolean
          volume_enabled: boolean
          market_cap_high?: number
          market_cap_low?: number
          price_change_threshold?: number
          volume_threshold?: number
          volume_period?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          alert_id: string
          market_cap_enabled?: boolean
          price_change_enabled?: boolean
          volume_enabled?: boolean
          market_cap_high?: number
          market_cap_low?: number
          price_change_threshold?: number
          volume_threshold?: number
          volume_period?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          alert_id?: string
          market_cap_enabled?: boolean
          price_change_enabled?: boolean
          volume_enabled?: boolean
          market_cap_high?: number
          market_cap_low?: number
          price_change_threshold?: number
          volume_threshold?: number
          volume_period?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_metrics_alert_id_fkey"
            columns: ["alert_id"]
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          push_enabled: boolean
          sms_enabled: boolean
          calls_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          push_enabled?: boolean
          sms_enabled?: boolean
          calls_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          push_enabled?: boolean
          sms_enabled?: boolean
          calls_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_history: {
        Row: {
          id: string
          user_id: string
          alert_id: string
          notification_type: string
          status: string
          message?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          alert_id: string
          notification_type: string
          status: string
          message?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          alert_id?: string
          notification_type?: string
          status?: string
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_history_alert_id_fkey"
            columns: ["alert_id"]
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
