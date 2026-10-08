const express = require("express");
const { router } = express();
const {
  handleGetSignUrl,
  createVideo,
  handleUpdateVideoUploadStatus,
  handleGetVideoDetails,
  handleSignedUrlForUploadSessionThumbnail
} = require("../controllers/upload.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
router.get("/SignedUrl", isAuthenticated,handleGetSignUrl);
router.post("/createVideo", isAuthenticated, createVideo);
router.put("/updateVideoStatus", isAuthenticated, handleUpdateVideoUploadStatus);
router.get("/vedio-details/:videoId",handleGetVideoDetails)
router.get("/thubnail-signed-url/:VideoId",handleSignedUrlForUploadSessionThumbnail)
module.exports = router;
