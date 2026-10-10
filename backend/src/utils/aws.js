const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports.getS3client = () => s3;

module.exports.getSignedUrlForThumbnail = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_OPTIMIZED_TUMBNAIL,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

module.exports.getSignedUrlForVideo = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_TRANSCODED_VIDEO,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

module.exports.getSignedUploadUrl = async (
  bucketName,
  key,
  contentType = "image/jpeg",
) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};
module.exports.getSignedDownloadUrl = async (bucketName, key) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};
