import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/", "/privacy", "/terms"], disallow: ["/api/", "/dashboard/", "/search", "/chat", "/settings", "/jobs"] }], sitemap: `${siteUrl}/sitemap.xml` };
}
