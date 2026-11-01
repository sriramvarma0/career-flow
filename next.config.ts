import type { NextConfig } from "next";

// Explicitly trusted hostnames for Next.js Server Actions CSRF protection behind reverse proxies
const allowedOrigins: string[] = [
  "careerflow.sr-group.trade",
  "career-flow.kindplant-72027245.koreacentral.azurecontainerapps.io",
];

// Optionally allow appending custom trusted origins from environment variables (wildcards strictly rejected)
if (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS) {
  const envOrigins = process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && !origin.includes("*"));
  for (const origin of envOrigins) {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
      allowedOrigins,
    },
  },
};

export default nextConfig;

