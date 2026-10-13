import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ownerMediaLibrary } from '@/services/media-service';
import { MediaManager } from '@/components/features/admin/MediaManager';
import type { OwnerMedia } from '@/types/media';
import { getPublicClaims } from '@/content/claims';
export const dynamic='force-dynamic';
export default async function MediaPage() {
 let media:OwnerMedia[]|null=null;
 try { media=await ownerMediaLibrary(await createSupabaseServerClient()); } catch {}
 const claims=getPublicClaims().filter(c=>c.category==='fact'&&typeof c.value==='string').map(c=>({id:c.id,label:c.label}));
 return <section><h1 className="mb-4 text-3xl text-forest">Media Management</h1>{media?<MediaManager initial={media} claims={claims} />:<p role="alert">OWNER access required. If you are the owner, reload to retry.</p>}</section>;
}
