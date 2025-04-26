const jwt = require("jsonwebtoken");
require("dotenv").config();
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    console.log("Auth header received:", authHeader);
    if (!authHeader) {
      console.log("No Authorization header found");
      return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      console.log("No token found in Authorization header");
      return res.status(401).json({ message: "Authentication required" });
    }
    console.log("Token extracted:", token.substring(0, 20) + "...");
    console.log("Secret key:", process.env.SECRET_KEY ? "Exists" : "Missing");
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      console.log("Token decoded successfully:", decoded);
      const db = req.app.get("zensync");
      if (!db) {
        console.error("Database connection not found in app");
        return res.status(500).json({ message: "Server configuration error" });
      }
      const usersCollection = db.collection("usersCollection");
      const user = await usersCollection.findOne({
        username: decoded.username,
      });
      if (!user) {
        console.log("User not found in database:", decoded.username);
        return res
          .status(401)
          .json({ message: "Authentication failed - user not found" });
      }
      console.log("User found:", user.username);
      req.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
      };
      next();
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return res
        .status(401)
        .json({ message: "Authentication failed - invalid token" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};
