"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { CtaButton } from "@/components/ui/CtaButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("Sign-in failed. Check your email and password and try again.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Sign-in is not available right now. Please try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-ivory px-6 py-16">
      <Wordmark />
      <div className="w-full max-w-sm rounded-sm border border-border bg-white p-8">
        <h1 className="font-heading text-2xl text-forest text-center">Admin sign-in</h1>
        <p className="mt-1 text-center text-sm text-muted">
          Authorized TEN29 staff only. No public registration.
        </p>

        {error ? (
          <div className="mt-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField label="Email" htmlFor="email" required>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASSES}
            />
          </FormField>

          <FormField label="Password" htmlFor="password" required>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASSES}
            />
          </FormField>

          <CtaButton type="submit" disabled={pending} aria-busy={pending} className="w-full">
            {pending ? "Signing in…" : "Sign In"}
          </CtaButton>
        </form>
      </div>
    </div>
  );
}
