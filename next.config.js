/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow fetching from Allen Brain Atlas API during build/runtime
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

module.exports = nextConfig;
