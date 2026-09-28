/* ========================================
   AWS S3 Configuration & Helpers
   ========================================
   All AWS credentials come from environment variables only.
   Never expose AWS_SECRET_ACCESS_KEY to the frontend.
*/
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const isS3Configured = () =>
  Boolean(REGION && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY);

let s3Client = null;
const getS3Client = () => {
  if (!isS3Configured()) {
    const err = new Error(
      'AWS S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET_NAME in backend/.env'
    );
    err.code = 'AWS_NOT_CONFIGURED';
    throw err;
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

/* Sanitize a file name into an S3-safe key. */
const safeObjectKey = (fileName) => {
  const base = String(fileName || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  return base;
};

/* Generate a unique S3 key, e.g. complaints/{userId}/{random}-{fileName} */
const buildObjectKey = (prefix, userId, fileName) => {
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}/${userId}/${rand}-${safeObjectKey(fileName)}`;
};

/** Upload a buffer to S3. Returns { s3Key, size }. */
const uploadToS3 = async ({ key, buffer, contentType }) => {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return { s3Key: key, size: buffer.length };
};

/** Generate a temporary pre-signed URL for reading an object. */
const getSignedUrlForKey = async ({ key, expiresIn = 3600 }) => {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
};

/** Delete an object from S3. */
const deleteFromS3 = async ({ key }) => {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};

module.exports = {
  isS3Configured,
  uploadToS3,
  getSignedUrlForKey,
  deleteFromS3,
  buildObjectKey,
  safeObjectKey,
};
