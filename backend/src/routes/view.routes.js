const express = require("express");
const {
  handleGetAllVideosByUser,
  handleGetVideoById,
  handleGetAllvideos,
  handleGetHlsMaster,
  handleGetHlsAsset,
} = require("../controllers/view.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const router = express.Router();
router.get("/getall-videos-by-user", isAuthenticated, handleGetAllVideosByUser);
router.get("/get-video-by-id/:videoId", handleGetVideoById);
router.get("/hls/:videoId/master.m3u8", handleGetHlsMaster);
router.get("/hls/:videoId/*assetPath", handleGetHlsAsset);
router.get("/get-all-videos", handleGetAllvideos);
module.exports = router;
