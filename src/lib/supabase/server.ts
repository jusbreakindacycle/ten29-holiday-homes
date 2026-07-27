import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";

/**
 * Session-bound server client. Respects RLS as the signed-in admin user.
 * Create a fresh instance per request — never module-level/shared.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render where cookies can't be
          // written; the middleware is responsible for session refresh there.
        }
      },
    },
  });
}

/**
 * Privileged, RLS-bypassing client for server-only writes: the public
 * enquiry insert and audit-event logging. Never import this outside
 * src/services/* and never expose it to a Client Component.
 */
export function createSupabaseServiceRoleClient() {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
