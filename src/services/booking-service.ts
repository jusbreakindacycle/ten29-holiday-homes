import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createBookingQuoteDraftSchema,
  createBookingRequestSchema,
  isValidBookingRequestTransition,
  recordBookingDepositSchema,
  BOOKING_REQUEST_STATUSES,
  type BookingDeposit,
  type BookingQuote,
  type BookingRequest,
  type BookingRequestStatus,
  type CreateBookingQuoteDraftInput,
  type CreateBookingRequestInput,
  type RecordBookingDepositInput,
} from "@/types/booking";

export type BookingDbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export class BookingServiceError extends Error {}

async function requireTen29Admin(client: BookingDbClient): Promise<string> {
  const { data, error } = await client.rpc("is_ten29_admin");
  if (error || data !== true) throw new BookingServiceError("Unauthorized");

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw new BookingServiceError("Unauthorized");
  return authData.user.id;
}

function throwDatabaseError(message: string): never {
  throw new BookingServiceError(message);
}

function sameRequest(existing: BookingRequest, input: CreateBookingRequestInput): boolean {
  return existing.inquiry_id === (input.inquiry_id ?? null)
    && existing.source === input.source
    && existing.package_code === input.package_code
    && existing.check_in_date === input.check_in_date
    && existing.check_out_date === input.check_out_date;
}

export async function createBookingRequest(
  client: BookingDbClient,
  rawInput: CreateBookingRequestInput
): Promise<BookingRequest> {
  await requireTen29Admin(client);
  const parsed = createBookingRequestSchema.safeParse(rawInput);
  if (!parsed.success) throw new BookingServiceError("Invalid booking request");
  const input = parsed.data;

  if (input.source === "WEBSITE") {
    const { data: inquiry, error } = await client
      .from("inquiries")
      .select("id, source, check_in_date, check_out_date")
      .eq("id", input.inquiry_id!)
      .maybeSingle();
    if (error || !inquiry || inquiry.source.toLowerCase() !== "website"
      || inquiry.check_in_date !== input.check_in_date
      || inquiry.check_out_date !== input.check_out_date) {
      throw new BookingServiceError("Website request must link to a website enquiry");
    }
  }

  if (input.idempotency_key) {
    const { data: existing, error } = await client
      .from("booking_requests")
      .select("*")
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();
    if (error) throw new BookingServiceError("Could not check request idempotency");
    if (existing) {
      if (!sameRequest(existing as BookingRequest, input)) {
        throw new BookingServiceError("Idempotency key was already used for a different request");
      }
      return existing as BookingRequest;
    }
  }

  const { data, error } = await client
    .from("booking_requests")
    .insert({
      idempotency_key: input.idempotency_key ?? null,
      inquiry_id: input.inquiry_id ?? null,
      package_code: input.package_code,
      source: input.source,
      check_in_date: input.check_in_date,
      check_out_date: input.check_out_date,
    })
    .select("*")
    .single();
  if (error?.code === "23505" && input.idempotency_key) {
    const { data: existing } = await client
      .from("booking_requests")
      .select("*")
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();
    if (existing && sameRequest(existing as BookingRequest, input)) return existing as BookingRequest;
  }
  if (error || !data) throwDatabaseError(error?.code === "23505" ? "Duplicate booking request" : "Could not create booking request");
  return data as BookingRequest;
}

