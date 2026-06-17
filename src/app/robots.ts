import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/app surfaces out of the index.
        disallow: ["/dashboard", "/trip/", "/api/", "/auth"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
