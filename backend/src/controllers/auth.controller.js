const authModel = require("../models/auth.model");
const jwt = require("jsonwebtoken");
const axios = require("axios");
module.exports.handelGithubInit = async (req, res) => {
  try {
    console.log("reached");
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user`;
    return res.status(200).json({ url: redirectUri });
  } catch (error) {
    console.error("error occured  in gitubinit ", error.message);
    res.status(500).json({ msg: "internal server error" });
  }
};

module.exports.handleGithubOAuthCallback = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  try {
    const tokenRes = await axios.post(
      `https://github.com/login/oauth/access_token`,
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      { headers: { Accept: "application/json" } }
    );
    const accessToken =tokenRes.data.access_token;
    console.log(accessToken, "accessToken");
    const userRes = await axios.get(`https://api.github.com/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { login, avatar_url, name } = userRes.data;
    console.log({ login, avatar_url, name });
    let user = await authModel.findOne({ gitHubId: login });
    if (!user) {
      user = await authModel.create({
        avatar_url,
        name,
        gitHubId: login,
      });
    }
    const payload = {
      _id: user._id,
      avatar_url: user.avatar_url,
      gitHubId: user.gitHubId,
      name: user.name,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.ISPRODUCTION === "true",
      sameSite: "Lax",
    });
    return res.status(200).json({ ...payload });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return res.status(500).json({ msg: "internal Server Error" });
  }
};

module.exports.handleLogout = async (req, res) => {
  try {
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return res.status(200).json({ msg: "Logout successful" });
  } catch (error) {
    console.error("error in the logout");
    return res.status(500).json({ msg: "internal Server Error" });
  }
};
