const express = require("express");
const { handleEnhancePrompt ,handleGeneratePromt,handleIntialGenerateTubnail} = require("../controllers/ai.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const router = express();

router.post("/enhance-tubnail-Prompt", isAuthenticated, handleEnhancePrompt);
router.post("/generate-promt",isAuthenticated,handleGeneratePromt)
router.post("/init-generate-thubnail",handleIntialGenerateTubnail)
module.exports = router;
