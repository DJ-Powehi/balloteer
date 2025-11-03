// next.config.mjs
const nextConfig = {
  webpack: (config) => {
    config.externals["@solana/kit"] = "commonjs @solana/kit";
    config.externals["@solana-program/memo"] = "commonjs @solana-program/memo";
    config.externals["@solana-program/system"] = "commonjs @solana-program/system";
    config.externals["@solana-program/token"] = "commonjs @solana-program/token";
    return config;
  },
};

export default nextConfig;
