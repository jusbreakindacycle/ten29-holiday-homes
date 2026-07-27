import Image from "next/image";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

export function GalleryCard({
  src,
  alt,
  caption,
}: {
  src?: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-sm border border-border bg-white">
      {src ? (
        <div className="relative aspect-[4/3] w-full bg-sand">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <PlaceholderImage label={alt} />
      )}
      {caption ? (
        <figcaption className="px-4 py-3 text-sm text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
