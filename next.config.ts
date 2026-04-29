import type { NextConfig } from "next";
import path from "path";

/** Pin Turbopack to cwd when running commands from `property-crm/` */
const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
