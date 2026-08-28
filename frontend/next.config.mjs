/** @type {import('next').NextConfig} */
const configuredBackendUrl = process.env.BACKEND_API_URL?.replace(/\/$/, '');
const backendUrl = configuredBackendUrl || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '');
const backendApiBase = backendUrl
  ? (backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`)
  : '';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    if (!backendApiBase) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendApiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
