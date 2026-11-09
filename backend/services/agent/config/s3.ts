import { S3Client } from "@aws-sdk/client-s3";
import { config } from "./agent.config";

let client: S3Client | null = null;

// Created on first use so a missing AWS setup only breaks file features, not the whole service.
export const getS3 = (): { s3: S3Client; bucket: string } => {
  const { awsRegion, bucketName } = config;
  if (!awsRegion || !bucketName) {
    throw new Error("S3 is not configured: set AWS_REGION and AWS_BUCKET_NAME");
  }
  client ??= new S3Client({ region: awsRegion });
  return { s3: client, bucket: bucketName };
};
