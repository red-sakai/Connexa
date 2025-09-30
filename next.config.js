/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      "thfasntniiudedmfbpda.supabase.co",
      "images.unsplash.com",
      "via.placeholder.com",
    ],
  },
};

module.exports = nextConfig;