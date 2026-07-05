import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Tüm tarayıcı /api isteklerini arka plandaki taro-api servisine yönlendir.
        // Docker ortamında 'taro-api' adı internal DNS olarak çözülür.
        source: "/api/:path*",
        destination: "http://taro-api:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
export { nextConfig };
