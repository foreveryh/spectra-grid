/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Next.js image optimization since we're using pre-generated thumbnails
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
