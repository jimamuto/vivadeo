/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typedRoutes: true,
  experimental: {
    // Allow large video uploads through the proxy route.
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
};

export default nextConfig;
