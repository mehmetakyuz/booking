/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.secretescapes.com' },
      { protocol: 'https', hostname: '**.travelbird.com' },
    ],
  },
}

export default nextConfig
