/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@geulto/core'],
  experimental: {
    serverComponentsExternalPackages: ['@google/generative-ai', 'better-sqlite3'],
  },
};

module.exports = nextConfig;
