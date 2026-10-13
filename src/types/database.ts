import type { InquiryStatus, NotificationStatus } from "@/types/inquiry";
import type {
  BookingDepositStatus,
  BookingPackageCode,
  BookingQuote,
  BookingRequest,
  BookingRequestEvent,
  BookingRequestSource,
  BookingRequestStatus,
  BookingReservation,
  ReservationStatus,
} from "@/types/booking";

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
    Functions: {
      is_ten29_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      is_ten29_owner: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      issue_booking_quote: {
        Args: { p_quote_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      booking_package_code: BookingPackageCode;
      booking_request_source: BookingRequestSource;
      booking_request_status: BookingRequestStatus;
      booking_quote_status: "DRAFT" | "ISSUED";
      booking_deposit_status: BookingDepositStatus;
      reservation_status: ReservationStatus;
    };
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
      booking_properties: {
        Row: { id: number; timezone: string; max_overnight_guests: number };
        Insert: { id?: number; timezone?: string; max_overnight_guests?: number };
        Update: Partial<Database["public"]["Tables"]["booking_properties"]["Insert"]>;
        Relationships: [];
      };
      property_packages: {
        Row: {
          code: BookingPackageCode;
          property_id: number;
          bedrooms_access: number;
          occupancy_scope: string;
          max_guests: number;
          created_at: string;
        };
        Insert: {
          code: BookingPackageCode;
          property_id?: number;
          bedrooms_access: number;
          occupancy_scope?: string;
          max_guests: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["property_packages"]["Insert"]>;
        Relationships: [];
      };
      booking_requests: {
        Row: BookingRequest;
        Insert: {
          id?: string;
          idempotency_key?: string | null;
          inquiry_id?: string | null;
          property_id?: number;
          package_code: BookingPackageCode;
          source: BookingRequestSource;
          check_in_date: string;
          check_out_date: string;
          overnight_guest_count: number;
          folding_foams_requested?: boolean;
          status?: BookingRequestStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["booking_requests"]["Insert"]>;
        Relationships: [];
      };
      booking_quotes: {
        Row: BookingQuote;
        Insert: {
          id?: string;
          idempotency_key?: string | null;
          request_id: string;
          revision: number;
          status?: "DRAFT" | "ISSUED";
          currency?: string;
          amount_total?: number | null;
          required_deposit_amount?: number | null;
          valid_until?: string | null;
          line_items?: Array<Record<string, unknown>>;
          owner_approved_by?: string | null;
          owner_approved_at?: string | null;
          issued_by?: string | null;
          issued_at?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["booking_quotes"]["Insert"]>;
        Relationships: [];
      };
      booking_deposits: {
        Row: {
          id: string;
          idempotency_key: string | null;
          request_id: string;
          amount: number;
          payment_method: string | null;
          external_reference_masked: string | null;
          status: BookingDepositStatus;
          recorded_by: string;
          recorded_at: string;
          verified_by: string | null;
          verified_at: string | null;
        };
        Insert: {
          id?: string;
          idempotency_key?: string | null;
          request_id: string;
          amount: number;
          payment_method?: string | null;
          external_reference_masked?: string | null;
          status?: BookingDepositStatus;
          recorded_by?: string;
          recorded_at?: string;
          verified_by?: string | null;
          verified_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["booking_deposits"]["Insert"]>;
        Relationships: [];
      };
      booking_request_events: {
        Row: BookingRequestEvent;
        Insert: {
          id?: string;
          request_id: string;
          previous_status?: BookingRequestStatus | null;
          new_status: BookingRequestStatus;
          actor_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["booking_request_events"]["Insert"]>;
        Relationships: [];
      };
      booking_reservations: {
        Row: BookingReservation;
        Insert: {
          id?: string;
          request_id: string;
          status?: ReservationStatus;
          created_by: string;
          confirmed_at: string;
          completed_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["booking_reservations"]["Insert"]>;
        Relationships: [];
      };
    };
  };
}
