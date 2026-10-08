const ThumbnailSession = require("../models/thumbnailSession.model");
const UploadModel = require("../models/upload.model");
const { getSignedDownloadUrl } = require("../utils/aws");
const {
  getAi,
  mapPreferencesToDirectives,
  GenerateYouTubeThumbnail,
} = require("../utils/openai");

module.exports.handleEnhancePrompt = async (req, res) => {
  try {
    const { title, description } = req.body || {};

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        msg: "Title or description required",
      });
    }

    const ai = getAi();
    if (!ai?.chat?.completions?.create) {
      console.error("AI client not initialized");
      return res.status(500).json({
        success: false,
        msg: "AI client not initialized",
      });
    }

    const context = `
      You are a professional thumbnail prompt engineer.
      Your job is to take a YouTube video title and descriptionskils
      and create an enhanced thumbnail generation prompt.

      Guidelines:
      - Make it catchy, bold, and attention-grabbing.
      - Suggest styling (cinematic, colorful, modern, minimalistic, neon, retro, etc.).
      - Use short descriptive language, no long sentences.
      - Focus on what makes a great YouTube thumbnail (emotion, contrast, clarity).
      - Do NOT generate an actual thumbnail, only a text prompt.
      -return a plain text
    `;

    const userInput = `
      Title: ${title || "N/A"}
      Description: ${description || "N/A"}
    `;

    const result = await ai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
      temperature: 0.25,
      messages: [
        { role: "system", content: context },
        { role: "user", content: userInput },
      ],
    });

    const enhancedPrompt = result.choices[0]?.message?.content?.trim();
    console.log(enhancedPrompt);
    return res.status(200).json({
      success: true,
      enhancedPrompt,
    });
  } catch (err) {
    console.error("Prompt enhancement error:", err?.response?.data || err);

    return res.status(500).json({
      success: false,
      msg: "Error enhancing prompt",
      error: err.message,
    });
  }
};

module.exports.handleGeneratePromt = async (req, res) => {
  try {
    const { title, description, thumbnailPreferences } = req.body || {};
    console.log(title, description);
    if (!title && !description && !thumbnailPreferences) {
      return res.status(400).json({
        success: false,
        msg: "Title, description, or thumbnail preferences are required",
      });
    }

    const ai = getAi();
    if (!ai?.chat?.completions?.create) {
      console.error("AI client not initialized");
      return res.status(500).json({
        success: false,
        msg: "AI client not initialized",
      });
    }

    const { rawList, interpreted } = mapPreferencesToDirectives(
      thumbnailPreferences || {},
    );

    const userPrompt = `
Create a YouTube thumbnail (16:9) using the provided reference image as the main visual element. 
Make it highly engaging, mobile-friendly, and optimized for click-through. 
Include the following context: 
- Title: ${title || "N/A"}
- Description: ${description || "N/A"}
- Preferences: ${rawList || "N/A"}
- Design directives: ${interpreted || "N/A"}

The thumbnail should follow these principles:
- If text is required, use very large, bold, mobile-legible typography (2-4 words max).
- If preferences indicate no text, rely entirely on strong visuals.
- Composition: clear subject focus, step-by-step structured scene (background, midground, foreground, subject placement, text if any).
- Camera: cinematic, close-up or dynamic angle with shallow depth of field (e.g., 50-85mm lens).
- Color & lighting: strong contrast, vibrant but not cluttered, with clear separation of subject and text.
- Negative prompts: avoid watermarks, logos, UI overlays, unreadable small text, low resolution, or dull visuals.

Return one single descriptive prompt text that an image model can directly use.
`;

    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful, precise prompt engineer for YouTube thumbnails. 
Follow these instructions carefully when generating ideas.

${userPrompt}`,
        },
      ],
      temperature: 0.25,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      return res.status(500).json({
        success: false,
        msg: "AI did not return a usable prompt",
        rawResponse: response,
      });
    }

    return res.status(200).json({
      success: true,
      raw: generatedText,
    });
  } catch (error) {
    console.error("Error generating thumbnail prompt:", error);
    return res.status(500).json({
      success: false,
      msg: "Something went wrong generating the prompt",
      error: error.message,
    });
  }
};

module.exports.handleIntialGenerateTubnail = async (req, res) => {
  try {
    const { promt, keys, videoId } = req.body;

    if (!promt || !keys || !videoId) {
      return res.status(400).json({
        msg: "All fields (promt, signedUrls, keys, videoId) are required",
      });
    }

    let result;

    const signedUrls = await Promise.all(
      keys.map(
        async (key) =>
          await getSignedDownloadUrl(
            process.env.AWS_BUCKET_SESSION_TUBNAIL,
            key,
          ),
      ),
    );
    const video = await UploadModel.findById(videoId);
    if (!video) {
      return res.status(404).json({ msg: "Video not found" });
    }

    try {
      result = await GenerateYouTubeThumbnail(
        promt,
        signedUrls,
        videoId,
        video.thumbnailKey,
      );
    } catch (error) {
      console.error("Error in generating the thumbnail:", error);
      return res.status(500).json({
        msg: error.message,
      });
    }

    const conversations = [
      {
        role: "user",
        message: promt,
        images: keys,
      },
      {
        role: "ai",
        message: result.text || "Thumbnail generated successfully.",
        images: result.keys,
      },
    ];

    const thumbnailSession = await ThumbnailSession.create({
      videoId,
      initialPrompt: promt,
      conversations,
    });

    video.isThumbnailUploaded = true;
    await video.save();

    return res.status(201).json({
      msg: "Thumbnail session created successfully",
      session: thumbnailSession,
      conversations,
      thumbnailUrl: result.images[0],
      thumbnailKey: result.thumbnailKey,
    });
  } catch (error) {
    console.error("Error in handleIntialGenerateTubnail:", error);
    return res.status(500).json({
      msg: "Something went wrong while creating the thumbnail session",
      error: error.message,
    });
  }
};

module.exports.handlegenetratetubnail = async (req, res) => {
  const { promt, keys, vidoeId } = req.body;

  await ThumbnailSession.findOne({
    videoId: vidoeId,
  });
};
