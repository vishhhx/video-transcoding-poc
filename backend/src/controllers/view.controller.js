const UploadModel = require("../models/upload.model");

const fs = require("fs");
const { getSignedUrlForThumbnail, getSignedHlsUrl } = require("../utils/aws");
const { getSignedCookies } = require("@aws-sdk/cloudfront-signer");
const path = require("path");

const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
const publicKeyId = process.env.CLOUDFRONT_PUBLIC_KEY_ID;
const privateKeySource = process.env.CLOUDFRONT_PRIVATE_KEY_PATH;
const privateKey = privateKeySource?.includes("BEGIN PRIVATE KEY")
  ? privateKeySource
  : (() => {
      if (!privateKeySource) {
        throw new Error("CLOUDFRONT_PRIVATE_KEY_PATH is not configured");
      }

      const candidatePaths = [
        path.resolve(privateKeySource),
        path.resolve(process.env.HOME || "", privateKeySource),
      ];
      const filePath = candidatePaths.find((candidate) =>
        fs.existsSync(candidate),
      );

      if (!filePath) {
        throw new Error(
          `CloudFront private key file not found. Checked: ${candidatePaths.join(", ")}`,
        );
      }

      return fs.readFileSync(filePath, "utf8");
    })();
const getStreamVideo = async (videoId) => {
  if (!videoId) return null;
  return UploadModel.findById(videoId).select(
    "uploadedBy isPublic status transcodedVideoKey",
  );
};

const isAllowedToWatch = (video, user) =>
  video?.status === "completed" &&
  (video.isPublic || String(video.uploadedBy) === String(user?._id));

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
    video.thumbnailKey = signedUrl;
    return res.status(200).json(video);
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    return res.status(500).json({ message: "Failed to fetch video" });
  }
};

module.exports.handleGetAllvideos = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const videos = await UploadModel.find({
      status: "completed",
      isPublic: true,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("uploadedBy")
      .select("title description thumbnailKey uploadedBy")
      .sort({ createdAt: -1 });
    if (!videos.length)
      return res.status(404).json({ message: "No videos found" });

    const signedThumbnail = await Promise.all(
      videos.map(async (video) => {
        video.thumbnailKey = await getSignedUrlForThumbnail(video.thumbnailKey);
        return video;
      }),
    );
    return res.status(200).json({ videos: signedThumbnail });
  } catch (error) {
    console.error("Error fetching all videos:", error.message);
    return res.status(500).json({ message: "Failed to fetch videos" });
  }
};

module.exports.createStreamCookies = async (req, res) => {
  try {
    const video = await getStreamVideo(req.params.videoId);
    if (!video) return res.status(404).json({ message: "Video not found" });
    if (!isAllowedToWatch(video, req.user)) {
      return res
        .status(403)
        .json({ message: "You are not allowed to watch this video" });
    }
    if (!video.transcodedVideoKey?.endsWith(".m3u8")) {
      return res.status(404).json({ message: "HLS playlist not found" });
    }

    const videoFolder = video.transcodedVideoKey.slice(
      0,
      video.transcodedVideoKey.lastIndexOf("/"),
    );
    const resource = `https://${cloudFrontDomain}/${videoFolder}/*`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const policy = JSON.stringify({
      Statement: [
        {
          Resource: resource,
          Condition: {
            DateLessThan: {
              "AWS:EpochTime": Math.floor(expiresAt.getTime() / 1000),
            },
          },
        },
      ],
    });

    const cookies = getSignedCookies({
      policy,
      keyPairId: publicKeyId,
      privateKey,
    });

    const configuredCookieDomain = process.env.COOKIE_DOMAIN?.trim();
    const cookieDomain =
      configuredCookieDomain &&
      !configuredCookieDomain.includes("://") &&
      configuredCookieDomain !== "localhost"
        ? configuredCookieDomain
        : undefined;

    for (const [name, value] of Object.entries(cookies)) {
      res.cookie(name, value, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        ...(cookieDomain ? { domain: cookieDomain } : {}),
        expires: expiresAt,
      });
    }

    return res.status(200).json({
      message: "Signed cookies issued",
      playlistUrl: `https://${cloudFrontDomain}/${video.transcodedVideoKey}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to issue CloudFront cookies:", error);
    return res.status(500).json({ message: "Unable to authorize stream" });
  }
};
