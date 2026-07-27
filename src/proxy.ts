import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase Auth session cookie and enforces admin
 * authentication for every request touching /admin, per the official
 * Supabase SSR pattern for Next.js. If Supabase env vars aren't configured
 * yet (fresh clone, no owner project set up), this no-ops instead of
 * breaking every request — admin pages then show their own "not configured"
 * messaging rather than an infinite/broken redirect.
 *
 * This is the primary enforcement point for admin route protection —
 * `redirect()` called from src/app/admin/(protected)/layout.tsx as a second
 * line of defense was found unreliable in this Next.js/Turbopack dev setup
 * (the redirect throw didn't consistently short-circuit child rendering);
 * NextResponse.redirect() at the proxy layer is the robust mechanism.
 *
 * Named `proxy` in `src/proxy.ts` (not `middleware.ts`/`middleware()`) —
 * Next.js 16 renamed this file convention; `middleware` is deprecated.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/admin/login");
  if (!user && !isLoginRoute) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
