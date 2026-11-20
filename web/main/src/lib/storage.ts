import 'server-only'
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Object storage over the S3 API: SeaweedFS locally, Cloudflare R2 in
// production (see S3_* in web/.env.example). The bucket is private — the
// browser only ever gets short-lived signed URLs, because circles are secret.

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set (see web/.env.example).`)
  return value
}

let client: S3Client | undefined

// Created lazily so `next build` doesn't need storage credentials.
function s3(): S3Client {
  client ??= new S3Client({
    endpoint: requireEnv('S3_ENDPOINT'),
    region: requireEnv('S3_REGION'),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
  })
  return client
}

const bucket = () => requireEnv('S3_BUCKET')

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys are never reused (random per upload), so browsers may cache
      // forever — but only privately, never in shared caches.
      CacheControl: 'private, max-age=31536000, immutable',
    }),
  )
}

const SIGNING_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * A signed GET URL valid for 1–2 hours. The signing time is rounded down to
 * the hour, so the URL for a given object stays identical for the whole hour
 * and the browser cache keeps working across page loads and SWR refetches.
 * Signing is local HMAC work — no network call.
 */
export async function signedGetUrl(key: string): Promise<string> {
  const signingDate = new Date(
    Math.floor(Date.now() / SIGNING_WINDOW_MS) * SIGNING_WINDOW_MS,
  )
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: (2 * SIGNING_WINDOW_MS) / 1000, signingDate },
  )
}

/**
 * Development only: create the bucket if it's missing, so a fresh
 * `docker compose up` needs no manual setup. In production the bucket is
 * provisioned ahead of time and the app's credentials can't create buckets.
 */
export async function ensureBucketExists(): Promise<void> {
  try {
    await s3().send(new HeadBucketCommand({ Bucket: bucket() }))
  } catch {
    await s3().send(new CreateBucketCommand({ Bucket: bucket() }))
  }
}
