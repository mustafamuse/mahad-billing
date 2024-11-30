/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-src 'self' js.stripe.com hooks.stripe.com; connect-src 'self' api.stripe.com;",
          },
        ],
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
}

module.exports = nextConfig
