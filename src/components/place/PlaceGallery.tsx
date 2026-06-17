"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Real-image gallery with a click-to-expand lightbox. `images` is already
// de-duplicated by the caller (cover first).
export function PlaceGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        No photos yet
      </div>
    );
  }

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }
  const go = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % images.length);

  const [cover, ...rest] = images;
  const thumbs = rest.slice(0, 4);

  return (
    <>
      <div
        className={cn(
          "grid gap-2 overflow-hidden rounded-2xl",
          thumbs.length > 0 ? "grid-cols-4 grid-rows-2" : "grid-cols-1"
        )}
      >
        <button
          type="button"
          onClick={() => openAt(0)}
          className={cn(
            "group relative aspect-[4/3] sm:aspect-auto",
            thumbs.length > 0 ? "col-span-4 row-span-2 sm:col-span-2" : "col-span-1"
          )}
        >
          <Image
            src={cover}
            alt={name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>

        {thumbs.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => openAt(i + 1)}
            className="group relative hidden aspect-square sm:col-span-1 sm:block"
          >
            <Image
              src={src}
              alt={`${name} photo ${i + 2}`}
              fill
              sizes="25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {i === thumbs.length - 1 && rest.length > thumbs.length && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                +{rest.length - thumbs.length} more
              </span>
            )}
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{name} photos</DialogTitle>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-black">
            <Image
              src={images[index]}
              alt={`${name} photo ${index + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  {index + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
