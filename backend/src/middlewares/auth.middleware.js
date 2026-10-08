const jwt = require("jsonwebtoken");
module.exports.isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      console.log("Unauthorized");
      return res.status(401).json({ msg: "Unauthorized" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    console.error("Error in auth middleware", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
};
