/**
 * Minimal in-memory stand-in for the Supabase query builder, covering only
 * the method combinations src/services/inquiry-service.ts actually uses.
 * Not a general-purpose Supabase mock.
 */
type Row = Record<string, unknown>;
type FakeError = { code: string; message: string };

let idCounter = 1;

const INQUIRY_DEFAULTS: Row = {
  status: "NEW",
  notification_status: "PENDING",
  notification_error: null,
  owner_notes: null,
  contacted_at: null,
  closed_at: null,
  children: 0,
  day_visitors: 0,
  vehicles: 0,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  purpose_of_stay: null,
  message: null,
  email: null,
};

export function createFakeSupabaseClient() {
  const tables: Record<string, Row[]> = {
    inquiries: [],
    inquiry_audit_events: [],
    booking_properties: [],
    property_packages: [],
    booking_requests: [],
    booking_quotes: [],
    booking_deposits: [],
    booking_request_events: [],
    booking_reservations: [],
  };
  let isTen29Admin = true;
  let isTen29Owner = false;

  function from(table: string) {
    const rows = tables[table];
    const filters: Array<(row: Row) => boolean> = [];
    let orderBy: { column: string; ascending: boolean } | null = null;
    let mode: "select" | "insert" | "update" = "select";
    let insertPayload: Row | null = null;
    let updatePayload: Row | null = null;

    function execute(): { data: Row[] | null; error: FakeError | null } {
      if (mode === "insert" && insertPayload) {
        const uniqueColumns = table === "inquiries"
          ? ["reference_code"]
          : table === "booking_requests"
            ? ["idempotency_key", "inquiry_id"]
            : table === "booking_quotes" || table === "booking_deposits"
              ? ["idempotency_key"]
              : [];
        if (uniqueColumns.some((column) => insertPayload![column] != null
          && rows.some((row) => row[column] === insertPayload![column]))) {
          return {
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint" },
          };
        }
        if (table === "booking_quotes" && rows.some((row) =>
          row.request_id === insertPayload!.request_id && row.revision === insertPayload!.revision
        )) {
          return { data: null, error: { code: "23505", message: "duplicate quote revision" } };
        }
        const tableDefaults: Record<string, Row> = {
          inquiries: INQUIRY_DEFAULTS,
          booking_requests: { property_id: 1, status: "NEW", created_by: "admin-user" },
          booking_quotes: {
            status: "DRAFT", currency: "PHP", amount_total: null, required_deposit_amount: null,
            valid_until: null, line_items: [], owner_approved_by: null, owner_approved_at: null,
            issued_by: null, issued_at: null, created_by: "admin-user",
          },
          booking_deposits: {
            status: "RECORDED_UNVERIFIED", recorded_by: "admin-user", verified_by: null, verified_at: null,
          },
        };
        const newRow: Row = {
          id: `00000000-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(tableDefaults[table] ?? {}),
          ...insertPayload,
        };
        rows.push(newRow);
        return { data: [newRow], error: null };
      }

      let result = rows.filter((row) => filters.every((f) => f(row)));

      if (mode === "update" && updatePayload) {
        result = result.map((row) =>
          Object.assign(row, updatePayload, { updated_at: new Date().toISOString() })
        );
      }

      if (orderBy) {
        const { column, ascending } = orderBy;
        result = [...result].sort((a, b) => {
          const dir = ascending ? 1 : -1;
          return (a[column] as string) > (b[column] as string) ? dir : -dir;
        });
      }

      return { data: result, error: null };
    }

    const builder = {
      insert(payload: Row) {
        mode = "insert";
        insertPayload = payload;
        return builder;
      },
      update(payload: Row) {
        mode = "update";
        updatePayload = payload;
        return builder;
      },
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return builder;
      },
      gte(column: string, value: unknown) {
        filters.push((row) => (row[column] as string) >= (value as string));
        return builder;
      },
      or(expr: string) {
        const term = expr.match(/%(.*?)%/)?.[1]?.toLowerCase() ?? "";
        filters.push((row) =>
          ["full_name", "mobile_number", "reference_code"].some((col) =>
            String(row[col] ?? "").toLowerCase().includes(term)
          )
        );
        return builder;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        orderBy = { column, ascending: opts?.ascending ?? true };
        return builder;
      },
      limit() {
        return builder;
      },
      async single() {
        const { data, error } = execute();
        if (error) return { data: null, error };
        if (!data || data.length === 0) {
          return { data: null, error: { code: "PGRST116", message: "Row not found" } };
        }
        return { data: data[0], error: null };
      },
      async maybeSingle() {
        const { data, error } = execute();
        return { data: data?.[0] ?? null, error };
      },
      then(
        onFulfilled: (value: { data: Row[] | null; error: FakeError | null }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        return Promise.resolve(execute()).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    auth: {
      async getUser() {
        return { data: { user: { id: "admin-user", email: "admin@example.test" } }, error: null };
      },
    },
    async rpc(functionName: string, args?: { p_quote_id?: string }) {
      if (functionName === "is_ten29_owner") return { data: isTen29Owner, error: null };
      if (functionName === "issue_booking_quote") {
        if (!isTen29Owner) return { data: null, error: { code: "42501", message: "TEN29 owner authorization required" } };
        const quote = tables.booking_quotes.find((row) => row.id === args?.p_quote_id);
        if (!quote || quote.status !== "DRAFT" || quote.amount_total == null || quote.required_deposit_amount == null) {
          return { data: null, error: { code: "23514", message: "Quote must be a draft with owner-approved total and deposit" } };
        }
        quote.status = "ISSUED";
        quote.owner_approved_by = "admin-user";
        quote.owner_approved_at = new Date().toISOString();
        quote.issued_by = "admin-user";
        quote.issued_at = new Date().toISOString();
        const request = tables.booking_requests.find((row) => row.id === quote.request_id);
        if (request?.status === "REVIEWING") request.status = "QUOTED";
        return { data: null, error: null };
      }
      if (functionName !== "is_ten29_admin") {
        return { data: null, error: { code: "42883", message: "Function not found" } };
      }
      return { data: isTen29Admin, error: null };
    },
    _setAdmin(value: boolean) {
      isTen29Admin = value;
    },
    _setOwner(value: boolean) {
      isTen29Owner = value;
    },
    _tables: tables,
  };
}
