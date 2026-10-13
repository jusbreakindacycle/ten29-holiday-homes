/* eslint-disable @next/next/no-img-element -- revocable media uses already optimized, no-store renditions */
import { readPublicMedia } from '@/services/media-service';
import { MEDIA_CATEGORIES } from '@/lib/media-validation';
import { getPublicClaims } from '@/content/claims';
/** No optimizer/CDN caching: each byte request rechecks current publication. */
export async function PublishedMedia({placement='gallery'}:{placement?:'gallery'|'home'|'property'}) {
 const library=await readPublicMedia();
 if(!library) return placement==='gallery'?<p role="status">Media is temporarily unavailable. Please reload to retry.</p>:null;
 const media=placement==='home'?library.filter(m=>m.featured).slice(0,1):library;
 if(!media.length) return placement==='gallery'?<p className="mt-8">Owner-authorized photos and videos will appear here after publication. No property media has been published yet.</p>:null;
 return <div className={`grid gap-6 ${placement==='home'?'':'sm:grid-cols-2 lg:grid-cols-3'}`}>
  {media.map(m=>{const category=MEDIA_CATEGORIES.includes(m.category as typeof MEDIA_CATEGORIES[number])?m.category:'Property media';const claim=getPublicClaims().find(c=>c.id===m.public_claim_id && c.category==='fact' && typeof c.value==='string');const approved=claim&&typeof claim.value==='string'?claim.value:null;const alt=approved??`TEN29 ${category.toLowerCase()} ${m.kind==='PHOTO'?'photo':'video'}`;
   return <figure key={m.id} className="overflow-hidden rounded-xl border border-border bg-ivory">
    {m.kind==='PHOTO'?<a href={`/api/media/${m.id}`} target="_blank" rel="noopener" aria-label={`Enlarge ${alt}`}><img src={`/api/media/${m.id}`} srcSet={`/api/media/${m.id}?poster=1 480w, /api/media/${m.id} 1600w`} sizes={placement==='home'?'100vw':'(max-width: 640px) 100vw, 33vw'} alt={alt} loading={placement==='home'?'eager':'lazy'} className="aspect-video w-full object-cover" /></a>:<video src={`/api/media/${m.id}`} poster={`/api/media/${m.id}?poster=1`} controls preload="none" aria-label={alt} className="aspect-video w-full" />}
    <figcaption className="p-4 text-sm text-forest">{approved??category}</figcaption>
   </figure>;
  })}
 </div>;
}
