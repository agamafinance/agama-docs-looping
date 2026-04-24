/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/docs/overview',
        permanent: false,
      },
      {
        source: '/docs',
        destination: '/docs/overview',
        permanent: false,
      },
      {
        source: '/docs/overview/introduction',
        destination: '/docs/overview',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
