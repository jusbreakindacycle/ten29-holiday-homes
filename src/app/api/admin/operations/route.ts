import { createSupabaseServerClient } from '@/lib/supabase/server';
import { operationalConfigIssues } from '@/lib/operational-config';
import { operationalLog } from '@/lib/operational-log';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };
export async function GET() {
  try {
    const client = await createSupabaseServerClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (!user || error) return Response.json({ error: 'OWNER access required' }, { status: 403, headers });
    const owner = await client.rpc('is_ten29_owner');
    if (owner.error || owner.data !== true) return Response.json({ error: 'OWNER access required' }, { status: 403, headers });
    // Existing membership RLS; no privileged client or new grants.
    const [notifications, media] = await Promise.all([
      client.from('booking_notification_outbox').select('status,lease_until,first_attempt_at').neq('status', 'SENT').limit(1001),
      client.from('property_media').select('state,lease_until,created_at,quota_bytes').is('cleaned_at', null).limit(201),
    ]);
    if (notifications.error || media.error) throw Error();
    const now = Date.now();
    const tasks = notifications.data ?? [];
    const assets = media.data ?? [];
    return Response.json({ checked_at: new Date(now).toISOString(), database: 'reachable',
      configuration_issues: operationalConfigIssues(process.env),
      notifications: { pending: tasks.length, failed: tasks.filter(t => t.status === 'FAILED').length,
        expired_leases: tasks.filter(t => t.status === 'SENDING' && t.lease_until && Date.parse(t.lease_until) < now).length,
        delivery_review: tasks.filter(t => t.first_attempt_at && now - Date.parse(t.first_attempt_at) >= 23 * 3600000).length,
        truncated: tasks.length > 1000 },
      media: { retained: assets.length, reserved_bytes: assets.reduce((sum, m) => sum + m.quota_bytes, 0),
        failed: assets.filter(m => m.state === 'FAILED').length,
        expired_processing: assets.filter(m => m.state === 'PROCESSING' && m.lease_until && Date.parse(m.lease_until) < now).length,
        abandoned_uploads: assets.filter(m => m.state === 'UPLOADING' && now - Date.parse(m.created_at) > 3600000).length,
        cleanup_pending: assets.filter(m => m.state === 'ARCHIVED').length },
    }, { headers });
  } catch {
    operationalLog('diagnostics_unavailable');
    return Response.json({ error: 'Operational diagnostics unavailable' }, { status: 503, headers });
  }
}
