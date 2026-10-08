const OpenAI = require("openai");
const { toFile } = require("openai/uploads");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getS3client, getSignedDownloadUrl } = require("./aws");
const crypto = require("crypto");

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const s3 = getS3client();

module.exports.getAi = () => ai;

module.exports.GenerateYouTubeThumbnail = async (
  prompt,
  imageUrls,
  videoId,
  thumbnailKey,
) => {
  const imageFiles = [];

  for (const url of imageUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `Failed to fetch image from ${url}: ${response.statusText}`,
        );
        continue;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const extension = contentType.split("/")[1]?.split(";")[0] || "jpeg";
      imageFiles.push(
        await toFile(
          Buffer.from(await response.arrayBuffer()),
          `reference.${extension}`,
          {
            type: contentType,
          },
        ),
      );
    } catch (error) {
      console.warn(`Error fetching image from ${url}:`, error.message);
    }
  }

  const request = {
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    prompt,
    size: "1536x1024",
    quality: "high",
    output_format: "jpeg",
  };

  const response = imageFiles.length
    ? await ai.images.edit({ ...request, image: imageFiles })
    : await ai.images.generate(request);
  const imageData = response.data?.[0]?.b64_json;

  if (!imageData) {
    throw new Error("OpenAI did not return a generated image");
  }

  const key = `images/${videoId}/${crypto.randomUUID()}.jpg`;
  const imageBuffer = Buffer.from(imageData, "base64");
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_SESSION_TUBNAIL,
      Key: key,
      Body: imageBuffer,
      ContentType: "image/jpeg",
    }),
  );

  if (thumbnailKey) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_OPTIMIZED_TUMBNAIL,
        Key: thumbnailKey,
        Body: imageBuffer,
        ContentType: "image/jpeg",
      }),
    );
  }

  return {
    videoId,
    text: "",
    images: [
      await getSignedDownloadUrl(
        thumbnailKey
          ? process.env.AWS_BUCKET_OPTIMIZED_TUMBNAIL
          : process.env.AWS_BUCKET_SESSION_TUBNAIL,
        thumbnailKey || key,
      ),
    ],
    keys: [key],
    thumbnailKey,
  };
};

module.exports.mapPreferencesToDirectives = (preferences = {}) => {
  const lines = [];
  const interpreted = [];

  for (const [rawKey, rawVal] of Object.entries(preferences)) {
    const key = String(rawKey).toLowerCase();
    const val = String(rawVal);

    if (/leave blank|skip/i.test(val)) continue;
    lines.push(`- ${rawKey}: ${val}`);

    if (key.includes("text") && /no/i.test(val)) {
      interpreted.push(
        "Do NOT include overlay text; rely on strong visual composition.",
      );
    } else if (key.includes("text") && /yes/i.test(val)) {
      interpreted.push(
        "Include a short, bold headline (2-4 words). Make it very legible on mobile.",
      );
    } else if (key.includes("call-to-action") || key.includes("cta")) {
      interpreted.push(
        /no/i.test(val)
          ? "Avoid CTA text."
          : `Add CTA: "${val}". Place it small at bottom-right.`,
      );
    } else if (key.includes("color")) {
      const color = val.toLowerCase();
      if (color.includes("bright"))
        interpreted.push("Use saturated, high-contrast colors.");
      else if (color.includes("dark"))
        interpreted.push("Use a dark, moody palette with deep shadows.");
      else if (color.includes("minimal"))
        interpreted.push("Use neutral tones and lots of negative space.");
      else if (color.includes("pastel"))
        interpreted.push("Use soft pastel colors and gentle contrast.");
      else interpreted.push(`Prefer color palette: ${val}.`);
    } else if (key.includes("tone")) {
      if (/funny|playful/i.test(val))
        interpreted.push(
          "Use playful, exaggerated expressions and bright lighting.",
        );
      else if (/serious|informative/i.test(val))
        interpreted.push(
          "Use restrained colors, subtle expressions, and clear typography.",
        );
      else if (/exciting|energetic/i.test(val))
        interpreted.push(
          "Use a dynamic action pose, motion, and high saturation.",
        );
      else interpreted.push(`Tone: ${val}.`);
    } else if (key.includes("focus") || key.includes("main focus")) {
      if (/face|reaction/i.test(val))
        interpreted.push(
          "Use a close-up face shot with high detail on the eyes.",
        );
      else if (/action/i.test(val))
        interpreted.push(
          "Use an action mid-shot with a strong foreground subject.",
        );
      else interpreted.push(`Primary focus: ${val}.`);
    } else if (key.includes("text style"))
      interpreted.push(`Typography recommendation: ${val}.`);
    else if (key.includes("purpose"))
      interpreted.push(
        `Primary purpose: ${val}. Tailor composition for that purpose.`,
      );
    else if (key.includes("content") || key.includes("type"))
      interpreted.push(
        `Content type: ${val}; use genre-appropriate visual cues.`,
      );
    else interpreted.push(`${rawKey}: ${val}`);
  }

  interpreted.push(
    "Use the provided reference image as the base or main subject for consistency with the video content.",
  );
  return { rawList: lines.join("\n"), interpreted: interpreted.join(" ") };
};
