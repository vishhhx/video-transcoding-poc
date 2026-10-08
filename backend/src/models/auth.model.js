const { default: mongoose } = require("mongoose");

const authSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  gitHubId: {
    type: String,
    required: [true, "github id is required"],
  },
  avatar_url: {
    type: String,
    required: [true, "avatarUrl id is required"],
  },
});

const authModel = mongoose.model("Auth", authSchema);

module.exports = authModel;
