"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Globe, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { updateTrip } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function TripShareButton({
  tripId,
  initialIsPublic,
  initialSlug,
}: {
  tripId: string;
  initialIsPublic: boolean;
  initialSlug: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [slug, setSlug] = useState(initialSlug);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const url =
    slug && typeof window !== "undefined"
      ? `${window.location.origin}/t/${slug}`
      : "";

  function setPublic(next: boolean) {
    startTransition(async () => {
      try {
        const trip = await updateTrip(tripId, { isPublic: next });
        setIsPublic(trip.is_public);
        setSlug(trip.share_slug);
        toast.success(next ? "Trip is now public" : "Trip is private again");
      } catch {
        toast.error("Couldn't update sharing.");
      }
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this trip</DialogTitle>
          <DialogDescription>
            Make it public to get a beautiful, no-login link anyone can open.
          </DialogDescription>
        </DialogHeader>

        {isPublic && url ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="text-sm" />
              <Button type="button" onClick={copy} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPublic(false)}
              disabled={pending}
              className="text-muted-foreground"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Make private
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={() => setPublic(true)} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Make public &amp; get link
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
