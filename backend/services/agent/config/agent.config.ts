const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 8003),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  dbSslInsecure: process.env.DB_SSL_INSECURE === "true",
  redisUrl: process.env.REDIS_URL,
};
