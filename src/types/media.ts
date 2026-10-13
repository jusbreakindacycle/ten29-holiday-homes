export type MediaState = 'UPLOADING' | 'PROCESSING' | 'READY_FOR_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED' | 'FAILED' | 'ARCHIVED';
export type OwnerMedia = {
 id: string; kind: 'PHOTO' | 'VIDEO'; mime: string; bytes: number; original_key: string;
 rendition_key: string | null; poster_key: string | null; state: MediaState;
 title: string; caption: string; alt: string; category: string; position: number; public_claim_id: string | null;
 featured: boolean; rights_acknowledged: boolean; version: number; failure_code: string | null;
 lease: string | null; processing_info: Record<string, unknown>; created_at: string; cleaned_at: string | null;
}
export type PublicMedia = { id: string; kind: 'PHOTO' | 'VIDEO'; category: string; featured: boolean; version: number; public_claim_id: string | null }
export type MediaDelivery = { id: string; kind: 'PHOTO' | 'VIDEO'; rendition: string; poster: string | null; info: Record<string, unknown> }
