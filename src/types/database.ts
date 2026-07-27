import type { InquiryStatus, NotificationStatus } from "@/types/inquiry";

/**
 * Hand-maintained typed mirror of supabase/migrations/*.sql.
 * Keep in sync manually — Option 1 does not run `supabase gen types` as part
 * of the build so the app never depends on a live project being reachable.
 */
export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      inquiries: {
        Row: {
          id: string;
          reference_code: string;
          source: string;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          full_name: string;
          email: string | null;
          mobile_number: string;
          check_in_date: string;
          check_out_date: string;
          adults: number;
          children: number;
          day_visitors: number;
          vehicles: number;
          purpose_of_stay: string | null;
          message: string | null;
          privacy_consent: boolean;
          status: InquiryStatus;
          owner_notes: string | null;
          notification_status: NotificationStatus;
          notification_error: string | null;
          created_at: string;
          updated_at: string;
          contacted_at: string | null;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          reference_code: string;
          source?: string;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          full_name: string;
          email?: string | null;
          mobile_number: string;
          check_in_date: string;
          check_out_date: string;
          adults: number;
          children?: number;
          day_visitors?: number;
          vehicles?: number;
          purpose_of_stay?: string | null;
          message?: string | null;
          privacy_consent: boolean;
          status?: InquiryStatus;
          owner_notes?: string | null;
          notification_status?: NotificationStatus;
          notification_error?: string | null;
          created_at?: string;
          updated_at?: string;
          contacted_at?: string | null;
          closed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["inquiries"]["Insert"]>;
        Relationships: [];
      };
      inquiry_audit_events: {
        Row: {
          id: string;
          inquiry_id: string;
          event_type: string;
          previous_value: string | null;
          new_value: string | null;
          actor: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          inquiry_id: string;
          event_type: string;
          previous_value?: string | null;
          new_value?: string | null;
          actor?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inquiry_audit_events"]["Insert"]>;
        Relationships: [];
      };
    };
  };
}
