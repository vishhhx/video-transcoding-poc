const express = require("express");
const {
  handleGetAllVideosByUser,
  handleGetVideoById,
  handleGetAllvideos,
  createStreamCookies,
} = require("../controllers/view.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const router = express.Router();
router.get("/getall-videos-by-user", isAuthenticated, handleGetAllVideosByUser);
router.get("/get-video-by-id/:videoId", handleGetVideoById);
router.get("/get-all-videos", handleGetAllvideos);
router.get("/:videoId/cookies", isAuthenticated, createStreamCookies);
module.exports = router;
