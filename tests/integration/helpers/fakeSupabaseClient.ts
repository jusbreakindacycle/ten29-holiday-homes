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
  const tables: Record<string, Row[]> = { inquiries: [], inquiry_audit_events: [] };

  function from(table: string) {
    const rows = tables[table];
    const filters: Array<(row: Row) => boolean> = [];
    let orderBy: { column: string; ascending: boolean } | null = null;
    let mode: "select" | "insert" | "update" = "select";
    let insertPayload: Row | null = null;
    let updatePayload: Row | null = null;

    function execute(): { data: Row[] | null; error: FakeError | null } {
      if (mode === "insert" && insertPayload) {
        if (table === "inquiries" && rows.some((r) => r.reference_code === insertPayload!.reference_code)) {
          return {
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint" },
          };
        }
        const newRow: Row = {
          id: `fake-${idCounter++}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(table === "inquiries" ? INQUIRY_DEFAULTS : {}),
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

  return { from, _tables: tables };
}
