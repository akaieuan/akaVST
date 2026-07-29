import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { PLUGINS } from "@/lib/plugins";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.url.replace(/\/$/, "");
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/plugins`, priority: 0.8 },
    ...PLUGINS.map((p) => ({ url: `${base}/plugins/${p.slug}`, priority: 0.7 })),
    { url: `${base}/demo`, priority: 0.3 },
    ...["marks", "primitives", "skeleton", "tokens"].map((s) => ({
      url: `${base}/demo/${s}`,
      priority: 0.2,
    })),
  ];
}
