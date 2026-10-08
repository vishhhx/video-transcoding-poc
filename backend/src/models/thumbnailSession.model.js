const mongoose = require("mongoose");

const thumbnailSessionSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Upload",
      required: true,
    },

    initialPrompt: {
      type: String,
      required: true,
    },

    conversations: [
      {
        role: {
          type: String,
          enum: ["user", "ai"],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        images:[String]
        ,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ThumbnailSession = mongoose.model(
  "ThumbnailSession",
  thumbnailSessionSchema
);

module.exports = ThumbnailSession;
