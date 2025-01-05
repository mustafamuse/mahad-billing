/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' blob: data:",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' blob: data: https://api.stripe.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-src 'self' blob: https://js.stripe.com https://hooks.stripe.com",
              "media-src 'self' blob: data:",
            ].join('; '),
          },
        ],
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  env: {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN,
    KV_URL: process.env.KV_URL,
  },
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-pdf/renderer': '@react-pdf/renderer/lib/react-pdf.js',
    }
    return config
  },
}

module.exports = nextConfig
