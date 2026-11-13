const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 8004),
  jwtSecret: required("JWT_SECRET"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  dbSslInsecure: process.env.DB_SSL_INSECURE === "true",
  redisUrl: process.env.REDIS_URL,
  razorpayKeyId:required("RAZORPAY_API_KEY"),
  razorpayKeySecret:required("RAZORPAY_SECRET"),
  internalkey:required("INTERNAL_KEY"),
  razorpayWebhookSecret:required("RAZORPAY_WEBHOOK_SECRET"),
  razorpayPlanPro:required("RAZORPAY_PLAN_PRO"),
  razorpayPlanBuilder:required("RAZORPAY_PLAN_BUILDER"),
};
