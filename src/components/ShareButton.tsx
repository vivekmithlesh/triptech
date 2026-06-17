"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ShareButton({
  title,
  text,
  /** Relative or absolute URL to share; defaults to the current page. */
  url,
  className,
  label = "Share",
}: {
  title: string;
  text?: string;
  url?: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const shareUrl =
      url && url.startsWith("http")
        ? url
        : `${typeof window !== "undefined" ? window.location.origin : ""}${
            url ?? (typeof window !== "undefined" ? window.location.pathname : "")
          }`;

    // Prefer the native share sheet (mobile); fall back to clipboard.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // user dismissed or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't share this link.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onShare}
      className={className}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {label}
    </Button>
  );
}
