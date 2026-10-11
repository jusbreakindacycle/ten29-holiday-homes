import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnvError } from "@/lib/env";

type AuthGetUserResult = { data: { user: User | null }; error: unknown };

/** Pure decision logic, kept separate from the Supabase call so it's unit-testable. */
export function resolveAdminUser(result: AuthGetUserResult, isAuthorizedAdmin: boolean): User | null {
  if (result.error || !result.data.user || !isAuthorizedAdmin) return null;
  return result.data.user;
}

/**
 * The single source of truth for "is this request an authenticated admin?".
 * Every /admin/(protected) route calls this via the layout — see
 * src/app/admin/(protected)/layout.tsx — and redirects to /admin/login when
 * it returns null. Never trust a client-side-only check for this.
 */
export async function getAdminUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.getUser();
    if (result.error || !result.data.user) return null;

    const { data: isAuthorizedAdmin, error } = await supabase.rpc("is_ten29_admin");
    if (error) return null;

    return resolveAdminUser(result, isAuthorizedAdmin === true);
  } catch (err) {
    // Supabase isn't configured yet (fresh clone, no owner project set up).
    // Treat as "not authenticated" so /admin redirects to /admin/login
    // instead of crashing with a 500 — the login page's own sign-in attempt
    // will surface a clearer "not available" message.
    if (err instanceof MissingEnvError) return null;
    throw err;
  }
}
