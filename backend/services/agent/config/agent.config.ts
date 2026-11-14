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
  chatUrl:required("CHAT_SERVICE"),
  billingUrl: required("BILLING_SERVICE"),
  internalKey: required("INTERNAL_KEY"),
  dbSslInsecure: process.env.DB_SSL_INSECURE === "true",
  redisUrl: process.env.REDIS_URL,
  tavily:process.env.TAVILY_API_KEY,
  openrouter:process.env.OPENROUTER_API_KEY,
  // S3 is optional so chat/search keep working without it; storage fails only when used.
  // Credentials come from the SDK's default chain (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
  // locally, an IAM role in production), so they aren't read here.
  awsRegion: process.env.AWS_REGION,
  bucketName: process.env.AWS_BUCKET_NAME,
  googleApiKey: process.env.GOOGLE_API_KEY,
  imageModel: process.env.IMAGE_MODEL ?? "gemini-2.5-flash-image",
  bedrock: {
    region: process.env.BEDROCK_AWS_REGION,
    // Optional: separate keys for Bedrock. Without them the SDK uses AWS_BEARER_TOKEN_BEDROCK
    // (a Bedrock API key) or its default credential chain.
    accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
  },
};
