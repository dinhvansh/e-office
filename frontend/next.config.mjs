/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable standalone output for Docker
  typescript: {
    // Skip type checking during build for Docker
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build for Docker
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
