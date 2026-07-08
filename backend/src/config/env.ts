import "dotenv/config";

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  anthropicApiKey: required("ANTHROPIC_API_KEY", ""),
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  // Local embedding model (fastembed, runs on-device) - no API key. See embedding.service.ts
  // for the supported model names.
  embeddingModel: process.env.EMBEDDING_MODEL || "all-MiniLM-L6-v2",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || "4000"}`,
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || "20", 10),
};
