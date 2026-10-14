/**
 * Lazy, request-time environment accessors. Never read at module load time —
 * that would make `next build` fail whenever a provider isn't configured yet.
 * See docs/10_TECHNICAL_ARCHITECTURE.md ("Build-without-credentials guarantee").
 */

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = "MissingEnvError";
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingEnvError(name);
  return value;
}

export function getSupabaseUrl(): string {
  const value = required("NEXT_PUBLIC_SUPABASE_URL");
  const url = new URL(value);
  if (process.env.TEN29_PROVIDER_E2E === 'true' && url.origin !== 'http://127.0.0.1:54321')
    throw new Error('Disposable provider tests require the isolated localhost endpoint');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid Supabase endpoint');
  return value;
}

export function getSupabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey(): string {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  if (key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Privileged and public credentials must differ');
  return key;
}

export function getResendApiKey(): string {
  return required("RESEND_API_KEY");
}

export function getInquiryNotificationTo(): string {
  return required("INQUIRY_NOTIFICATION_TO");
}

export function getInquiryFromEmail(): string {
  return required("INQUIRY_FROM_EMAIL");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
