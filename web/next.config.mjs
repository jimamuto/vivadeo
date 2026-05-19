/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  experimental: {
    // Raise the body buffer limit so large video uploads aren't truncated
    // before they reach the /api/proxy route handler.
    proxyClientMaxBodySize: "2gb",
  },
};

export default nextConfig;
