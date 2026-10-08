const sharp = require('sharp');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  const image = await s3.getObject({ Bucket: bucket, Key: key }).promise();

  const resized = await sharp(image.Body)
    .resize(320, 180)
    .webp({ quality: 80 })
    .toBuffer();

  const destKey = key.replace('original-thumbnail', 'optimized-thumbnail').replace(/\.[^.]+$/, '.webp');

  await s3.putObject({
    Bucket: process.env.OPTIMIZED_THUMBNAIL_BUCKET,
    Key: destKey,
    Body: resized,
    ContentType: 'image/webp'
  }).promise();

  return { status: 'OK', key: destKey };
};
