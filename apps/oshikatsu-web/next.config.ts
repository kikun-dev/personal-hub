import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@personal-hub/supabase"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
