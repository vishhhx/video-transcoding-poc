require("dotenv").config();

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const { NodeHttpHandler } = require("@smithy/node-http-handler");
const fs = require("node:fs/promises");
const newfs = require("node:fs");
const { pipeline } = require("node:stream/promises");
const ffmpeg = require("fluent-ffmpeg");
const path = require("node:path");
const { io } = require("socket.io-client");

const socket = io(process.env.BACKENDURL || process.env.BACKEND_URL);

socket.on("connect", () => {
  console.log(socket.id);
});

let progress = 0;

const client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  maxAttempts: 5,

  requestHandler: new NodeHttpHandler({
    connectionTimeout: 120000,
    requestTimeout: 0,
    socketTimeout: 0,
  }),

  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BucketName = process.env.ORIGINALVIDEOBUCKETNAME;
const key = process.env.KEY;

if (!key) {
  throw new Error("KEY is missing from environment variables.");
}

const credentials = key.split("/");

if (credentials.length < 3 || !credentials[2].endsWith(".mp4")) {
  throw new Error(`Unexpected video S3 key format: ${key}`);
}

const UploadId = credentials[2].replace(/\.mp4$/, "");
const uploaderID = credentials[1];

const TranscodedBucketName = process.env.TRANSCODEDVIDEOBUCKETNAME;

console.log("Transcoding worker initialized");

socket.emit("videotranscoding-init", {
  videoId: UploadId,
  uploaderId: uploaderID,
  progress: 0,
});

const resolutions = [
  { name: "240p", height: 240, bitrate: 300 },
  { name: "360p", height: 360, bitrate: 800 },
  { name: "480p", height: 480, bitrate: 1400 },
  { name: "720p", height: 720, bitrate: 2500 },
  { name: "1080p", height: 1080, bitrate: 5000 },
  { name: "1440p", height: 1440, bitrate: 8000 },
  { name: "2160p", height: 2160, bitrate: 12000 },
];

async function getOriginalResolution(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) {
        return reject(error);
      }

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video",
      );

      if (!videoStream) {
        return reject(new Error("No video stream found."));
      }

      resolve({
        width: videoStream.width,
        height: videoStream.height,
        duration: videoStream.duration,
      });
    });
  });
}

async function uploadFileToS3(filePath, s3Key) {
  const maxUploadAttempts = 4;

  const contentType = s3Key.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : "video/mp2t";

  for (let attempt = 1; attempt <= maxUploadAttempts; attempt += 1) {
    try {
      const command = new PutObjectCommand({
        Bucket: TranscodedBucketName,
        Key: s3Key,
        Body: newfs.createReadStream(filePath),
        ContentType: contentType,
      });

      await client.send(command);

      console.log(`Uploaded: ${s3Key}`);
      return;
    } catch (error) {
      if (attempt === maxUploadAttempts) {
        throw error;
      }

      const delayMs = attempt * 2000;

      console.warn(
        `Upload attempt ${attempt}/${maxUploadAttempts} failed for ${s3Key}. ` +
          `Retrying in ${delayMs}ms: ${error.message}`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function transcodeResolution(
  originalPath,
  outputDir,
  playlistName,
  resolution,
) {
  return new Promise((resolve, reject) => {
    ffmpeg(originalPath)
      .videoFilter(`scale=-2:${resolution.height}`)
      .videoBitrate(resolution.bitrate)
      .audioBitrate("128k")
      .outputOptions([
        "-preset",
        "veryfast",
        "-g",
        "48",
        "-sc_threshold",
        "0",
        "-hls_time",
        "4",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        path.join(outputDir, "segment-%03d.ts"),
      ])
      .output(path.join(outputDir, playlistName))
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

async function processResolution(originalPath, resolution) {
  const outputDir = path.resolve(`output-${resolution.name}`);
  const playlistName = `playlist-${resolution.name}.m3u8`;

  await fs.mkdir(outputDir, { recursive: true });

  await transcodeResolution(originalPath, outputDir, playlistName, resolution);

  const files = await fs.readdir(outputDir);

  const segmentFiles = files.filter((file) => file.endsWith(".ts")).sort();

  // Upload the segments without changing their filenames.
  for (const file of segmentFiles) {
    await uploadFileToS3(
      path.join(outputDir, file),
      `${key}/${resolution.name}/${file}`,
    );
  }

  // Upload the original FFmpeg playlist.
  // Its segment references remain relative, e.g. segment-000.ts.
  const playlistPath = path.join(outputDir, playlistName);

  await uploadFileToS3(
    playlistPath,
    `${key}/${resolution.name}/${playlistName}`,
  );

  console.log(`HLS for ${resolution.name} completed`);

  return {
    resolution,
    playlistName,
  };
}

async function processVideoHLS(originalPath) {
  const { height: originalHeight } = await getOriginalResolution(originalPath);

  const filteredResolutions = resolutions.filter(
    (resolution) => resolution.height <= originalHeight,
  );

  if (filteredResolutions.length === 0) {
    throw new Error("No supported output resolution for this video.");
  }

  const masterPlaylistLines = [];

  // Process sequentially to avoid launching several expensive FFmpeg
  // jobs simultaneously and to make progress reporting reliable.
  for (const resolution of filteredResolutions) {
    const result = await processResolution(originalPath, resolution);

    const width = Math.round((result.resolution.height * 16) / 9);

    masterPlaylistLines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${result.resolution.bitrate * 1000},RESOLUTION=${width}x${result.resolution.height}\n` +
        `${result.resolution.name}/${result.playlistName}`,
    );

    progress = Math.floor(
      (masterPlaylistLines.length / filteredResolutions.length) * 100,
    );

    console.log(`Progress: ${progress}%`);

    socket.emit("transcoding-progress", {
      videoId: UploadId,
      uploaderId: uploaderID,
      progress,
      file: result.resolution.name,
    });
  }

  // Relative child-playlist paths ensure playback stays on the host
  // from which the master playlist was loaded (CloudFront).
  const masterPlaylist = `#EXTM3U\n${masterPlaylistLines.join("\n")}\n`;

  const masterPath = path.resolve("master.m3u8");

  await fs.writeFile(masterPath, masterPlaylist, "utf8");

  await uploadFileToS3(masterPath, `${key}/master.m3u8`);

  console.log("Adaptive HLS streaming setup complete");

  socket.emit("videotranscoding-done", {
    videoId: UploadId,
    uploaderId: uploaderID,
    progress: 100,
  });
}

async function init() {
  let succeeded = false;

  try {
    if (!BucketName || !TranscodedBucketName) {
      throw new Error(
        "ORIGINALVIDEOBUCKETNAME and TRANSCODEDVIDEOBUCKETNAME must be configured.",
      );
    }

    const command = new GetObjectCommand({
      Bucket: BucketName,
      Key: key,
    });

    const uploadedVideo = await client.send(command);

    if (!uploadedVideo.Body) {
      throw new Error("S3 returned an empty video body.");
    }

    const originalFile = path.resolve("original.mp4");

    await pipeline(uploadedVideo.Body, newfs.createWriteStream(originalFile));

    console.log("Original video downloaded from S3");

    await processVideoHLS(originalFile);

    succeeded = true;
  } catch (error) {
    console.error("Transcoding failed:", error);

    socket.emit("videotranscoding-fail", {
      videoId: UploadId,
      uploaderId: uploaderID,
      progress,
    });
  } finally {
    socket.disconnect();
  }

  if (!succeeded) {
    process.exitCode = 1;
  }
}

init();
