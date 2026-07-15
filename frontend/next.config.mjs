/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable standalone output for Docker
  distDir: process.env.NEXT_DIST_DIR || '.next',
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
