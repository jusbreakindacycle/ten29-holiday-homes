import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/supabase/get-admin-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listInquiries, inquiriesToCsv } from "@/services/inquiry-service";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/types/inquiry";

// Route Handlers are NOT wrapped by src/app/admin/(protected)/layout.tsx —
// that layout only protects rendered pages. This handler must check auth itself.
export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const client = await createSupabaseServerClient();

  const inquiries = await listInquiries(client, {
    status: status && INQUIRY_STATUSES.includes(status as InquiryStatus) ? (status as InquiryStatus) : undefined,
    search: searchParams.get("search") || undefined,
    checkInFrom: searchParams.get("checkInFrom") || undefined,
    source: searchParams.get("source") || undefined,
  });

  const csv = inquiriesToCsv(inquiries);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ten29-inquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
