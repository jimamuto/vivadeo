import { withEve } from "eve/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  turbopack: { root: process.cwd() },
  experimental: {
    // Raise the body buffer limit so large video uploads aren't truncated
    // before they reach the /api/proxy route handler.
    proxyClientMaxBodySize: "2gb",
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/chat",
        permanent: false,
      },
    ];
  },
};

export default withEve(nextConfig);