export async function transitionBookingRequest(
  client: BookingDbClient,
  requestId: string,
  nextStatus: BookingRequestStatus
): Promise<BookingRequest> {
  await requireTen29Admin(client);
  if (!z.string().uuid().safeParse(requestId).success
    || !BOOKING_REQUEST_STATUSES.includes(nextStatus)) {
    throw new BookingServiceError("Invalid booking request transition");
  }

  const { data: current, error: readError } = await client
    .from("booking_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (readError || !current) throw new BookingServiceError("Booking request not found");
  const currentRequest = current as BookingRequest;
  if (!isValidBookingRequestTransition(currentRequest.status, nextStatus)) {
    throw new BookingServiceError(`Cannot move a request from ${currentRequest.status} to ${nextStatus}`);
  }
  if (currentRequest.status === nextStatus) return currentRequest;

  const { data, error } = await client
    .from("booking_requests")
    .update({ status: nextStatus })
    .eq("id", requestId)
    .eq("status", currentRequest.status)
    .select("*")
    .maybeSingle();
  if (error || !data) throw new BookingServiceError("Request changed concurrently or transition was rejected");
  return data as BookingRequest;
}

export async function createBookingQuoteDraft(
  client: BookingDbClient,
  rawInput: CreateBookingQuoteDraftInput
): Promise<BookingQuote> {
  await requireTen29Admin(client);
  const parsed = createBookingQuoteDraftSchema.safeParse(rawInput);
  if (!parsed.success) throw new BookingServiceError("Invalid quote draft");
  const input = parsed.data;

  if (input.idempotency_key) {
    const { data: existing, error } = await client
      .from("booking_quotes")
      .select("*")
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();
    if (error) throw new BookingServiceError("Could not check quote idempotency");
    if (existing) {
      const quote = existing as BookingQuote;
      if (quote.request_id !== input.request_id || quote.revision !== input.revision) {
        throw new BookingServiceError("Idempotency key was already used for a different quote");
      }
      return quote;
    }
  }

  const { data, error } = await client
    .from("booking_quotes")
    .insert({
      idempotency_key: input.idempotency_key ?? null,
      request_id: input.request_id,
      revision: input.revision,
      currency: "PHP",
      amount_total: input.amount_total ?? null,
      required_deposit_amount: input.required_deposit_amount ?? null,
      valid_until: input.valid_until ?? null,
      line_items: input.line_items,
    })
    .select("*")
    .single();
  if (error?.code === "23505" && input.idempotency_key) {
    const { data: existing } = await client
      .from("booking_quotes")
      .select("*")
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();
    if (existing) {
      const quote = existing as BookingQuote;
      const sameSnapshot = quote.request_id === input.request_id
        && quote.revision === input.revision
        && quote.amount_total === (input.amount_total ?? null)
        && quote.required_deposit_amount === (input.required_deposit_amount ?? null)
        && quote.valid_until === (input.valid_until ?? null)
        && JSON.stringify(quote.line_items) === JSON.stringify(input.line_items);
      if (sameSnapshot) return quote;
    }
  }
  if (error || !data) throw new BookingServiceError("Could not create quote draft");
  return data as BookingQuote;
}

export async function issueBookingQuote(client: BookingDbClient, quoteId: string): Promise<BookingQuote> {
  await requireTen29Admin(client);
  if (!z.string().uuid().safeParse(quoteId).success) throw new BookingServiceError("Invalid quote ID");

  const { data: isOwner, error: ownerError } = await client.rpc("is_ten29_owner");
  if (ownerError || isOwner !== true) throw new BookingServiceError("TEN29 owner authorization required");

  const { error } = await client.rpc("issue_booking_quote", { p_quote_id: quoteId });
  if (error) throw new BookingServiceError(error.message || "Could not issue owner-approved quote");

  const { data, error: readError } = await client
    .from("booking_quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (readError || !data) throw new BookingServiceError("Quote was issued but could not be reloaded");
  return data as BookingQuote;
}

export async function recordUnverifiedBookingDeposit(
  client: BookingDbClient,
  rawInput: RecordBookingDepositInput
): Promise<BookingDeposit> {
  await requireTen29Admin(client);
  const parsed = recordBookingDepositSchema.safeParse(rawInput);
  if (!parsed.success) throw new BookingServiceError("Invalid deposit record");
  const input = parsed.data;

  const { data: request, error: requestError } = await client
    .from("booking_requests")
    .select("id, status")
    .eq("id", input.request_id)
    .maybeSingle();
  if (requestError || !request) throw new BookingServiceError("Booking request not found");
  if (request.status !== "AWAITING_DEPOSIT") {
    throw new BookingServiceError("Deposit can only be recorded for a request awaiting deposit");
  }

  if (input.idempotency_key) {
    const { data: existing, error } = await client
      .from("booking_deposits")
      .select("*")
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();
    if (error) throw new BookingServiceError("Could not check deposit idempotency");
    if (existing) {
      const deposit = existing as BookingDeposit;
      if (deposit.request_id !== input.request_id || deposit.amount !== input.amount) {
        throw new BookingServiceError("Idempotency key was already used for a different deposit");
      }
      return deposit;
    }
  }

  const { data, error } = await client
    .from("booking_deposits")
    .insert({
      idempotency_key: input.idempotency_key ?? null,
      request_id: input.request_id,
      amount: input.amount,
      payment_method: input.payment_method?.trim() || null,
      external_reference_masked: input.external_reference_masked?.trim() || null,
    })
    .select("*")
    .single();
  if (error?.code === "23505" && input.idempotency_key) {
    const { data: existing } = await client
      .from("booking_deposits")
      .select("*")
      .eq("idempotency_key", input.idempotency_key)
      .maybeSingle();
    if (existing) {
      const deposit = existing as BookingDeposit;
      if (deposit.request_id === input.request_id && deposit.amount === input.amount) return deposit;
    }
  }
  if (error || !data) throw new BookingServiceError("Could not record unverified deposit");
  return data as BookingDeposit;
}