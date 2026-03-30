import path from "node:path";
import type { NextConfig } from "next";

import { getFirebaseAuthProxyRewrites } from "./src/lib/firebase-web-config";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    return getFirebaseAuthProxyRewrites(process.env);
  },
};

export default nextConfig;
