"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isPrivilegedPublicKey } from '@/lib/public-key';
import type { Database } from "@/types/database";

/** Browser client for the admin login form only — never used for guest data. */
export function createSupabaseBrowserClient() {
  if (isPrivilegedPublicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) throw new Error('Privileged credentials cannot be public');
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
