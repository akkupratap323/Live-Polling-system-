/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig
