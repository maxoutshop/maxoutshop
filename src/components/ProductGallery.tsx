import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Product image gallery.
 *
 * Mobile: a native horizontal scroll-snap track — momentum swipe feels iOS
 * native, and because it's real scrolling it never fights vertical page
 * scroll or trigger the pinch/zoom issues a custom gesture handler would.
 * Desktop: arrow controls plus clickable indicators/thumbnails.
 */
export function ProductGallery({
  images,
  alt,
  resetKey,
}: {
  images: string[];
  alt: string;
  /** Change this (e.g. selected color) to snap back to the first image. */
  resetKey?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;

  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Whenever the active image set changes, clamp/reset position.
  useEffect(() => {
    setIndex(0);
    scrollTo(0, false);
  }, [resetKey, count, scrollTo]);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.min(Math.max(i, 0), Math.max(count - 1, 0)));
  };

  const go = (dir: -1 | 1) => {
    const next = (index + dir + count) % count;
    setIndex(next);
    scrollTo(next);
  };

  if (count === 0) return <div className="aspect-[3/4] w-full bg-secondary" />;

  return (
    <>
      <div className="relative bg-secondary">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: "pan-x pan-y", WebkitOverflowScrolling: "touch" }}
        >
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setZoomed(true)}
              aria-label={`${alt} — view image ${i + 1} full screen`}
              className="w-full shrink-0 snap-center"
            >
              <img
                src={src}
                alt={`${alt} — image ${i + 1} of ${count}`}
                className="aspect-[3/4] w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
              />
            </button>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/70 backdrop-blur transition hover:bg-background sm:grid"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/70 backdrop-blur transition hover:bg-background sm:grid"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  onClick={() => {
                    setIndex(i);
                    scrollTo(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button
              key={`t-${src}-${i}`}
              type="button"
              onClick={() => {
                setIndex(i);
                scrollTo(i);
              }}
              aria-label={`Show image ${i + 1}`}
              className={`h-16 w-12 shrink-0 overflow-hidden rounded-md border transition ${i === index ? "border-foreground" : "border-border opacity-60"}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div className="fixed inset-0 z-100 bg-background">
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close image viewer"
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10 grid h-10 w-10 place-items-center rounded-full border border-border bg-background/80 backdrop-blur"
          >
            <X className="h-4 w-4" />
          </button>
          <div
            className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ touchAction: "pan-x pan-y" }}
            ref={(el) => {
              if (el) el.scrollLeft = el.clientWidth * index;
            }}
          >
            {images.map((src, i) => (
              <div key={`z-${i}`} className="grid h-full w-full shrink-0 snap-center place-items-center p-4">
                <img src={src} alt={`${alt} — image ${i + 1}`} className="max-h-full w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
