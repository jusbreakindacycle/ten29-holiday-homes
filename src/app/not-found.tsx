import { Wordmark } from "@/components/brand/Wordmark";
import { CtaLink } from "@/components/ui/CtaButton";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ivory px-6 text-center">
      <Wordmark />
      <div>
        <h1 className="font-heading text-4xl text-forest">Page not found</h1>
        <p className="mt-2 max-w-md text-muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved. TEN29&rsquo;s
          contact details are below if you need help.
        </p>
      </div>
      <div className="flex gap-4">
        <CtaLink href="/">Back to Home</CtaLink>
        <CtaLink href="/contact" variant="secondary">
          Contact TEN29
        </CtaLink>
      </div>
    </div>
  );
}
