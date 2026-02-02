/**
 * Database Types
 *
 * These types should be generated from Supabase using:
 * npx supabase gen types typescript --local > src/data/supabase/database.types.ts
 *
 * For now, we define them manually to match our schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          phone_number: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          phone_number?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sms_participants: {
        Row: {
          id: string;
          phone_number: string;
          display_name: string;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone_number: string;
          display_name: string;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string;
          display_name?: string;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sms_participants_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          twilio_phone_number: string;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          twilio_phone_number: string;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          twilio_phone_number?: string;
          created_by_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string | null;
          sms_participant_id: string | null;
          role: "owner" | "admin" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id?: string | null;
          sms_participant_id?: string | null;
          role?: "owner" | "admin" | "member";
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string | null;
          sms_participant_id?: string | null;
          role?: "owner" | "admin" | "member";
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_sms_participant_id_fkey";
            columns: ["sms_participant_id"];
            referencedRelation: "sms_participants";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          group_id: string;
          origin: "app" | "sms";
          content: string;
          sender_user_id: string | null;
          sender_sms_participant_id: string | null;
          twilio_message_sid: string | null;
          delivery_status: "pending" | "queued" | "sent" | "delivered" | "failed" | "undelivered" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          origin: "app" | "sms";
          content: string;
          sender_user_id?: string | null;
          sender_sms_participant_id?: string | null;
          twilio_message_sid?: string | null;
          delivery_status?: "pending" | "queued" | "sent" | "delivered" | "failed" | "undelivered" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          origin?: "app" | "sms";
          content?: string;
          sender_user_id?: string | null;
          sender_sms_participant_id?: string | null;
          twilio_message_sid?: string | null;
          delivery_status?: "pending" | "queued" | "sent" | "delivered" | "failed" | "undelivered" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey";
            columns: ["group_id"];
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey";
            columns: ["sender_user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_sms_participant_id_fkey";
            columns: ["sender_sms_participant_id"];
            referencedRelation: "sms_participants";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: boolean;
      };
      get_group_role: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: "owner" | "admin" | "member" | null;
      };
    };
    Enums: {
      message_origin: "app" | "sms";
      delivery_status: "pending" | "queued" | "sent" | "delivered" | "failed" | "undelivered";
      group_member_role: "owner" | "admin" | "member";
    };
    CompositeTypes: {};
  };
};

// Helper types for working with database rows
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
