import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, r2Configured } from "@/lib/env";

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });
  }
  return _client;
}

/**
 * Presigned, time-limited URL to an installer object in the private R2
 * bucket. Returns null if R2 isn't configured yet.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 60 * 5,
): Promise<string | null> {
  if (!r2Configured) return null;
  const command = new GetObjectCommand({
    Bucket: env.r2Bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key.split("/").pop()}"`,
  });
  return getSignedUrl(client(), command, { expiresIn: expiresInSeconds });
}
