const UploadModel = require("../models/upload.model");
const {
  getSignedUrlForThumbnail,
  getSignedUrlForVideo,
  getS3client,
} = require("../utils/aws");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const s3 = getS3client();
module.exports.handleGetAllVideosByUser = async (req, res) => {
  try {
    const { _id } = req.user;
    const videos = await UploadModel.find({ uploadedBy: _id }).sort({
      createdAt: -1,
    });
    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: "No videos found for this user" });
    }
    const signedVideos = await Promise.all(
      videos.map(async (video) => {
        const signedUrl = await getSignedUrlForThumbnail(video.thumbnailKey);
        video.thumbnailKey = signedUrl;
        return video;
      }),
    );
    const completedVideos = signedVideos.filter(
      (video) => video.status === "completed",
    );
    const incompleteVideos = signedVideos.filter(
      (video) => video.status !== "completed",
    );
    return res.status(200).json({ completedVideos, incompleteVideos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return res.status(500).json({ message: "Failed to fetch videos" });
  }
};

module.exports.handleGetVideoById = async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) {
      return res.status(400).json({ message: "Video ID is required" });
    }
    const video = await UploadModel.findById(videoId).populate("uploadedBy");
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    const signedUrl = await getSignedUrlForThumbnail(video.thumbnailKey);
    const signedVideoUrl = await getSignedUrlForVideo(video.transcodedVideoKey);
    video.thumbnailKey = signedUrl;
    video.transcodedVideoKey = signedVideoUrl;

    return res.status(200).json(video);
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    return res.status(500).json({ message: "Failed to fetch video" });
  }
};

const getHlsPrefix = async (videoId) => {
  const video = await UploadModel.findById(videoId).select("uploadedBy");
  if (!video?.uploadedBy) return null;

  return `videos/${video.uploadedBy}/${videoId}.mp4`;
};

module.exports.handleGetHlsMaster = async (req, res) => {
  try {
    const prefix = await getHlsPrefix(req.params.videoId);
    if (!prefix) return res.status(404).send("Video playlist not found");

    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_TRANSCODED_VIDEO,
        Key: `${prefix}/master.m3u8`,
      }),
    );
    const playlist = await response.Body.transformToString();
    const origin = `${req.protocol}://${req.get("host")}`;
    const rewritten = playlist.replace(
      /^([^#\r\n]+\.m3u8)$/gm,
      (_, file) => `${origin}/api/v1/view/hls/${req.params.videoId}/${file}`,
    );

    res.type("application/vnd.apple.mpegurl").send(rewritten);
  } catch (error) {
    console.error("Error serving HLS master playlist:", error);
    res.status(404).send("Video playlist not found");
  }
};

module.exports.handleGetHlsAsset = async (req, res) => {
  try {
    const prefix = await getHlsPrefix(req.params.videoId);
    if (!prefix) return res.status(404).send("Video chunk not found");

    const key = `${prefix}/${req.params.assetPath}`;
    console.log("Serving HLS S3 key:", key);
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_TRANSCODED_VIDEO,
        Key: key,
      }),
    );
    res.type(
      req.params.assetPath.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp2t",
    );
    response.Body.pipe(res);
  } catch (error) {
    console.error("Error serving HLS asset:", error);
    res.status(404).send("Video chunk not found");
  }
};

module.exports.handleGetAllvideos = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    const videos = await UploadModel.find({
      status: "completed",
      isPublic: true,
    })
      .skip(skip)
      .limit(limit)
      .populate("uploadedBy")
      .select("title description thumbnailKey uploadedBy")
      .sort({ createdAt: -1 });
    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: "No videos found" });
    }
    const signedThumbnail = await Promise.all(
      videos.map(async (video) => {
        const signedUrl = await getSignedUrlForThumbnail(video.thumbnailKey);
        video.thumbnailKey = signedUrl;
        return video;
      }),
    );

    return res.status(200).json({ videos: signedThumbnail });
  } catch (error) {
    console.error("Error fetching all videos:", error.message);
    return res.status(500).json({ message: "Failed to fetch videos" });
  }
};
