import type { NextConfig } from "next";

/**
 * Socket's web build, at /socket-test.
 *
 * It is a Vite single-page app living in public/socket-test/, not a route —
 * porting it into the App Router would mean a second build system inside this
 * one, and it is a desktop application that happens to run in a browser rather
 * than a page on this site.
 *
 * The rewrite exists because a static directory has no index behaviour: Next
 * serves public/socket-test/index.html at that exact URL and 404s the bare
 * directory. One rewrite covers both forms — /socket-test/ already 308s to
 * /socket-test on its own, so a second rule for it would be dead. The assets
 * resolve without help: the bundle is built with a matching base, so it asks
 * for /socket-test/assets/… rather than /assets/….
 *
 * Unlisted rather than protected. It is out of the nav and out of the sitemap,
 * and the header below keeps it out of search results, but anyone who has the
 * URL can open it. That is the right amount of secrecy for a test build of a
 * thing whose source is public; it is not a place to put anything private.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/socket-test", destination: "/socket-test/index.html" },
    ];
  },

  async headers() {
    return [
      {
        source: "/socket-test/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          // Not cached. The interface and the engine agree on parameter
          // indices, and a browser holding a stale half of that pair points
          // every knob at the wrong thing — which is heard, not seen, and only
          // after you have started doubting your own ears.
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      { source: "/socket-test", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
