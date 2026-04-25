/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Root → Overview
      {
        source: '/',
        destination: '/overview',
        permanent: false,
      },
      // Legacy /docs/* → new flat URLs (covers all old bookmarks/external links)
      {
        source: '/docs',
        destination: '/overview',
        permanent: true,
      },
      {
        source: '/docs/:path*',
        destination: '/:path*',
        permanent: true,
      },
      // Old /actors slug (already-redirected) → How It Works
      {
        source: '/actors',
        destination: '/how-it-works',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
