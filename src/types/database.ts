import type { OwnerMedia, PublicMedia, MediaDelivery } from './media';
import type { OpsData } from './operations';
import type { IntakeResult } from "./guest-booking";
import type { InquiryStatus, NotificationStatus } from "@/types/inquiry";
import type { RateRule, AdjustmentInput, OwnerRateState, PublicPriceEstimate, QuoteBreakdown } from "@/types/pricing";
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
      perform_booking_policy_operation:{Args:{p_id:string;p_key:string;p_data:Record<string,unknown>};Returns:string};
      may_deliver_booking_request_notification:{Args:{p_request:string};Returns:boolean};
      perform_booking_operation: {Args:{p_action:string;p_id:string|null;p_key:string;p_data:Record<string,unknown>};Returns:string};
      read_booking_operations: {Args:{p_from:string;p_to:string;p_request:string|null};Returns:OpsData};
      owner_media_action: { Args: { p_action: string; p_id: string | null; p_version: number | null; p_data: Record<string, unknown> }; Returns: OwnerMedia };
      media_worker_action: { Args: { p_id: string; p_action: string; p_token: string | null; p_data: Record<string, unknown> }; Returns: OwnerMedia };
      read_public_media: { Args: Record<never, never>; Returns: PublicMedia[] };
      read_media_delivery: { Args: { p_id: string; p_preview: boolean }; Returns: MediaDelivery | null };
      accept_website_booking: { Args: { p_payload: Record<string, unknown>; p_session: string; p_key: string; p_abuse: string }; Returns: IntakeResult };
      claim_booking_notification: { Args: { p_request: string; p_kind: string }; Returns: unknown };
      finish_booking_notification: { Args: { p_task: string; p_token: string; p_sent: boolean }; Returns: undefined };

      save_calendar_rate_draft: { Args: { p_package: BookingPackageCode; p_base: string | null; p_rules: RateRule[]; p_key: string }; Returns: string };
      publish_calendar_rate_revision: { Args: { p_revision: string; p_base: string | null; p_key: string }; Returns: string };
      read_owner_rate_state: { Args: { p_package: BookingPackageCode; p_offset?: number }; Returns: OwnerRateState };
      read_public_calendar_prices: { Args: { p_package: BookingPackageCode; p_from: string; p_to: string; p_guests: number; p_foams: boolean }; Returns: PublicPriceEstimate };
      prepare_itemized_booking_quote: {
        Args: { p_request: string; p_expected_rate: string | null; p_deposit: number | null; p_adjustments: AdjustmentInput[];
          p_manual_nights: Array<{ date: string; amount_centavos: number; reason: string }>;
          p_security_deposit: number | null; p_conditions: string | null; p_valid_until: string | null; p_key: string };
        Returns: string;
      };
      issue_itemized_booking_quote: { Args: { p_quote: string }; Returns: string };
      read_owner_quote_breakdown: { Args: { p_quote: string }; Returns: QuoteBreakdown };
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
      decide_booking_deposit: {
        Args: { p_deposit_id: string; p_decision: string; p_independently_verified: boolean; p_idempotency_key: string };
        Returns: string;
      };
      confirm_booking_reservation: {
        Args: { p_request_id: string; p_quote_id: string; p_idempotency_key: string };
        Returns: string;
      };
      create_booking_owner_block: {
        Args: { p_check_in: string; p_check_out: string; p_idempotency_key: string };
        Returns: string;
      };
      release_booking_owner_block: { Args: { p_block_id: string }; Returns: undefined };
      read_booking_availability: {
        Args: { p_check_in: string; p_check_out: string };
        Returns: Array<{ check_in_date: string; check_out_date: string }>;
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
      property_media: { Row: OwnerMedia; Insert: Record<string, never>; Update: Record<string, never>; Relationships: [] };
      website_booking_intakes: { Row: { request_id: string; estimate: PublicPriceEstimate; receipt: Record<string, unknown>; created_at: string }; Insert: never; Update: never; Relationships: [] };
      booking_notification_outbox: { Row: { id: string; request_id: string; recipient_kind: string; status: string; attempts: number; lease_until: string | null; first_attempt_at: string | null; next_attempt_at: string }; Insert: never; Update: never; Relationships: [] };

      calendar_rate_heads: { Row: { package_code: BookingPackageCode; next_revision: number; published_revision_id: string | null }; Insert: never; Update: never; Relationships: [] };
      calendar_rate_revisions: { Row: { id: string; package_code: BookingPackageCode; revision: number; base_revision_id: string | null; save_key: string; publication_key: string | null; status: "DRAFT" | "PUBLISHED"; created_by: string; created_at: string; published_by: string | null; published_at: string | null }; Insert: never; Update: never; Relationships: [] };
      calendar_rate_rules: { Row: RateRule & { revision_id: string; position: number }; Insert: never; Update: never; Relationships: [] };
      calendar_rate_events: { Row: { id: string; revision_id: string; event: "DRAFT_SAVED" | "PUBLISHED"; actor_id: string; created_at: string }; Insert: never; Update: never; Relationships: [] };
      booking_quote_pricing_snapshots: { Row: { quote_id: string; breakdown: QuoteBreakdown; created_by: string; created_at: string }; Insert: never; Update: never; Relationships: [] };
      booking_deposit_verifications: {
        Row: { id: string; idempotency_key: string; deposit_id: string; decision: "VERIFIED" | "REJECTED"; independently_verified: boolean; actor_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      property_occupancies: {
        Row: { id: string; idempotency_key: string; property_id: number; check_in_date: string; check_out_date: string; kind: "RESERVATION" | "OWNER_BLOCK"; reservation_id: string | null; active: boolean; created_by: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      property_occupancy_events: {
        Row: { id: string; occupancy_id: string; event: "CREATED" | "RELEASED"; actor_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      booking_reservation_events: {
        Row: { id: string; reservation_id: string; previous_status: ReservationStatus | null; new_status: ReservationStatus; actor_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
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
          policy_version?:string;adults_count?:number;older_children_count?:number;exempt_children_count?:number;countable_guest_count?:number;extra_guests_requested?:number;occupancy_owner_review?:boolean;
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
          idempotency_key?: string | null;
          quote_id?: string | null;
          property_id?: number | null;
          package_code?: BookingPackageCode | null;
          check_in_date?: string | null;
          check_out_date?: string | null;
          overnight_guest_count?: number | null;
          folding_foams_requested?: boolean | null;
          verified_deposit_total?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["booking_reservations"]["Insert"]>;
        Relationships: [];
      };
    };
  };
}
