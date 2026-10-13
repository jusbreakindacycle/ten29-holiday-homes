import type { Metadata } from 'next';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { PublishedMedia } from '@/components/features/media/PublishedMedia';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Gallery',description:'Owner-published photos and videos of TEN29 Holiday Homes.'};
export default function GalleryPage(){return <div className="mx-auto max-w-6xl space-y-8 px-6 py-16"><SectionHeading as="h1" eyebrow="Gallery" title="TEN29 in pictures" description="Original owner-authorized property photos and videos. One private house for one guest group." /><PublishedMedia /></div>;}
