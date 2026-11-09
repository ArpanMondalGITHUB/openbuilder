import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3 } from "../config/s3";

const DEFAULT_EXPIRES_IN = 15 * 60; // 15 minutes
export const MAX_EXPIRES_IN = 7 * 24 * 60 * 60; // SigV4 presigned URLs can't outlive 7 days

export interface StoredFile {
  key: string;
  name: string; // file name the browser saves it as
  contentType: string;
}

// Keys are always built here, never taken from user input:
// the userId prefix is what the download route checks for ownership,
// and the UUID keeps two generations from overwriting each other.
export const buildFileKey = (userId: string, conversationId: string, extension: string) =>
  `${userId}/${conversationId}/${randomUUID()}.${extension.replace(/^\./, "")}`;

export const isOwnedBy = (key: string, userId: string) =>
  key.startsWith(`${userId}/`) && !key.split("/").includes("..");

// "Q3 Report!" -> "Q3-Report.pdf"; only [A-Za-z0-9_-] so it's safe in a header
export const safeFileName = (title: string, extension: string) => {
  const base = title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "file";
  return `${base}.${extension}`;
};

// Content-Disposition is stored on the object, so every download link
// (including ones re-signed later) gets the right file name.
export const uploadFile = async (
  key: string,
  body: Buffer | Uint8Array,
  options: { contentType: string; fileName: string; inline?: boolean }
): Promise<void> => {
  const { s3, bucket } = getS3();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType,
      ContentDisposition: `${options.inline ? "inline" : "attachment"}; filename="${options.fileName}"`,
    })
  );
};

// Overrides the stored Content-Disposition for one link, e.g. "inline" to view a PDF
// in a tab, or "attachment" to download an image that is stored as inline.
export interface DispositionOverride {
  type: "inline" | "attachment";
  fileName?: string; // must already be header-safe (see safeFileName)
}

// Callers must check ownership (isOwnedBy) before signing a key that came from a request.
export const getSignedDownloadUrl = async (
  key: string,
  expiresIn = DEFAULT_EXPIRES_IN,
  disposition?: DispositionOverride
): Promise<string> => {
  if (!key) throw new Error("Missing file key");
  const { s3, bucket } = getS3();
  const seconds = Math.min(Math.max(Math.floor(expiresIn), 1), MAX_EXPIRES_IN);
  const ResponseContentDisposition = disposition
    ? `${disposition.type}${disposition.fileName ? `; filename="${disposition.fileName}"` : ""}`
    : undefined;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition }), {
    expiresIn: seconds,
  });
};

// Uploads a generated file and returns it with a link for the chat message.
// The link lasts as long as presigning allows (7 days); after that the client
// can get a fresh one from GET /api/v1/agent/files/<key>.
export const publishGeneratedFile = async (
  owner: { userId: string; conversationId: string },
  body: Buffer | Uint8Array,
  file: { title: string; extension: string; contentType: string; inline?: boolean }
): Promise<{ file: StoredFile; url: string }> => {
  const key = buildFileKey(owner.userId, owner.conversationId, file.extension);
  const name = safeFileName(file.title, file.extension);
  await uploadFile(key, body, { contentType: file.contentType, fileName: name, inline: file.inline });
  const url = await getSignedDownloadUrl(key, MAX_EXPIRES_IN);
  return { file: { key, name, contentType: file.contentType }, url };
};
