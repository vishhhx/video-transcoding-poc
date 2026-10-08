const express = require("express");
const {
  handelGithubInit,
  handleGithubOAuthCallback,
  handleLogout
} = require("../controllers/auth.controller");
const { router } = express();
router.get("/github", handelGithubInit);
router.get("/github/callback", handleGithubOAuthCallback);
router.post("/logout",handleLogout)
module.exports = router;
