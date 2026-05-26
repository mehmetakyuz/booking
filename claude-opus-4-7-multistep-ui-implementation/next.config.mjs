import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.secretescapes.io" },
      { protocol: "https", hostname: "**.secretescapes.io" },
      { protocol: "https", hostname: "**.secretescapes.com" },
    ],
  },
};

export default nextConfig;
