"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { createEntry } from "@/lib/actions/journal";
import { createClient } from "@/lib/supabase/client";
import { reportError } from "@/lib/observability";
import {
  JOURNAL_PHOTO_BUCKET,
  MAX_PHOTOS_PER_ENTRY,
  buildJournalPhotoPath,
  validateImageFiles,
} from "@/lib/upload";
import { cn } from "@/lib/utils";
import type { Place, Trip } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";

export function AddMemoryDialog({
  trips,
  places,
  userId,
}: {
  trips: Trip[];
  places: Place[];
  userId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [tripId, setTripId] = useState(NONE);
  const [placeId, setPlaceId] = useState(NONE);
  const [visitedAt, setVisitedAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setBody("");
    setRating(0);
    setTripId(NONE);
    setPlaceId(NONE);
    setVisitedAt("");
    setFiles([]);
  }

  // Uploads validated photos to the user's own Storage folder. Returns both the
  // public URLs (persisted on the entry) and the object paths (for cleanup if
  // the DB insert later fails).
  async function uploadPhotos(): Promise<{ urls: string[]; paths: string[] }> {
    if (files.length === 0) return { urls: [], paths: [] };
    const supabase = createClient();
    const urls: string[] = [];
    const paths: string[] = [];
    for (const file of files) {
      const path = buildJournalPhotoPath(userId, file.name);
      const { error } = await supabase.storage
        .from(JOURNAL_PHOTO_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      paths.push(path);
      urls.push(
        supabase.storage.from(JOURNAL_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
      );
    }
    return { urls, paths };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && files.length === 0 && rating === 0) {
      toast.error("Add a note, rating, or photo first.");
      return;
    }
    // Validate type/size/count up front so we never start an upload we can't finish.
    if (files.length > 0) {
      const check = validateImageFiles(files);
      if (!check.ok) {
        toast.error(check.error);
        return;
      }
    }

    startTransition(async () => {
      let uploadedPaths: string[] = [];
      try {
        // 1. Upload photos (storage RLS enforces the per-user folder + MIME/size).
        let urls: string[] = [];
        try {
          const res = await uploadPhotos();
          urls = res.urls;
          uploadedPaths = res.paths;
        } catch (err) {
          reportError(err, { source: "AddMemoryDialog.uploadPhotos", userId });
          toast.error("Photo upload failed. Check the file type/size and try again.");
          return;
        }

        // 2. Persist the entry. Only now do we treat it as success.
        try {
          await createEntry({
            body: body.trim() || null,
            rating: rating || null,
            tripId: tripId === NONE ? null : tripId,
            placeId: placeId === NONE ? null : placeId,
            visitedAt: visitedAt || null,
            photoUrls: urls,
          });
        } catch (err) {
          // DB insert failed after upload — clean up the orphaned files.
          if (uploadedPaths.length > 0) {
            try {
              await createClient()
                .storage.from(JOURNAL_PHOTO_BUCKET)
                .remove(uploadedPaths);
            } catch (cleanupErr) {
              reportError(cleanupErr, {
                source: "AddMemoryDialog.cleanup",
                paths: uploadedPaths,
              });
            }
          }
          reportError(err, { source: "AddMemoryDialog.createEntry", userId });
          toast.error("Couldn't save that memory. Please try again.");
          return;
        }

        toast.success("Memory added");
        reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        reportError(err, { source: "AddMemoryDialog.onSubmit", userId });
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add memory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a memory</DialogTitle>
          <DialogDescription>
            Jot a note, rate it, and attach photos from your trip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened? What did it feel like?"
            rows={3}
          />

          {/* Rating */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n === rating ? 0 : n)}
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    n <= rating
                      ? "fill-brand-sand text-brand-sand"
                      : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Trip</label>
              <Select value={tripId} onValueChange={setTripId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No trip</SelectItem>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Place</label>
              <Select value={placeId} onValueChange={setPlaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No place</SelectItem>
                  {places.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="visitedAt" className="text-sm font-medium">
              When <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="visitedAt"
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
            />
          </div>

          {/* Photos */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                const check = validateImageFiles(picked);
                if (!check.ok) {
                  toast.error(check.error);
                  if (fileRef.current) fileRef.current.value = "";
                  setFiles([]);
                  return;
                }
                setFiles(picked);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {files.length > 0
                ? `${files.length} photo${files.length > 1 ? "s" : ""} selected`
                : "Add photos"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to {MAX_PHOTOS_PER_ENTRY} photos · JPEG, PNG, WebP or GIF · max 5MB each.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save memory
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
